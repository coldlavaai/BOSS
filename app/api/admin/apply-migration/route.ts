import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📦 Reading email automation migration...')

    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '20250105_email_automation_system.sql'
    )

    const sql = fs.readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Applying migration...')

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results: Array<{ statement: string; success: boolean; error?: string }> = []

    for (const statement of statements) {
      if (!statement) continue

      try {
        // Execute each statement
        const { error } = await supabase.rpc('exec', { query: statement + ';' })

        if (error) {
          // Check if it's an "already exists" error
          if (
            error.message?.includes('already exists') ||
            error.message?.includes('duplicate')
          ) {
            console.log(`⚠️  Skipping (already exists): ${statement.substring(0, 50)}...`)
            results.push({
              statement: statement.substring(0, 100),
              success: true,
              error: 'Already exists (skipped)',
            })
          } else {
            console.error(`❌ Error:`, error.message)
            results.push({
              statement: statement.substring(0, 100),
              success: false,
              error: error.message,
            })
          }
        } else {
          console.log(`✅ Success: ${statement.substring(0, 50)}...`)
          results.push({
            statement: statement.substring(0, 100),
            success: true,
          })
        }
      } catch (err: any) {
        console.error(`❌ Error executing statement:`, err.message)
        results.push({
          statement: statement.substring(0, 100),
          success: false,
          error: err.message,
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    console.log(`✅ Migration complete: ${successCount} successful, ${errorCount} failed`)

    return NextResponse.json({
      success: true,
      message: `Migration applied: ${successCount} statements successful, ${errorCount} failed`,
      results,
    })
  } catch (error: any) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to apply migration' },
      { status: 500 }
    )
  }
}
