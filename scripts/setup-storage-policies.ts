import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupPolicies() {
  console.log('Setting up storage policies for customer-files bucket...\n')

  // Execute raw SQL to check and create policies
  const policies = [
    {
      name: 'Users can upload files to their own folder',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can upload files to their own folder"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);
      `
    },
    {
      name: 'Users can read their own files',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can read their own files"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);
      `
    },
    {
      name: 'Users can update their own files',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can update their own files"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);
      `
    },
    {
      name: 'Users can delete their own files',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can delete their own files"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'customer-files' AND (storage.foldername(name))[1] = auth.uid()::text);
      `
    }
  ]

  for (const policy of policies) {
    console.log(`Creating policy: ${policy.name}`)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: policy.sql })

    if (error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.log('✅ Success\n')
    }
  }

  // Check existing policies
  console.log('\nChecking existing policies on storage.objects...')
  const { data: existingPolicies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'objects')

  if (policiesError) {
    console.error('Error fetching policies:', policiesError)
  } else {
    console.log('\nExisting policies:')
    console.log(JSON.stringify(existingPolicies, null, 2))
  }
}

setupPolicies()
