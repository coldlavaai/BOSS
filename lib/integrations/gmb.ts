import { google } from 'googleapis'

export interface GmbTokens {
  access_token: string
  refresh_token?: string
  expiry_date: number
  token_type: string
}

export interface GmbLocation {
  name: string // Format: accounts/{accountId}/locations/{locationId}
  locationName: string
  primaryPhone: string
  websiteUri: string
  address: {
    addressLines: string[]
    locality: string
    administrativeArea: string
    postalCode: string
    regionCode: string
  }
}

export interface GmbReview {
  reviewId: string
  reviewer: {
    profilePhotoUrl: string
    displayName: string
    isAnonymous: boolean
  }
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
  comment: string
  createTime: string
  updateTime: string
  reviewReply?: {
    comment: string
    updateTime: string
  }
}

/**
 * Create OAuth2 client for GMB
 */
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  // Use production domain in production, local URL in development
  const baseUrl = process.env.VERCEL_ENV === 'production'
    ? 'https://detail-dynamics-crm.vercel.app'
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const redirectUri = `${baseUrl}/api/integrations/gmb/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Get GMB authorization URL
 */
export function getGmbAuthUrl(): string {
  const oauth2Client = createOAuth2Client()

  const scopes = [
    'https://www.googleapis.com/auth/business.manage', // Manage business info and reviews
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
export async function exchangeCodeForGmbTokens(code: string): Promise<GmbTokens> {
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
 * Refresh GMB access token
 */
export async function refreshGmbToken(refreshToken: string): Promise<GmbTokens> {
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
export async function getGmbUserProfile(accessToken: string) {
  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data } = await oauth2.userinfo.get()

  return data
}

/**
 * List all business accounts
 */
export async function listGmbAccounts(accessToken: string) {
  const response = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch GMB accounts')
  }

  return await response.json()
}

/**
 * List all locations for an account
 */
export async function listGmbLocations(
  accessToken: string,
  accountId: string
): Promise<GmbLocation[]> {
  const response = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,title,phoneNumbers,websiteUri,storefrontAddress`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch GMB locations')
  }

  const data = await response.json()
  return data.locations || []
}

/**
 * Fetch reviews for a location
 */
export async function fetchGmbReviews(
  accessToken: string,
  accountId: string,
  locationId: string,
  options: {
    pageSize?: number
    pageToken?: string
  } = {}
): Promise<{ reviews: GmbReview[]; nextPageToken?: string }> {
  const { pageSize = 50, pageToken } = options

  let url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=${pageSize}`
  if (pageToken) {
    url += `&pageToken=${pageToken}`
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch GMB reviews')
  }

  const data = await response.json()
  return {
    reviews: data.reviews || [],
    nextPageToken: data.nextPageToken || undefined,
  }
}

/**
 * Reply to a review
 */
export async function replyToGmbReview(
  accessToken: string,
  accountId: string,
  locationId: string,
  reviewId: string,
  replyText: string
): Promise<void> {
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: replyText,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to reply to review: ${error}`)
  }
}

/**
 * Delete a review reply
 */
export async function deleteGmbReviewReply(
  accessToken: string,
  accountId: string,
  locationId: string,
  reviewId: string
): Promise<void> {
  const response = await fetch(
    `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error('Failed to delete review reply')
  }
}

/**
 * Convert star rating enum to number
 */
export function starRatingToNumber(rating: GmbReview['starRating']): number {
  const map = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  }
  return map[rating] || 0
}
