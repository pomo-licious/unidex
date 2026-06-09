// Helper functions for auth error handling

export function isRateLimitError(error) {
  if (!error?.message) return false
  const msg = error.message.toLowerCase()
  return msg.includes('rate limit') || msg.includes('wait') || msg.includes('second')
}

export function getAuthErrorMessage(error) {
  if (isRateLimitError(error)) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return error?.message || 'Authentication failed'
}
