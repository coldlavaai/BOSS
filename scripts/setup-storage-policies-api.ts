import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function setupPolicies() {
  console.log('Setting up storage policies via API...\n')

  // Make direct API calls to Supabase Management API
  const policies = [
    {
      name: 'Users can upload files to their own folder',
      definition: `(bucket_id = 'customer-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      command: 'INSERT',
    },
    {
      name: 'Users can read their own files',
      definition: `(bucket_id = 'customer-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      command: 'SELECT',
    },
    {
      name: 'Users can update their own files',
      definition: `(bucket_id = 'customer-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      command: 'UPDATE',
    },
    {
      name: 'Users can delete their own files',
      definition: `(bucket_id = 'customer-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)`,
      command: 'DELETE',
    },
  ]

  for (const policy of policies) {
    console.log(`Setting up policy: ${policy.name}`)

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_storage_policy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          bucket_name: 'customer-files',
          policy_name: policy.name,
          definition: policy.definition,
          command: policy.command,
        }),
      })

      if (response.ok) {
        console.log(`✅ ${policy.name} created\n`)
      } else {
        const error = await response.text()
        console.log(`Note: ${error}\n`)
      }
    } catch (error: any) {
      console.log(`Note: ${error.message}\n`)
    }
  }

  console.log('Setup complete!')
  console.log('\nIf the above method didn\'t work, please go to:')
  console.log('https://supabase.com/dashboard/project/adxoysrelcqvzzrqmulv/storage/policies')
  console.log('\nAnd manually add these policies to the "customer-files" bucket:')
  console.log('\n1. INSERT policy: (bucket_id = \'customer-files\') AND ((storage.foldername(name))[1] = (auth.uid())::text)')
  console.log('2. SELECT policy: (bucket_id = \'customer-files\') AND ((storage.foldername(name))[1] = (auth.uid())::text)')
  console.log('3. UPDATE policy: (bucket_id = \'customer-files\') AND ((storage.foldername(name))[1] = (auth.uid())::text)')
  console.log('4. DELETE policy: (bucket_id = \'customer-files\') AND ((storage.foldername(name))[1] = (auth.uid())::text)')
}

setupPolicies()
