import { google } from 'googleapis'

export interface GmailTokens {
  access_token: string
  refresh_token?: string
  expiry_date: number
  token_type: string
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string; size: number }
    parts?: any[]
  }
  internalDate: string
  historyId?: string
}

/**
 * Create OAuth2 client
 */
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  // Use production domain in production, local URL in development
  const baseUrl = process.env.VERCEL_ENV === 'production'
    ? 'https://detail-dynamics-crm.vercel.app'
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const redirectUri = `${baseUrl}/api/integrations/gmail/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Get Gmail authorization URL
 */
export function getGmailAuthUrl(): string {
  const oauth2Client = createOAuth2Client()

  const scopes = [
    'https://www.googleapis.com/auth/gmail.readonly', // Read emails
    'https://www.googleapis.com/auth/gmail.send', // Send emails
    'https://www.googleapis.com/auth/gmail.modify', // Modify emails (mark as read, etc.)
    'https://www.googleapis.com/auth/gmail.settings.basic', // Read settings (for signatures)
    'https://www.googleapis.com/auth/userinfo.email', // Get user email
    'https://www.googleapis.com/auth/userinfo.profile', // Get user profile
  ]

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Request refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForGmailTokens(code: string): Promise<GmailTokens> {
  const oauth2Client = createOAuth2Client()

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token) {
    throw new Error('No access token received')
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || undefined,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    token_type: tokens.token_type || 'Bearer',
  }
}

/**
 * Refresh Gmail access token
 */
export async function refreshGmailToken(refreshToken: string): Promise<GmailTokens> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('No access token received')
  }

  return {
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token || refreshToken || undefined,
    expiry_date: credentials.expiry_date || Date.now() + 3600 * 1000,
    token_type: credentials.token_type || 'Bearer',
  }
}

/**
 * Get user profile
 */
export async function getGmailUserProfile(accessToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  return data
}

/**
 * Fetch messages from Gmail
 */
export async function fetchGmailMessages(
  accessToken: string,
  options: {
    maxResults?: number
    pageToken?: string
    q?: string // Search query
    labelIds?: string[]
  } = {}
): Promise<{ messages: GmailMessage[]; nextPageToken?: string }> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const { maxResults = 50, pageToken, q, labelIds } = options

  const response = await gmail.users.messages.list({
    userId: 'me',
    maxResults,
    pageToken,
    q,
    labelIds,
  })

  const messageIds = response.data.messages || []

  // Fetch full message details
  const messages = await Promise.all(
    messageIds.map(async (msg) => {
      const { data } = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })
      return data as GmailMessage
    })
  )

  return {
    messages,
    nextPageToken: response.data.nextPageToken || undefined,
  }
}

/**
 * Fetch a single message
 */
export async function fetchGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const { data } = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  return data as GmailMessage
}

/**
 * Send email via Gmail
 */
export async function sendGmailEmail(
  accessToken: string,
  email: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    bodyType?: 'text' | 'html'
    attachments?: Array<{
      filename: string
      content: string // base64 encoded
      mimeType: string
    }>
  }
): Promise<void> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  let messageParts: string

  if (email.attachments && email.attachments.length > 0) {
    // Create multipart message with attachments
    const boundary = '----=_Part_' + Date.now()

    const headers = [
      `To: ${email.to.join(', ')}`,
      email.cc && email.cc.length > 0 ? `Cc: ${email.cc.join(', ')}` : null,
      email.bcc && email.bcc.length > 0 ? `Bcc: ${email.bcc.join(', ')}` : null,
      `Subject: ${email.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ].filter(Boolean)

    const bodyParts = [
      ...headers,
      '',
      `--${boundary}`,
      email.bodyType === 'html'
        ? 'Content-Type: text/html; charset=utf-8'
        : 'Content-Type: text/plain; charset=utf-8',
      '',
      email.body,
      '',
    ]

    // Add attachments
    for (const attachment of email.attachments) {
      bodyParts.push(
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType}`,
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        `Content-Transfer-Encoding: base64`,
        '',
        attachment.content,
        ''
      )
    }

    bodyParts.push(`--${boundary}--`)
    messageParts = bodyParts.join('\n')
  } else {
    // Simple message without attachments
    const headers = [
      `To: ${email.to.join(', ')}`,
      email.cc && email.cc.length > 0 ? `Cc: ${email.cc.join(', ')}` : null,
      email.bcc && email.bcc.length > 0 ? `Bcc: ${email.bcc.join(', ')}` : null,
      `Subject: ${email.subject}`,
      email.bodyType === 'html'
        ? 'Content-Type: text/html; charset=utf-8'
        : 'Content-Type: text/plain; charset=utf-8',
    ].filter(Boolean)

    messageParts = [...headers, '', email.body].join('\n')
  }

  const encodedMessage = Buffer.from(messageParts)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  })
}

/**
 * Mark message as read
 */
export async function markGmailMessageAsRead(
  accessToken: string,
  messageId: string,
  isRead: boolean = true
): Promise<void> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  if (isRead) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    })
  } else {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: ['UNREAD'],
      },
    })
  }
}

/**
 * Parse email headers from Gmail message
 */
export function parseGmailHeaders(message: GmailMessage) {
  const headers = message.payload.headers || []

  const getHeader = (name: string) => {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
    return header?.value || ''
  }

  return {
    from: getHeader('From'),
    to: getHeader('To'),
    cc: getHeader('Cc'),
    bcc: getHeader('Bcc'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    messageId: getHeader('Message-ID'),
  }
}

/**
 * Extract email body from Gmail message
 */
export function extractGmailBody(message: GmailMessage): { text: string; html: string } {
  let text = ''
  let html = ''

  function processPayload(payload: any) {
    if (payload.body && payload.body.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8')

      if (payload.mimeType === 'text/plain') {
        text = decoded
      } else if (payload.mimeType === 'text/html') {
        html = decoded
      }
    }

    if (payload.parts) {
      payload.parts.forEach(processPayload)
    }
  }

  processPayload(message.payload)

  return { text, html }
}

/**
 * Set up Gmail push notifications (watch)
 */
export async function setupGmailWatch(
  accessToken: string,
  topicName: string
): Promise<{ historyId: string; expiration: string }> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
    },
  })

  return {
    historyId: response.data.historyId || '',
    expiration: response.data.expiration || '',
  }
}

/**
 * Stop Gmail push notifications
 */
export async function stopGmailWatch(accessToken: string): Promise<void> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  await gmail.users.stop({
    userId: 'me',
  })
}

/**
 * Fetch email signature from Gmail settings
 * Gmail signatures are stored in the SendAs settings
 */
export async function fetchGmailSignature(accessToken: string): Promise<{
  html: string
  text: string
} | null> {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  try {
    // First, get the user's email address
    const { data: profile } = await gmail.users.getProfile({ userId: 'me' })
    const emailAddress = profile.emailAddress

    if (!emailAddress) {
      console.error('Could not get user email address')
      return null
    }

    // Get SendAs settings which contain the signature
    const { data: sendAs } = await gmail.users.settings.sendAs.get({
      userId: 'me',
      sendAsEmail: emailAddress,
    })

    const signature = sendAs.signature

    if (!signature) {
      console.log('No signature found in Gmail settings')
      return null
    }

    // Gmail stores signatures as HTML
    // Create plain text version by stripping HTML tags
    const textSignature = signature.replace(/<[^>]*>/g, '').trim()

    return {
      html: signature,
      text: textSignature,
    }
  } catch (error: any) {
    console.error('Error fetching Gmail signature:', error)

    // If the sendAs endpoint fails, try the fallback method
    try {
      console.log('Trying fallback method: extracting from sent messages...')

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
        labelIds: ['SENT'],
      })

      if (!response.data.messages || response.data.messages.length === 0) {
        console.log('No sent messages found')
        return null
      }

      // Get the first sent message
      const messageId = response.data.messages[0].id!
      const { data: message } = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      })

      const body = extractGmailBody(message as GmailMessage)

      // Try to extract signature from the email body
      const extractSignature = (content: string): string => {
        // Look for gmail_signature div
        const gmailSigRegex = /<div[^>]*class="gmail_signature"[^>]*>([\s\S]*?)<\/div>/i
        const match = content.match(gmailSigRegex)

        if (match) {
          return match[0] // Return the full div including the wrapper
        }

        // Fallback: look for signature separators
        const separators = [
          '\n-- \n',
          '\n--\n',
          '<br>--<br>',
          '<div>--</div>',
        ]

        for (const sep of separators) {
          const index = content.indexOf(sep)
          if (index !== -1) {
            return content.substring(index + sep.length)
          }
        }

        return ''
      }

      const htmlSignature = body.html ? extractSignature(body.html) : ''
      const textSignature = body.text ? extractSignature(body.text) : ''

      if (!htmlSignature && !textSignature) {
        console.log('No signature found in sent messages')
        return null
      }

      return {
        html: htmlSignature,
        text: textSignature,
      }
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError)
      return null
    }
  }
}
