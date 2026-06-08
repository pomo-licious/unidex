// Popup script for Unidex Form Fill extension

const signedoutState = document.getElementById('signedout-state')
const signedinState = document.getElementById('signedin-state')
const signInBtn = document.getElementById('signin-btn')
const fillBtn = document.getElementById('fill-btn')
const signoutBtn = document.getElementById('signout-btn')
const avatarEl = document.getElementById('avatar')
const userNameEl = document.getElementById('user-name')
const userSubtitleEl = document.getElementById('user-subtitle')
const statusDot = document.getElementById('status-dot')
const statusText = document.getElementById('status-text')
const resultMessage = document.getElementById('result-message')

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth()
  await detectForms()
})

// Check authentication status
async function checkAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' })

    if (response.authenticated) {
      // Load user profile
      const { unidex_profile } = await chrome.storage.local.get('unidex_profile')
      if (unidex_profile) {
        showSignedInState(unidex_profile)
      } else {
        showSignedOutState()
      }
    } else {
      showSignedOutState()
    }
  } catch (error) {
    console.error('Auth check failed:', error)
    showSignedOutState()
  }
}

// Show signed out state
function showSignedOutState() {
  signedoutState.classList.add('visible')
  signedinState.classList.remove('visible')
}

// Show signed in state
function showSignedInState(profile) {
  signedinState.classList.add('visible')
  signedoutState.classList.remove('visible')

  // Set user info
  const initial = (profile.name || 'U').charAt(0).toUpperCase()
  avatarEl.textContent = initial

  userNameEl.textContent = profile.name || 'User'

  const catScore = profile.academic_background?.cat_percentile || '—'
  const company = profile.academic_background?.company || '—'
  userSubtitleEl.textContent = `CAT ${catScore} · ${company}`
}

// Detect form fields on current tab
async function detectForms() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        const count = document.querySelectorAll(
          'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea'
        ).length
        return count
      }
    })

    const fieldCount = results[0]?.result || 0

    if (fieldCount > 0) {
      statusDot.classList.add('active')
      statusDot.classList.remove('inactive')
      statusText.textContent = `${fieldCount} field${fieldCount !== 1 ? 's' : ''} detected`
      fillBtn.disabled = false
    } else {
      statusDot.classList.add('inactive')
      statusDot.classList.remove('active')
      statusText.textContent = 'No forms detected'
      fillBtn.disabled = true
    }
  } catch (error) {
    console.error('Form detection failed:', error)
    statusText.textContent = 'Unable to scan form'
    fillBtn.disabled = true
  }
}

// Sign in handler
signInBtn.addEventListener('click', async () => {
  await chrome.tabs.create({ url: 'https://unidex.co.in/login?source=extension' })
  window.close()
})

// Fill button handler
fillBtn.addEventListener('click', async () => {
  fillBtn.disabled = true
  fillBtn.textContent = '⏳ Filling...'
  resultMessage.classList.remove('visible')

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'POPUP_FILL_REQUEST'
    })

    if (response.error) {
      showResultMessage(response.message, 'error')
    } else {
      showResultMessage(`✓ Filled ${response.filled} fields`, 'success')
    }
  } catch (error) {
    showResultMessage('Failed to fill form', 'error')
    console.error('Fill failed:', error)
  } finally {
    fillBtn.disabled = false
    fillBtn.textContent = '✦ Fill this form'
  }
})

// Sign out handler
signoutBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_TOKEN' })
  await chrome.storage.local.remove('unidex_profile')
  showSignedOutState()
})

// Show result message
function showResultMessage(message, type) {
  resultMessage.textContent = message
  resultMessage.className = `result-message visible ${type}`

  setTimeout(() => {
    resultMessage.classList.remove('visible')
  }, 3000)
}
