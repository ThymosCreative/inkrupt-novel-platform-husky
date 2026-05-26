onRecordEnrich((e) => {
  if (!e.record) return e.next()

  const isPremium = e.record.getBool('is_premium')
  const chapterType = e.record.getString('type')

  // Only restrict premium or privilege chapters
  if (!isPremium && chapterType !== 'premium' && chapterType !== 'privilege') {
    return e.next()
  }

  // Draft chapters can only be fetched by the author (enforced by viewRule),
  // so we can safely return full content without extra checks
  const status = e.record.getString('status')
  if (status && status !== 'published') return e.next()

  // Get the authenticated user ID — try both current and older PocketBase APIs
  let userId = null
  try {
    if (typeof e.requestInfo === 'function') {
      const reqInfo = e.requestInfo()
      if (reqInfo && reqInfo.auth) {
        userId = reqInfo.auth.id || (typeof reqInfo.auth.getId === 'function' ? reqInfo.auth.getId() : null)
      }
    }
  } catch (_) {}

  // Fallback: older PocketBase API exposes auth directly on the event
  if (!userId) {
    try {
      if (e.auth) {
        userId = e.auth.id || (typeof e.auth.getId === 'function' ? e.auth.getId() : null)
      }
    } catch (_) {}
  }

  // No authenticated user — strip content
  if (!userId) {
    e.record.set('content', '')
    return e.next()
  }

  // Check if the requesting user is the novel author
  try {
    const novelId = e.record.getString('novel')
    if (novelId) {
      const novel = $app.findRecordById('novels', novelId)
      const authorId = novel.getString('author')
      if (authorId && authorId === userId) {
        // Author always gets full content
        return e.next()
      }
    }
  } catch (_) {
    // If author lookup fails, fall through to unlock check
  }

  // Check if user has unlocked this chapter
  try {
    $app.findFirstRecordByFilter('unlocked_chapters', 'user = {:u} && chapter = {:c}', {
      u: userId,
      c: e.record.id,
    })
    // Found — user has unlocked this chapter
    return e.next()
  } catch (_) {
    // Not found — chapter is not unlocked
  }

  // Not the author and not unlocked — strip the content
  e.record.set('content', '')
  return e.next()
}, 'chapters')
