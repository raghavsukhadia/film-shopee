/**
 * WhatsApp API Proxy Route
 * Proxies WhatsApp messages to avoid CORS issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Add GET handler for testing if route is accessible
export async function GET() {
  return NextResponse.json({ message: 'WhatsApp API route is working', status: 'ok' })
}

export async function POST(request: NextRequest) {
  console.log('[WhatsApp API] Route handler called')
  
  try {
    const supabase = createClient()
    
    // Verify user is authenticated and is admin (optional check - can be disabled for internal use)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // Only check admin role if profile exists, otherwise allow (for testing)
        if (profile && profile.role !== 'admin') {
          console.log('[WhatsApp API] Non-admin user attempted access')
          return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
        }
      }
    } catch (authError) {
      // If auth check fails, continue anyway (for testing purposes)
      console.warn('[WhatsApp API] Auth check failed, continuing:', authError)
    }

    // Get request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[WhatsApp API] Failed to parse request body:', parseError)
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { provider, config, to, message, attachment } = body

    console.log('[WhatsApp API] Request received:', { provider, to, hasConfig: !!config, hasMessage: !!message, hasAttachment: !!attachment })

    if (!provider || !config || !to || !message) {
      console.error('[WhatsApp API] Missing required fields:', { provider, hasConfig: !!config, to, hasMessage: !!message })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Handle different providers
    switch (provider) {
      case 'messageautosender':
        return await sendViaMessageAutoSender(config, to, message, attachment)
      
      case 'twilio':
        return await sendViaTwilio(config, to, message, attachment)
      
      case 'cloud-api':
        return await sendViaCloudAPI(config, to, message, attachment)
      
      case 'custom':
        return await sendViaCustom(config, to, message, attachment)
      
      default:
        return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[WhatsApp API] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

/**
 * Validate MessageAutoSender configuration
 */
function validateMessageAutoSenderConfig(config: any): { valid: boolean; error?: string } {
  if (!config) {
    return { valid: false, error: 'Configuration is missing' }
  }

  const missing = []
  if (!config.apiKey) missing.push('API Key')
  if (!config.userId) missing.push('User ID')
  if (!config.password) missing.push('Password')

  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `MessageAutoSender configuration is incomplete. Missing: ${missing.join(', ')}` 
    }
  }

  // Validate that credentials are not empty strings
  if (typeof config.apiKey === 'string' && config.apiKey.trim() === '') {
    return { valid: false, error: 'API Key cannot be empty' }
  }
  if (typeof config.userId === 'string' && config.userId.trim() === '') {
    return { valid: false, error: 'User ID cannot be empty' }
  }
  if (typeof config.password === 'string' && config.password.trim() === '') {
    return { valid: false, error: 'Password cannot be empty' }
  }

  return { valid: true }
}

async function sendViaMessageAutoSender(config: any, to: string, message: string, attachment?: any) {
  // Validate configuration
  const validation = validateMessageAutoSenderConfig(config)
  if (!validation.valid) {
    return NextResponse.json({ 
      success: false,
      error: validation.error || 'Invalid configuration'
    }, { status: 400 })
  }

  console.log('[WhatsApp API] MessageAutoSender config validation passed')

  try {
    // First, send the text message
    const textMessageResult = await sendTextMessage(config, to, message)
    
    // If attachment is provided, send it as a document
    if (attachment && attachment.type === 'document' && attachment.data) {
      // Send document separately
      // Note: MessageAutoSender may require different API endpoint for documents
      // For now, we'll try to send it using the same endpoint with document format
      try {
        const docResult = await sendDocumentMessage(config, to, attachment)
        if (!docResult.success) {
          console.warn('[WhatsApp API] Document send failed, but text message was sent:', docResult.error)
        }
      } catch (docError: any) {
        console.warn('[WhatsApp API] Error sending document:', docError.message)
        // Don't fail the whole request if document fails
      }
    }
    
    return textMessageResult
  } catch (error: any) {
    console.error('[WhatsApp API] MessageAutoSender error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Failed to connect to MessageAutoSender API' }, { status: 500 })
  }
}

