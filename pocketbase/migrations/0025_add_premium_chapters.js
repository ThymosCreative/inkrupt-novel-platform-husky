migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    users.fields.add(new NumberField({ name: 'coins', min: 0 }))
    app.save(users)

    const chapters = app.findCollectionByNameOrId('chapters')
    chapters.fields.add(new NumberField({ name: 'coin_price', min: 0 }))
    app.save(chapters)

    const novels = app.findCollectionByNameOrId('novels')
    novels.fields.add(new BoolField({ name: 'has_premium' }))
    app.save(novels)

    const unlocked = new Collection({
      name: 'unlocked_chapters',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != '' && user = @request.auth.id",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: users.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'chapter',
          type: 'relation',
          required: true,
          collectionId: chapters.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_unlocked_chapters_user_chapter ON unlocked_chapters (user, chapter)',
      ],
    })
    app.save(unlocked)
  },
  (app) => {
    try {
      const unlocked = app.findCollectionByNameOrId('unlocked_chapters')
      app.delete(unlocked)
    } catch (_) {}

    try {
      const chapters = app.findCollectionByNameOrId('chapters')
      chapters.fields.removeByName('coin_price')
      app.save(chapters)
    } catch (_) {}

    try {
      const novels = app.findCollectionByNameOrId('novels')
      novels.fields.removeByName('has_premium')
      app.save(novels)
    } catch (_) {}

    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      users.fields.removeByName('coins')
      app.save(users)
    } catch (_) {}
  },
)
