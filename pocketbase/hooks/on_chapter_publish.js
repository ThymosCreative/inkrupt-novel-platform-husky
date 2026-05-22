onRecordValidate((e) => {
  const record = e.record
  const original = record.original()

  if (record.getString('status') === 'published' && original.getString('status') !== 'published') {
    if (!record.getString('published_at')) {
      record.set('published_at', new Date().toISOString())
    }
  }

  e.next()
}, 'chapters')
