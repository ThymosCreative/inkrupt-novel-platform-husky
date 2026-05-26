onRecordEnrich((e) => {
  if (!e.record) return e.next()

  const isPremium = e.record.getBool('is_premium')
  const chapterType = e.record.getString('type')

  // Only restrict premium or privilege chapters
  if (!isPremium && chapterType !== 'premium' && chapterType !== 'privilege') {
    return e.next()
  }

  // Draft chapters are only reachable by the author (enforced by listRule/viewRule),
  // so always return full content for non-published chapters
  const status = e.record.getString('status')
  if (status && status !== 'published') return e.next()

  // Determine if the request comes from a logged-in user.
  // We try every known PocketBase hook API variant to be safe.
  let authenticated = false

  try {
    if (typeof e.requestInfo === 'function') {
      const info = e.requestInfo()
      // Any non-null auth object means the user is authenticated
      if (info && info.auth) authenticated = true
    }
  } catch (_) {}

  // Fallback for older PocketBase versions
  if (!authenticated) {
    try {
      if (e.auth) authenticated = true
    } catch (_) {}
  }

  // Unauthenticated requests get content stripped (basic scraping protection)
  if (!authenticated) {
    e.record.set('content', '')
    return e.next()
  }

  // Authenticated users always receive the full content.
  // The frontend already enforces the lock UI and payment gate correctly.
  // Full server-side per-user payment verification is planned for Phase 2.
  return e.next()
}, 'chapters')
