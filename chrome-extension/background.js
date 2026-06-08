// Service worker for Unidex Form Fill extension
// Handles token storage, auth checks, and edge function calls

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.type) {
        case 'FILL_FORM': {
          const token = await getToken()
          if (!token) {
            sendResponse({ error: 'Not authenticated' })
            return
          }

          // Step 1: Fetch the flat profile from get-profile edge function
          const profileResponse = await fetch(
            'https://siheziegpnrfjgzubjrk.supabase.co/functions/v1/get-profile',
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          )

          if (!profileResponse.ok) {
            throw new Error(`Failed to fetch profile: ${profileResponse.statusText}`)
          }

          const profile = await profileResponse.json()

          // Step 2: Call profile-formfill with the full profile
          const fillResponse = await fetch(
            'https://siheziegpnrfjgzubjrk.supabase.co/functions/v1/profile-formfill',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                profile,
                form_fields: request.formFields,
                college_id: request.collegeId
              })
            }
          )

          if (!fillResponse.ok) {
            throw new Error(`Edge function error: ${fillResponse.statusText}`)
          }

          const data = await fillResponse.json()
          sendResponse(data)
          break
        }

        case 'SET_TOKEN': {
          await chrome.storage.local.set({ unidex_token: request.token })
          sendResponse({ success: true })
          break
        }

        case 'GET_TOKEN': {
          const token = await getToken()
          sendResponse({ token })
          break
        }

        case 'CLEAR_TOKEN': {
          await chrome.storage.local.remove('unidex_token')
          sendResponse({ success: true })
          break
        }

        case 'CHECK_AUTH': {
          const token = await getToken()
          sendResponse({ authenticated: !!token })
          break
        }

        default:
          sendResponse({ error: 'Unknown message type' })
      }
    } catch (error) {
      sendResponse({ error: error.message })
    }
  })()

  return true // Keep channel open for async response
})

// Listen for external messages from web app
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === 'UNIDEX_TOKEN') {
    const senderOrigin = sender.url ? new URL(sender.url).origin : null
    const allowedOrigins = ['https://unidex.co.in', 'https://biz-sable.vercel.app']

    if (allowedOrigins.includes(senderOrigin)) {
      chrome.storage.local.set({ unidex_token: request.token }, () => {
        sendResponse({ success: true })
      })
      return true
    }
  }

  sendResponse({ error: 'Unauthorized origin' })
})

// Helper: get token from storage
async function getToken() {
  const { unidex_token } = await chrome.storage.local.get('unidex_token')
  return unidex_token || null
}
