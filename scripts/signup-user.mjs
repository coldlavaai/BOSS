// Sign up user in Supabase
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔐 Signing up user in Supabase...\n')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Sign up user
const { data, error } = await supabase.auth.signUp({
  email: 'oliver@coldlava.ai',
  password: 'admin123',
  options: {
    data: {
      first_name: 'Oliver',
      full_name: 'Oliver Tatler'
    }
  }
})

if (error) {
  console.error('❌ Error signing up:', error.message)
  process.exit(1)
}

console.log('✅ User signed up successfully!')
console.log('\nUser Details:')
console.log('  Email:', data.user.email)
console.log('  ID:', data.user.id)

if (data.user.confirmed_at) {
  console.log('  Status: Confirmed ✓')
} else {
  console.log('  Status: ⚠️  Check email for confirmation link')
  console.log('\n📧 Check your email (oliver@coldlava.ai) for confirmation link')
  console.log('   OR go to Supabase dashboard to manually confirm')
}

console.log('\n📋 Login Credentials:')
console.log('  Email: oliver@coldlava.ai')
console.log('  Password: admin123')
console.log('\n🌐 Login at: http://localhost:3006/login')
