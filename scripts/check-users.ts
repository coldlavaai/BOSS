import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkUsers() {
  try {
    const { data, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('Error:', error)
      return
    }

    console.log('Users in database:')
    data.users.forEach(user => {
      console.log(`- Email: ${user.email}, ID: ${user.id}, Created: ${user.created_at}`)
    })
  } catch (err) {
    console.error('Failed:', err)
  }
}

checkUsers()
