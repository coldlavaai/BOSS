// Create user in Supabase
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔐 Creating user in Supabase...\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'oliver@coldlava.ai',
  password: 'admin123',
  email_confirm: true,
  user_metadata: {
    first_name: 'Oliver',
    full_name: 'Oliver Tatler'
  }
})

if (error) {
  console.error('❌ Error creating user:', error.message)
  process.exit(1)
}

console.log('✅ User created successfully!')
console.log('\nUser Details:')
console.log('  Email:', data.user.email)
console.log('  ID:', data.user.id)
console.log('  Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No')
console.log('\n📋 Login Credentials:')
console.log('  Email: oliver@coldlava.ai')
console.log('  Password: admin123')
console.log('\n🌐 Login at: http://localhost:3006/login')
