const record = value => value && typeof value === 'object' && !Array.isArray(value)
const stable = value => Array.isArray(value) ? value.map(stable) : record(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value
const same = (left, right) => JSON.stringify(stable(left)) === JSON.stringify(stable(right))

// Canonical edits made in Profile or document review take precedence over an
// older draft. Draft-only edits survive when that canonical field is unchanged.
export function mergeDraftProfile(canonical, draftProfile, baseProfile) {
  if (!draftProfile || !baseProfile) return canonical
  const merge = (current, draft, base) => {
    if (same(current, base)) return draft === undefined ? current : draft
    if (record(current) && record(draft) && record(base)) {
      return Object.fromEntries([...new Set([...Object.keys(current), ...Object.keys(draft)])]
        .map(key => [key, merge(current[key], draft[key], base[key])]))
    }
    return current
  }
  return merge(canonical, draftProfile, baseProfile)
}

// Continue after a rejected write while preserving invocation order. This also
// places explicit saves and receipt writes behind any in-flight autosave.
export function createWriteQueue() {
  let tail = Promise.resolve()
  return operation => {
    const pending = tail.then(operation)
    tail = pending.catch(() => {})
    return pending
  }
}
