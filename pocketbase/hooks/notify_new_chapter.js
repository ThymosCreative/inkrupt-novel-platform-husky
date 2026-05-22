onRecordAfterCreateSuccess((e) => {
  const chapter = e.record
  const novelId = chapter.get('novel')

  if (!novelId) return e.next()

  try {
    const libraryEntries = $app.findRecordsByFilter(
      'library_entries',
      'novel = {:novel}',
      '',
      10000,
      0,
      { novel: novelId },
    )

    if (libraryEntries.length === 0) return e.next()

    const notificationsCol = $app.findCollectionByNameOrId('notifications')
    const chapterTitle = chapter.getString('title')

    for (const entry of libraryEntries) {
      const userId = entry.get('user')
      if (!userId) continue

      const notif = new Record(notificationsCol)
      notif.set('user', userId)
      notif.set('novel', novelId)
      notif.set('chapter', chapter.id)
      notif.set('message', `Um novo capítulo foi publicado: ${chapterTitle}`)
      notif.set('is_read', false)
      $app.save(notif)
    }
  } catch (err) {
    $app
      .logger()
      .error('Failed to notify new chapter', 'chapter_id', chapter.id, 'error', err.message)
  }

  return e.next()
}, 'chapters')
