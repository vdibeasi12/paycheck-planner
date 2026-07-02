// scripts/backup-storage.mjs
//
// Downloads every object in a Supabase Storage bucket to a local directory so
// it can be archived off-site. Storage objects are NOT covered by Supabase's
// daily database backups, so this closes that gap for user-uploaded documents.
//
// Requires (env):
//   SUPABASE_URL                 https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    service_role key (full read access to private buckets)
// Optional (env):
//   BUCKET                       bucket name (default: documents)
//   OUT_DIR                      local output dir (default: backup-out)
//
// Writes files under OUT_DIR/<object path> plus a manifest.json summary.
// Exits non-zero on any download failure so the CI job fails loudly.

import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.BUCKET || "documents";
const OUT_DIR = process.env.OUT_DIR || "backup-out";
const PAGE = 1000;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Recursively list every object path under a prefix. Folders come back with a
// null id and are descended into; files (non-null id) are collected.
async function listAll(prefix) {
  const files = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list(${prefix}) failed: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // Folder placeholder: recurse.
        const nested = await listAll(path);
        files.push(...nested);
      } else {
        files.push({
          path,
          size: entry.metadata?.size ?? null,
          mimetype: entry.metadata?.mimetype ?? null,
          updated_at: entry.updated_at ?? null,
        });
      }
    }

    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return files;
}

async function download(path) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw new Error(`download(${path}) failed: ${error.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  const dest = join(OUT_DIR, path);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return buf.length;
}

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`Backing up bucket "${BUCKET}" from ${SUPABASE_URL}`);
  await mkdir(OUT_DIR, { recursive: true });

  const files = await listAll("");
  console.log(`Found ${files.length} object(s).`);

  let bytes = 0;
  for (const f of files) {
    const n = await download(f.path);
    bytes += n;
    console.log(`  saved ${f.path} (${n} bytes)`);
  }

  const manifest = {
    bucket: BUCKET,
    source: SUPABASE_URL,
    generatedAt: startedAt,
    completedAt: new Date().toISOString(),
    objectCount: files.length,
    totalBytes: bytes,
    objects: files,
  };
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`Done. ${files.length} object(s), ${bytes} bytes -> ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
