migrate(
  (app) => {
    const novelsId = app.findCollectionByNameOrId('novels').id
    const chaptersId = app.findCollectionByNameOrId('chapters').id

    const collection = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: null,
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
          name: 'novel',
          type: 'relation',
          required: true,
          collectionId: novelsId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'chapter',
          type: 'relation',
          required: true,
          collectionId: chaptersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'message', type: 'text', required: true },
        { name: 'is_read', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notifications_user ON notifications (user, created DESC)',
        'CREATE INDEX idx_notifications_read ON notifications (user, is_read)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('notifications')
    app.delete(collection)
  },
)
