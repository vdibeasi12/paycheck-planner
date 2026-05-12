const replace = require('replace-in-file');

async function run() {
  try {
    // Replace bad imports
    await replace({
      files: 'app/**/*.{ts,tsx}',
      from: /import\s+\{\s*createClient\s*\}\s+from\s+['"]@supabase\/supabase-js['"]/g,
      to: "import { supabase } from '@/lib/supabaseClient'",
    });

    // Remove createClient initialization blocks
    await replace({
      files: 'app/**/*.{ts,tsx}',
      from: /const\s+supabase\s*=\s*createClient\([\s\S]*?\)/g,
      to: "// removed duplicate supabase client",
    });

    console.log('✅ Supabase cleanup complete');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

run();