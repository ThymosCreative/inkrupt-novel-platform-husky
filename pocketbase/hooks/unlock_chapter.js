routerAdd(
  'POST',
  '/backend/v1/unlock-chapter',
  (e) => {
    const body = e.requestInfo().body || {}
    const chapterId = body.chapter_id
    const userId = e.auth?.id

    if (!userId) return e.unauthorizedError('auth required')
    if (!chapterId) return e.badRequestError('chapter_id is required')

    let chapter
    try {
      chapter = $app.findRecordById('chapters', chapterId)
    } catch (_) {
      return e.notFoundError('chapter not found')
    }

    if (!chapter.getBool('is_premium')) {
      return e.badRequestError('chapter is not premium')
    }

    const price = chapter.getInt('coin_price') || 0

    try {
      $app.findFirstRecordByFilter('unlocked_chapters', 'user = {:u} && chapter = {:c}', {
        u: userId,
        c: chapterId,
      })
      return e.json(200, { success: true, message: 'already unlocked' })
    } catch (_) {}

    let errResponse = null

    try {
      $app.runInTransaction((txApp) => {
        const user = txApp.findRecordById('_pb_users_auth_', userId)
        const coins = user.getInt('coins') || 0

        if (coins < price) {
          errResponse = e.badRequestError('insufficient coins')
          throw new Error('rollback')
        }

        user.set('coins', coins - price)
        txApp.save(user)

        const col = txApp.findCollectionByNameOrId('unlocked_chapters')
        const unlockedRecord = new Record(col)
        unlockedRecord.set('user', userId)
        unlockedRecord.set('chapter', chapterId)
        txApp.save(unlockedRecord)
      })
    } catch (err) {
      if (errResponse) return errResponse
      throw err
    }

    return e.json(200, { success: true })
  },
  $apis.requireAuth(),
)
