"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Camera, Upload, Trash2, ExternalLink, Loader2, FileText } from "lucide-react";

type DocType = "bill" | "paycheck" | "receipt" | "other";

type Doc = {
  id: string;
  doc_type: DocType;
  file_path: string;
  file_name: string | null;
  amount: number | null;
  note: string | null;
  created_at: string;
};

const TYPES: { id: DocType; label: string }[] = [
  { id: "bill", label: "Bill" },
  { id: "paycheck", label: "Paycheck" },
  { id: "receipt", label: "Receipt" },
  { id: "other", label: "Other" },
];

export default function DocumentCapture() {
  const [docType, setDocType] = useState<DocType>("bill");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);

  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocs();
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadDocs() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setDocs(data as Doc[]);
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function save() {
    setError(null);
    if (!file) {
      setError("Take a photo or choose a file first.");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Please sign in to upload.");
        return;
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const up = await supabase.storage.from("documents").upload(path, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (up.error) {
        setError(up.error.message);
        return;
      }

      const ins = await supabase.from("documents").insert({
        user_id: user.id,
        doc_type: docType,
        file_path: path,
        file_name: file.name,
        amount: amount ? Number(amount) : null,
        note: note || null,
      });
      if (ins.error) {
        setError(ins.error.message);
        return;
      }

      // Reset the form on success
      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview(null);
      setAmount("");
      setNote("");
      await loadDocs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function viewDoc(doc: Doc) {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function removeDoc(doc: Doc) {
    await supabase.storage.from("documents").remove([doc.file_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    await loadDocs();
  }

  return (
    <div className="space-y-6">
      {/* Capture card */}
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
        {/* Type chips */}
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDocType(t.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                docType === t.id
                  ? "bg-emerald-500 text-white"
                  : "bg-[#1a233a] text-gray-300 hover:bg-[#1a233a]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview / dropzone */}
        <div className="mt-4 overflow-hidden rounded-xl border border-dashed border-gray-700 bg-[#0f172a]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Selected document" className="max-h-72 w-full object-contain" />
          ) : (
            <div className="flex h-40 flex-col items-center justify-center text-gray-400">
              <FileText size={28} />
              <p className="mt-2 text-sm">No image selected yet</p>
            </div>
          )}
        </div>

        {/* Capture / upload buttons */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-green-600"
          >
            <Camera size={16} /> Take photo
          </button>
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-[#1a233a]"
          >
            <Upload size={16} /> Upload file
          </button>

          {/* Hidden inputs. `capture` opens the camera on phones / Capacitor. */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            className="hidden"
          />
          <input
            ref={uploadRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={onPick}
            className="hidden"
          />
        </div>

        {/* Optional details */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium text-gray-400">Amount (optional)</span>
            <div className="mt-1 flex items-center rounded-lg border border-gray-700 px-3">
              <span className="text-gray-400">$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-transparent py-2 pl-1 text-sm outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-400">Note (optional)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. March electric bill"
              className="mt-1 w-full rounded-lg border border-gray-700 px-3 py-2 text-sm outline-none"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          {busy ? "Saving…" : "Save document"}
        </button>
      </div>

      {/* Recent uploads */}
      <div className="rounded-2xl border border-gray-700 bg-[#0f172a] p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-white">Recent uploads</h2>
        {docs.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            Nothing yet. Snap your first bill or paycheck above.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    <span className="mr-2 rounded-full bg-[#1a233a] px-2 py-0.5 text-xs capitalize text-gray-300">
                      {doc.doc_type}
                    </span>
                    {doc.file_name || "Untitled"}
                    {doc.amount != null ? ` · $${Number(doc.amount).toFixed(2)}` : ""}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                    {doc.note ? ` · ${doc.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => viewDoc(doc)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-[#1a233a]"
                    aria-label="View"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDoc(doc)}
                    className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
