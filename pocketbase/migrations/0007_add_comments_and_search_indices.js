migrate(
  (app) => {
    const comments = new Collection({
      name: 'comments',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'chapter',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('chapters').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'content', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_comments_chapter ON comments (chapter, created DESC)'],
    })
    app.save(comments)

    const novels = app.findCollectionByNameOrId('novels')
    novels.addIndex('idx_novels_title', false, 'title', '')
    app.save(novels)
  },
  (app) => {
    try {
      const comments = app.findCollectionByNameOrId('comments')
      app.delete(comments)
    } catch (_) {}

    try {
      const novels = app.findCollectionByNameOrId('novels')
      novels.removeIndex('idx_novels_title')
      app.save(novels)
    } catch (_) {}
  },
)
