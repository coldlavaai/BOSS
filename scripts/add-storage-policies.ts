import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addPolicies() {
  console.log('Adding storage policies...\n')

  const queries = [
    `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Users can upload files to their own folder" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Users can read their own files" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;`,
    `DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;`,
    `CREATE POLICY "Users can upload files to their own folder"
     ON storage.objects FOR INSERT TO authenticated
     WITH CHECK (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);`,
    `CREATE POLICY "Users can read their own files"
     ON storage.objects FOR SELECT TO authenticated
     USING (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);`,
    `CREATE POLICY "Users can update their own files"
     ON storage.objects FOR UPDATE TO authenticated
     USING (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);`,
    `CREATE POLICY "Users can delete their own files"
     ON storage.objects FOR DELETE TO authenticated
     USING (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);`,
  ]

  for (const query of queries) {
    console.log('Executing:', query.substring(0, 80) + '...')

    const { data, error } = await supabase.rpc('exec_sql', { query })

    if (error) {
      console.error('Error:', error)
    } else {
      console.log('✅ Success')
    }
  }
}

addPolicies()
