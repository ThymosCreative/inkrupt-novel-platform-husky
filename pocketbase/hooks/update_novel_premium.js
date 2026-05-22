onRecordAfterCreateSuccess((e) => {
  if (e.record.getBool('is_premium')) {
    const novelId = e.record.getString('novel')
    if (novelId) {
      try {
        const novel = $app.findRecordById('novels', novelId)
        if (!novel.getBool('has_premium')) {
          novel.set('has_premium', true)
          $app.save(novel)
        }
      } catch (_) {}
    }
  }
  return e.next()
}, 'chapters')

onRecordAfterUpdateSuccess((e) => {
  if (e.record.getBool('is_premium') && !e.record.original().getBool('is_premium')) {
    const novelId = e.record.getString('novel')
    if (novelId) {
      try {
        const novel = $app.findRecordById('novels', novelId)
        if (!novel.getBool('has_premium')) {
          novel.set('has_premium', true)
          $app.save(novel)
        }
      } catch (_) {}
    }
  }
  return e.next()
}, 'chapters')
