migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('novels')

    if (!col.fields.getByName('chapter_count')) {
      col.fields.add(new NumberField({ name: 'chapter_count', min: 0 }))
    }

    if (!col.fields.getByName('last_updated_at')) {
      col.fields.add(new DateField({ name: 'last_updated_at' }))
    }

    col.addIndex('idx_novels_chapter_count', false, 'chapter_count', '')
    col.addIndex('idx_novels_last_updated_at', false, 'last_updated_at DESC', '')
    app.save(col)

    // Seed / Update existing novels with accurate counts and dates
    const novels = app.findRecordsByFilter('novels', "id != ''", '', 0, 0)
    for (const novel of novels) {
      const chapters = app.findRecordsByFilter(
        'chapters',
        `novel = '${novel.id}' && status = 'published'`,
        '-published_at',
        0,
        0,
      )
      novel.set('chapter_count', chapters.length)
      if (chapters.length > 0 && chapters[0].getString('published_at')) {
        novel.set('last_updated_at', chapters[0].getString('published_at'))
      } else {
        novel.set('last_updated_at', novel.getString('created'))
      }
      app.saveNoValidate(novel)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('novels')
    col.removeField('chapter_count')
    col.removeField('last_updated_at')
    col.removeIndex('idx_novels_chapter_count')
    col.removeIndex('idx_novels_last_updated_at')
    app.save(col)
  },
)
