migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('author_tier')) {
      users.fields.add(
        new SelectField({
          name: 'author_tier',
          values: ['starter', 'partner', 'original'],
          maxSelect: 1,
        }),
      )
      app.save(users)
    }

    app
      .db()
      .newQuery(`
    UPDATE users
    SET author_tier = 'starter'
    WHERE is_author = 1 OR is_author = 'true' OR is_author = '1'
  `)
      .execute()
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('author_tier')) {
      users.fields.removeByName('author_tier')
      app.save(users)
    }
  },
)
