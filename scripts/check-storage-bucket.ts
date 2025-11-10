import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStorage() {
  console.log('Checking storage buckets...')

  // List all buckets
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError)
    return
  }

  console.log('\nAll buckets:')
  console.log(JSON.stringify(buckets, null, 2))

  // Check if customer-files bucket exists
  const customerFilesBucket = buckets?.find(b => b.name === 'customer-files')

  if (!customerFilesBucket) {
    console.log('\n❌ customer-files bucket does NOT exist!')
    console.log('\nCreating customer-files bucket...')

    const { data: newBucket, error: createError } = await supabase.storage.createBucket('customer-files', {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    })

    if (createError) {
      console.error('Error creating bucket:', createError)
    } else {
      console.log('✅ Created customer-files bucket:', newBucket)
    }
  } else {
    console.log('\n✅ customer-files bucket exists')
    console.log('Bucket details:', JSON.stringify(customerFilesBucket, null, 2))
  }
}

checkStorage()
