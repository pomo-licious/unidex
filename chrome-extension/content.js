// Content script injected on all pages
// Extracts form fields, applies fill values, and provides UI for form filling

// Guard against double-injection
if (window.__unidexInjected) {
  console.log('Unidex already injected on this page')
} else {
  window.__unidexInjected = true

  // Initialize extension on page load
  initUnidex()

  // Re-initialize on DOM changes (for SPA navigation)
  const observer = new MutationObserver(() => {
    initUnidex()
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

// Main initialization
async function initUnidex() {
  const hasFormElements = !!document.querySelector('form, input, textarea, select')
  if (hasFormElements && !document.getElementById('unidex-fill-btn')) {
    await fetchProfile()
    injectFillButton()
  }
}

// Fetch profile from background script and store in window.__unidexProfile
async function fetchProfile() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_TOKEN'
    })

    const token = response.token
    if (!token) {
      window.__unidexProfile = null
      return
    }

    const profileResponse = await fetch(
      'https://siheziegpnrfjgzubjrk.supabase.co/functions/v1/get-profile',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (profileResponse.ok) {
      const profile = await profileResponse.json()
      window.__unidexProfile = profile
      console.log('Profile loaded:', profile)
    } else {
      window.__unidexProfile = null
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    window.__unidexProfile = null
  }
}

// Extract form fields from the page
function extractFormFields() {
  const fields = []
  const elements = document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea'
  )

  elements.forEach((el, index) => {
    const label = resolveLabel(el, index)
    const type = el.tagName.toLowerCase() === 'select' ? 'select' : el.type || 'text'
    const options = el.tagName === 'SELECT'
      ? Array.from(el.options).map(opt => ({ value: opt.value, text: opt.text }))
      : []

    fields.push({
      index,
      label,
      type,
      name: el.name || '',
      id: el.id || '',
      currentValue: el.value || '',
      options
    })
  })

  return fields
}

// Resolve label for a form field
function resolveLabel(el, index) {
  // 1. aria-label
  if (el.getAttribute('aria-label')) {
    return el.getAttribute('aria-label')
  }

  // 2. associated <label for=id>
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label) return label.textContent.trim()
  }

  // 3. placeholder
  if (el.placeholder) {
    return el.placeholder
  }

  // 4. name
  if (el.name) {
    return el.name
  }

  // 5. walk up 3 parent levels looking for .label/.field-label/label element
  let parent = el.parentElement
  for (let i = 0; i < 3 && parent; i++) {
    if (parent.classList.contains('label') || parent.classList.contains('field-label')) {
      return parent.textContent.trim()
    }
    const label = parent.querySelector('label')
    if (label) {
      return label.textContent.trim()
    }
    parent = parent.parentElement
  }

  // 6. fallback
  return `field_${index}`
}

// Apply fill values to form fields
function applyFillValues(fillMap) {
  let filledCount = 0
  const elements = document.querySelectorAll(
    'input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea'
  )

  elements.forEach((el, index) => {
    // Try to find value by name, id, or field index
    let value = fillMap[el.name] || fillMap[el.id] || fillMap[`field_${index}`]

    if (value !== undefined && value !== null) {
      // Use native setter for React compatibility
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value'
      )?.set || Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, value)
      } else {
        el.value = value
      }

      // Dispatch events
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))

      filledCount++
    }
  })

  return filledCount
}

// Detect college ID from URL
function detectCollegeId() {
  const url = window.location.href.toLowerCase()
  const colleges = {
    'iima': 'iim-ahmedabad',
    'iimb': 'iim-bangalore',
    'iimc': 'iim-calcutta',
    'xlri': 'xlri-jamshedpur',
    'isb': 'isb-hyderabad',
    'iimk': 'iim-kozhikode',
    'iiml': 'iim-lucknow'
  }

  for (const [substring, collegeId] of Object.entries(colleges)) {
    if (url.includes(substring)) {
      return collegeId
    }
  }

  return null
}

// Inject the fill button
function injectFillButton() {
  const button = document.createElement('button')
  button.id = 'unidex-fill-btn'

  // Set button text with profile completeness if available
  const completeness = window.__unidexProfile?.profile_completeness || 0
  button.textContent = '✦ Unidex Fill'
  button.title = `Profile completeness: ${completeness}%`

  button.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    padding: 10px 16px;
    background: #1a2744;
    color: #c9a84c;
    border: 1.5px solid #c9a84c;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  `

  button.addEventListener('click', async () => {
    try {
      // Check profile completeness
      const completeness = window.__unidexProfile?.profile_completeness || 0
      if (completeness < 50) {
        showToast(`⚠️ Profile is ${completeness}% complete. Please complete your profile first.`, 'warning')
        return
      }

      button.disabled = true
      button.textContent = '⏳ Filling...'

      const formFields = extractFormFields()
      const collegeId = detectCollegeId()

      const response = await chrome.runtime.sendMessage({
        type: 'FILL_FORM',
        formFields,
        collegeId
      })

      if (response.error) {
        showToast(response.error, 'error')
      } else {
        const fillMap = response.fill_values || {}
        const filledCount = applyFillValues(fillMap)
        showToast(`✓ Filled ${filledCount} fields`, 'success')
      }
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      button.disabled = false
      button.textContent = '✦ Unidex Fill'
    }
  })

  document.body.appendChild(button)
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.style.cssText = `
    position: fixed;
    bottom: 76px;
    right: 24px;
    z-index: 2147483647;
    padding: 12px 16px;
    background: #1a2744;
    color: ${type === 'success' ? '#c9a84c' : type === 'warning' ? '#f59e0b' : '#ef4444'};
    border: 1.5px solid ${type === 'success' ? '#c9a84c' : type === 'warning' ? '#f59e0b' : '#ef4444'};
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
  `
  toast.textContent = message
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'POPUP_FILL_REQUEST') {
    (async () => {
      try {
        const formFields = extractFormFields()
        const collegeId = detectCollegeId()

        const response = await chrome.runtime.sendMessage({
          type: 'FILL_FORM',
          formFields,
          collegeId
        })

        if (response.error) {
          sendResponse({ error: true, message: response.error })
        } else {
          const fillMap = response.fill_values || {}
          const filledCount = applyFillValues(fillMap)
          showToast(`✓ Filled ${filledCount} fields`, 'success')
          sendResponse({ filled: filledCount })
        }
      } catch (error) {
        sendResponse({ error: true, message: error.message })
      }
    })()

    return true // Keep channel open for async response
  }
})
