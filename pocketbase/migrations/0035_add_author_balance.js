migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('author_balance')) {
      users.fields.add(
        new NumberField({
          name: 'author_balance',
        }),
      )
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('author_balance')) {
      users.fields.removeByName('author_balance')
      app.save(users)
    }
  },
)
