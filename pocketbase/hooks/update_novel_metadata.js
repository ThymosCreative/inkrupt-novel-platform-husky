onRecordAfterCreateSuccess((e) => {
  if (e.record.getString('status') === 'published') {
    const novelId = e.record.getString('novel')
    const novel = $app.findRecordById('novels', novelId)
    novel.set('chapter_count', novel.getInt('chapter_count') + 1)
    const pub = e.record.getString('published_at')
    if (pub) {
      novel.set('last_updated_at', pub)
    }
    $app.saveNoValidate(novel)
  }
  e.next()
}, 'chapters')

onRecordAfterUpdateSuccess((e) => {
  const isPublishedNow = e.record.getString('status') === 'published'
  const wasPublished = e.record.original().getString('status') === 'published'

  if (
    isPublishedNow !== wasPublished ||
    (isPublishedNow &&
      e.record.getString('published_at') !== e.record.original().getString('published_at'))
  ) {
    const novelId = e.record.getString('novel')
    const chapters = $app.findRecordsByFilter(
      'chapters',
      `novel = '${novelId}' && status = 'published'`,
      '-published_at',
      0,
      0,
    )
    const novel = $app.findRecordById('novels', novelId)
    novel.set('chapter_count', chapters.length)
    if (chapters.length > 0 && chapters[0].getString('published_at')) {
      novel.set('last_updated_at', chapters[0].getString('published_at'))
    }
    $app.saveNoValidate(novel)
  }
  e.next()
}, 'chapters')

onRecordAfterDeleteSuccess((e) => {
  if (e.record.getString('status') === 'published') {
    const novelId = e.record.getString('novel')
    const chapters = $app.findRecordsByFilter(
      'chapters',
      `novel = '${novelId}' && status = 'published'`,
      '-published_at',
      0,
      0,
    )
    const novel = $app.findRecordById('novels', novelId)
    novel.set('chapter_count', chapters.length)
    if (chapters.length > 0 && chapters[0].getString('published_at')) {
      novel.set('last_updated_at', chapters[0].getString('published_at'))
    }
    $app.saveNoValidate(novel)
  }
  e.next()
}, 'chapters')
