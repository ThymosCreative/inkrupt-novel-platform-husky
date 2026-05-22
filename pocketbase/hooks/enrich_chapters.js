onRecordEnrich((e) => {
  if (!e.record) return e.next()

  const isPremium = e.record.getBool('is_premium')
  if (!isPremium) return e.next()

  const userId = e.requestInfo().auth?.id

  let isAuthor = false
  try {
    const novelId = e.record.getString('novel')
    if (novelId) {
      const novel = $app.findRecordById('novels', novelId)
      if (userId && novel.getString('author') === userId) {
        isAuthor = true
      }
    }
  } catch (_) {}

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
