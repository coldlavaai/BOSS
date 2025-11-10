import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchGmailSignature, refreshGmailToken } from '@/lib/integrations/gmail'
import { fetchOutlookSignature, refreshOutlookToken } from '@/lib/integrations/outlook'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { integration_id } = body

    if (!integration_id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      )
    }

    // Get the email integration
    const { data: integration, error: integrationError } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user.id)
      .single()

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiresAt = new Date(integration.token_expires_at)
    const now = new Date()

    if (tokenExpiresAt <= now) {
      console.log('Token expired, refreshing...')

      if (integration.provider === 'gmail') {
        const tokens = await refreshGmailToken(integration.refresh_token)
        accessToken = tokens.access_token

        // Update tokens in database
        await supabase
          .from('email_integrations')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || integration.refresh_token,
            token_expires_at: new Date(tokens.expiry_date).toISOString(),
          })
          .eq('id', integration.id)
      } else if (integration.provider === 'outlook') {
        const tokens = await refreshOutlookToken(integration.refresh_token)
        accessToken = tokens.access_token

        // Update tokens in database
        await supabase
          .from('email_integrations')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || integration.refresh_token,
            token_expires_at: new Date(
              Date.now() + tokens.expires_in * 1000
            ).toISOString(),
          })
          .eq('id', integration.id)
      }
    }

    // Fetch signature from email provider
    let signature: { html: string; text: string } | null = null

    if (integration.provider === 'gmail') {
      signature = await fetchGmailSignature(accessToken)
    } else if (integration.provider === 'outlook') {
      signature = await fetchOutlookSignature(accessToken)
    } else {
      return NextResponse.json(
        { error: 'Unsupported email provider' },
        { status: 400 }
      )
    }

    if (!signature) {
      return NextResponse.json(
        {
          error: 'No signature found in email account',
          message:
            integration.provider === 'gmail'
              ? 'No signature found in your Gmail settings. Please make sure you have a signature set up in Gmail Settings → General → Signature.'
              : 'No signature found in your Outlook settings.',
        },
        { status: 404 }
      )
    }

    // Check if signature from this integration already exists
    const { data: existingSignatures } = await supabase
      .from('email_signatures')
      .select('*')
      .eq('user_id', user.id)
      .eq('integration_id', integration_id)
      .eq('source', integration.provider)

    let result

    if (existingSignatures && existingSignatures.length > 0) {
      // Update existing signature
      const { data: updatedSignature, error: updateError } = await supabase
        .from('email_signatures')
        .update({
          html_content: signature.html,
          text_content: signature.text,
        })
        .eq('id', existingSignatures[0].id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating signature:', updateError)
        return NextResponse.json(
          { error: 'Failed to update signature' },
          { status: 500 }
        )
      }

      result = updatedSignature
    } else {
      // Create new signature
      const signatureName = `${integration.provider === 'gmail' ? 'Gmail' : 'Outlook'} Signature - ${integration.email_address}`

      const { data: newSignature, error: createError } = await supabase
        .from('email_signatures')
        .insert({
          user_id: user.id,
          name: signatureName,
          html_content: signature.html,
          text_content: signature.text,
          source: integration.provider,
          integration_id: integration.id,
          is_default: false,
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating signature:', createError)
        return NextResponse.json(
          { error: 'Failed to create signature' },
          { status: 500 }
        )
      }

      result = newSignature
    }

    return NextResponse.json({
      success: true,
      signature: result,
      message: 'Signature imported successfully',
    })
  } catch (error: any) {
    console.error('Error importing signature:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import signature' },
      { status: 500 }
    )
  }
}
