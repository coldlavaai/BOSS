import { google } from 'googleapis'

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing Google OAuth configuration. Check environment variables.')
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  )

  return oauth2Client
}

export function getAuthorizationUrl(state?: string) {
  const oauth2Client = getGoogleOAuthClient()

  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ]

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
    state: state || '',
  })

  return url
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = getGoogleOAuthClient()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = getGoogleOAuthClient()
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  })

  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

export function getCalendarClient(accessToken: string) {
  const oauth2Client = getGoogleOAuthClient()
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function getUserEmail(accessToken: string) {
  const oauth2Client = getGoogleOAuthClient()
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()
  return data.email
}

// Calendar Event Management Functions

interface JobEventData {
  title: string
  description?: string
  startDate: string
  endDate?: string
  location?: string
  customerName?: string
  carDetails?: string
}

export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  jobData: JobEventData
) {
  const calendar = getCalendarClient(accessToken)

  // Format the event
  const event = {
    summary: jobData.title,
    description: [
      jobData.description,
      jobData.customerName ? `Customer: ${jobData.customerName}` : null,
      jobData.carDetails ? `Car: ${jobData.carDetails}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    location: jobData.location,
    start: {
      dateTime: jobData.startDate,
      timeZone: 'Europe/London',
    },
    end: {
      dateTime: jobData.endDate || jobData.startDate,
      timeZone: 'Europe/London',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  }

  const response = await calendar.events.insert({
    calendarId: calendarId,
    requestBody: event,
  })

  return response.data
}

export async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  jobData: JobEventData
) {
  const calendar = getCalendarClient(accessToken)

  const event = {
    summary: jobData.title,
    description: [
      jobData.description,
      jobData.customerName ? `Customer: ${jobData.customerName}` : null,
      jobData.carDetails ? `Car: ${jobData.carDetails}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    location: jobData.location,
    start: {
      dateTime: jobData.startDate,
      timeZone: 'Europe/London',
    },
    end: {
      dateTime: jobData.endDate || jobData.startDate,
      timeZone: 'Europe/London',
    },
  }

  const response = await calendar.events.update({
    calendarId: calendarId,
    eventId: eventId,
    requestBody: event,
  })

  return response.data
}

export async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  const calendar = getCalendarClient(accessToken)

  await calendar.events.delete({
    calendarId: calendarId,
    eventId: eventId,
  })

  return true
}

export async function listCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const calendar = getCalendarClient(accessToken)

  const response = await calendar.events.list({
    calendarId: calendarId,
    timeMin: timeMin,
    timeMax: timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return response.data.items || []
}

export async function listCalendars(accessToken: string) {
  const calendar = getCalendarClient(accessToken)

  const response = await calendar.calendarList.list()

  return response.data.items || []
}

// Webhook (Push Notification) Management

export async function startWatchChannel(
  accessToken: string,
  calendarId: string,
  webhookUrl: string
) {
  const calendar = getCalendarClient(accessToken)

  // Generate a unique channel ID
  const channelId = `channel-${Date.now()}-${Math.random().toString(36).substring(7)}`

  const response = await calendar.events.watch({
    calendarId: calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      // Channels expire after ~7 days (max allowed by Google)
      expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return {
    channelId: response.data.id!,
    resourceId: response.data.resourceId!,
    expiration: response.data.expiration ? new Date(parseInt(response.data.expiration)) : null,
  }
}

export async function stopWatchChannel(
  accessToken: string,
  channelId: string,
  resourceId: string
) {
  const oauth2Client = getGoogleOAuthClient()
  oauth2Client.setCredentials({
    access_token: accessToken,
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  await calendar.channels.stop({
    requestBody: {
      id: channelId,
      resourceId: resourceId,
    },
  })

  return true
}
