import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addGmailWatchColumns() {
  console.log('Adding Gmail watch columns to email_integrations table...')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE email_integrations
      ADD COLUMN IF NOT EXISTS watch_history_id TEXT,
      ADD COLUMN IF NOT EXISTS watch_expiration TIMESTAMP WITH TIME ZONE;
    `
  })

  if (error) {
    console.error('Error adding columns:', error)
    process.exit(1)
  }

  console.log('Successfully added watch_history_id and watch_expiration columns')
}

addGmailWatchColumns()
