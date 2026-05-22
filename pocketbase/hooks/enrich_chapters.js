onRecordEnrich((e) => {
  if (!e.record) return e.next()

  const isPremium = e.record.getBool('is_premium')
  const type = e.record.getString('type')
  if (!isPremium && type !== 'premium' && type !== 'privilege') return e.next()

  let userId = null
  try {
    if (typeof e.requestInfo === 'function') {
      const reqInfo = e.requestInfo()
      if (reqInfo && reqInfo.auth) {
        userId = reqInfo.auth.id
      }
    } else if (e.auth) {
      userId = e.auth.id
    }
  } catch (_) {
    // Graceful catch for context absence to prevent server panics
  }

  let isAuthor = false
  try {
    const novelId = e.record.getString('novel')
    if (novelId) {
      const novel = $app.findRecordById('novels', novelId)
      if (userId && novel.getString('author') === userId) {
        isAuthor = true
      }
    }
  } catch (_) {
    // Graceful catch for lookup failures (e.g. invalid novel ID format)
  }

  if (isAuthor) return e.next()

  let isUnlocked = false
  if (userId) {
    try {
      $app.findFirstRecordByFilter('unlocked_chapters', 'user = {:u} && chapter = {:c}', {
        u: userId,
        c: e.record.id,
      })
      isUnlocked = true
    } catch (_) {}
  }

  if (!isUnlocked) {
    e.record.set('content', '')
  }

  return e.next()
}, 'chapters')
