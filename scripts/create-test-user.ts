import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  try {
    // Try to create a new test user
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'test@detaildynamics.uk',
      password: 'Test123!',
      email_confirm: true
    })

    if (error) {
      console.error('Error creating user:', error)
      return
    }

    console.log('✓ Test user created successfully!')
    console.log('Email: test@detaildynamics.uk')
    console.log('Password: Test123!')
    console.log('User ID:', data.user.id)
  } catch (err) {
    console.error('Failed:', err)
  }
}

createTestUser()
