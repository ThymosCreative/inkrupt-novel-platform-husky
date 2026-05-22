migrate(
  (app) => {
    const chapters = app.findCollectionByNameOrId('chapters')

    if (!chapters.fields.getByName('status')) {
      chapters.fields.add(
        new SelectField({
          name: 'status',
          values: ['draft', 'published'],
          maxSelect: 1,
        }),
      )
    }

    if (!chapters.fields.getByName('published_at')) {
      chapters.fields.add(
        new DateField({
          name: 'published_at',
        }),
      )
    }

    chapters.createRule = "@request.auth.id != '' && novel.author = @request.auth.id"
    chapters.updateRule = "@request.auth.id != '' && novel.author = @request.auth.id"
    chapters.deleteRule = "@request.auth.id != '' && novel.author = @request.auth.id"
    chapters.listRule = "status = 'published' || novel.author = @request.auth.id"
    chapters.viewRule = "status = 'published' || novel.author = @request.auth.id"

    app.save(chapters)

    app
      .db()
      .newQuery("UPDATE chapters SET status = 'published' WHERE status IS NULL OR status = ''")
      .execute()
  },
  (app) => {
    const chapters = app.findCollectionByNameOrId('chapters')

    try {
      chapters.fields.removeByName('status')
    } catch (_) {}

    try {
      chapters.fields.removeByName('published_at')
    } catch (_) {}

    chapters.createRule = "@request.auth.id != ''"
    chapters.updateRule = "@request.auth.id != ''"
    chapters.deleteRule = "@request.auth.id != ''"
    chapters.listRule = ''
    chapters.viewRule = ''

    app.save(chapters)
  },
)