async function sendTextMessage(config: any, to: string, message: string) {
  // Normalize phone number
  let phoneNumber = to.replace(/[^\d+]/g, '')
  if (phoneNumber.startsWith('+')) {
    phoneNumber = phoneNumber.substring(1)
  }
  
  // If it's exactly 10 digits, assume it's Indian and add 91
  if (/^\d{10}$/.test(phoneNumber)) {
    phoneNumber = '91' + phoneNumber
  }
  
  // If it's 11 digits and starts with 0, remove 0 and add 91
  if (/^0\d{10}$/.test(phoneNumber)) {
    phoneNumber = '91' + phoneNumber.substring(1)
  }

  // Construct API URL - MessageAutoSender uses /api/v1/message/create
  let apiUrl = config.webhookUrl || 'https://app.messageautosender.com/api/v1/message/create'
    
    // If webhookUrl is provided, check if it already includes the path
    if (config.webhookUrl) {
      // If it's just the base URL, append the API path
      if (!config.webhookUrl.match(/\/api\/v1\/message\/create(\/)?$/i)) {
        const baseUrl = config.webhookUrl.replace(/\/$/, '')
        apiUrl = `${baseUrl}/api/v1/message/create`
      } else {
        apiUrl = config.webhookUrl
      }
    }
    
    console.log('[WhatsApp API] Using API URL:', apiUrl)

    console.log('[WhatsApp API] Sending via MessageAutoSender to:', phoneNumber, 'API URL:', apiUrl)

    // Try multiple authentication methods based on MessageAutoSender API documentation
    // According to OpenAPI spec, authentication can be:
    // 1. Basic-Authorization (username:password in Base64)
    // 2. API-key-in-header (x-api-key header)
    // 3. API-key-in-query-parameter (api_key query param)
    
    // Request body format:
    // receiverMobileNo: string (can be single number or comma-separated, with or without +)
    // message: array of strings

    // Method 1: API key in header (x-api-key) - preferred method
    console.log('[WhatsApp API] Trying Method 1: x-api-key header')
    let attempt1 = await trySendMessage(apiUrl, phoneNumber, message, config, {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
    }, {
      receiverMobileNo: `+${phoneNumber}`, // MessageAutoSender expects + prefix
      message: [message], // Must be an array
    })

    if (attempt1.success || (attempt1.status !== 401 && attempt1.status !== 404)) {
      return attempt1.response
    }

    console.log(`[WhatsApp API] Method 1 (x-api-key header) failed with ${attempt1.status}, trying Method 2 (Basic Auth)`)

    // Method 2: Basic Authorization (userId:password)
    const basicAuth = Buffer.from(`${config.userId}:${config.password}`).toString('base64')
    let attempt2 = await trySendMessage(apiUrl, phoneNumber, message, config, {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    }, {
      receiverMobileNo: `+${phoneNumber}`,
      message: [message],
    })

    if (attempt2.success || (attempt2.status !== 401 && attempt2.status !== 404)) {
      return attempt2.response
    }

    console.log(`[WhatsApp API] Method 2 (Basic Auth) failed with ${attempt2.status}, trying Method 3 (API key in query parameter)`)

    // Method 3: API key in query parameter
    const urlWithQuery = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}api_key=${encodeURIComponent(config.apiKey)}`
    let attempt3 = await trySendMessage(urlWithQuery, phoneNumber, message, config, {
      'Content-Type': 'application/json',
    }, {
      receiverMobileNo: `+${phoneNumber}`,
      message: [message],
    })

    if (attempt3.success || (attempt3.status !== 401 && attempt3.status !== 404)) {
      return attempt3.response
    }

    console.log(`[WhatsApp API] Method 3 (API key in query) failed with ${attempt3.status}, trying Method 4 (username/password in body - deprecated)`)

    // Method 4: Username/password in body (deprecated but might work)
    let attempt4 = await trySendMessage(apiUrl, phoneNumber, message, config, {
      'Content-Type': 'application/json',
    }, {
      username: config.userId,
      password: config.password,
      receiverMobileNo: `+${phoneNumber}`,
      message: [message],
    })

    if (attempt4.success) {
      return attempt4.response
    }

    // If all methods failed, return detailed error
    const errorDetails = {
      method1: attempt1.status,
      method2: attempt2.status,
      method3: attempt3.status,
      method4: attempt4.status,
    }
    
    console.error('[WhatsApp API] All authentication methods failed:', errorDetails)
    
    return NextResponse.json({ 
      success: false, 
      error: 'Authentication failed with all methods. Please verify your API Key, User ID, and Password are correct. Check MessageAutoSender documentation for the correct authentication format.',
      details: {
        message: 'All 4 authentication methods (x-api-key header, Basic Auth, API key query param, username/password in body) failed.',
        suggestion: 'Please verify: 1) API Key is correct, 2) User ID matches your MessageAutoSender account, 3) Password is correct, 4) Your account is active and has credits.',
        apiUrl: apiUrl
      }
    }, { status: 401 })
}

async function sendDocumentMessage(config: any, to: string, attachment: any) {
  // Normalize phone number
  let phoneNumber = to.replace(/[^\d+]/g, '')
  if (phoneNumber.startsWith('+')) {
    phoneNumber = phoneNumber.substring(1)
  }
  
  if (/^\d{10}$/.test(phoneNumber)) {
    phoneNumber = '91' + phoneNumber
  }
  
  if (/^0\d{10}$/.test(phoneNumber)) {
    phoneNumber = '91' + phoneNumber.substring(1)
  }

  // Try to send document via MessageAutoSender
  // Note: MessageAutoSender API may require different endpoint or format for documents
  // For now, we'll try sending the base64 data in JSON format
  const apiUrl = config.webhookUrl?.replace('/message/create', '/document/send') || 
                 config.webhookUrl?.replace('/api/whatsapp/send', '/api/v1/document/send') ||
                 'https://app.messageautosender.com/api/v1/document/send'

  try {
    // Convert base64 to buffer if needed
    const fileDataBase64 = typeof attachment.data === 'string' 
      ? attachment.data
      : attachment.data.toString('base64')

    // Try sending as JSON with base64 data
    const payload = {
      receiverMobileNo: `+${phoneNumber}`,
      filename: attachment.filename,
      fileData: fileDataBase64,
      mimeType: attachment.mimeType || 'application/pdf',
      caption: 'Daily Vehicle Report PDF'
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      return { success: true }
    } else {
      const errorText = await response.text()
      console.warn('[WhatsApp API] Document send failed:', errorText)
      // Document sending may not be supported - this is okay, text message was sent
      return { success: false, error: 'Document send not supported by API' }
    }
  } catch (error: any) {
    console.warn('[WhatsApp API] Document send error:', error.message)
    // Don't fail - text message was already sent
    return { success: false, error: error.message }
  }
}

async function trySendMessage(
  apiUrl: string, 
  phoneNumber: string, 
  message: string, 
  config: any, 
  headers: Record<string, string>,
  payload: Record<string, any>
): Promise<{ response: NextResponse, success: boolean, status: number, error?: string }> {
  try {
    console.log('[WhatsApp API] Trying with headers:', Object.keys(headers))
    console.log('[WhatsApp API] Payload (sanitized):', { 
      receiverMobileNo: payload.receiverMobileNo, 
      messageLength: payload.message?.[0]?.length || 0,
      hasUsername: !!payload.username,
      hasPassword: !!payload.password
    })
    
    const fetchResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    })

    const responseText = await fetchResponse.text()
    console.log('[WhatsApp API] Response status:', fetchResponse.status)
    console.log('[WhatsApp API] Response body:', responseText.substring(0, 500)) // Limit log size

    if (!fetchResponse.ok) {
      let errorData
      let errorMessage = 'Failed to send message'
      
      try {
        errorData = JSON.parse(responseText)
        errorMessage = errorData.message || errorData.error || errorData.detail || responseText || errorMessage
      } catch {
        errorMessage = responseText || `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`
      }
      
      // Provide more specific error messages
      if (fetchResponse.status === 401 || fetchResponse.status === 403) {
        errorMessage = `Authentication failed: ${errorMessage}. Please check your API Key, User ID, and Password.`
      } else if (fetchResponse.status === 400) {
        errorMessage = `Invalid request: ${errorMessage}. Please check the phone number format and message content.`
      } else if (fetchResponse.status === 404) {
        errorMessage = `API endpoint not found: ${errorMessage}. Please verify the webhook URL is correct.`
      }
      
      console.error('[WhatsApp API] Request failed:', {
        status: fetchResponse.status,
        error: errorMessage,
        url: apiUrl
      })
      
      return {
        response: NextResponse.json({ 
          success: false, 
          error: errorMessage
        }, { status: fetchResponse.status }),
        success: false,
        status: fetchResponse.status,
        error: errorMessage
      }
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch {
      // If response is not JSON but status is OK, assume success
      return {
        response: NextResponse.json({ success: true }),
        success: true,
        status: fetchResponse.status
      }
    }
    
    if (result.success === false || result.error || result.status === 'error') {
      return {
        response: NextResponse.json({ 
          success: false,
          error: result.error || result.message || 'Failed to send message' 
        }, { status: 400 }),
        success: false,
        status: fetchResponse.status
      }
    }

    return {
      response: NextResponse.json({ success: true }),
      success: true,
      status: fetchResponse.status
    }
  } catch (error: any) {
    return {
      response: NextResponse.json({ 
        success: false, 
        error: error.message || 'Request failed' 
      }, { status: 500 }),
      success: false,
      status: 500
    }
  }
}

async function sendViaTwilio(config: any, to: string, message: string) {
  if (!config.accountSid || !config.authToken || !config.fromNumber) {
    return NextResponse.json({ error: 'Twilio configuration is incomplete' }, { status: 400 })
  }

  try {
    const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`

    const formData = new URLSearchParams()
    formData.append('From', `whatsapp:${config.fromNumber}`)
    formData.append('To', `whatsapp:${to}`)
    formData.append('Body', message)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ success: false, error: errorData.message || 'Failed to send message' }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function sendViaCloudAPI(config: any, to: string, message: string) {
  if (!config.businessAccountId || !config.accessToken || !config.fromNumber) {
    return NextResponse.json({ error: 'WhatsApp Cloud API configuration is incomplete' }, { status: 400 })
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${config.businessAccountId}/messages`

    const payload = {
      messaging_product: 'whatsapp',
      to: to.replace('+', ''),
      type: 'text',
      text: {
        body: message
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return NextResponse.json({ 
        success: false, 
        error: errorData.error?.message || 'Failed to send message' 
      }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function sendViaCustom(config: any, to: string, message: string) {
  if (!config.webhookUrl) {
    return NextResponse.json({ error: 'Custom webhook URL is not configured' }, { status: 400 })
  }

  try {
    const payload = {
      to: to,
      message: message,
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
    }

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'X-API-Key': config.apiKey }),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Webhook returned an error' }, { status: response.status })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

