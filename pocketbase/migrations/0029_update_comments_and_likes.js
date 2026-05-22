migrate(
  (app) => {
    const commentsCol = app.findCollectionByNameOrId('comments')

    if (!commentsCol.fields.getByName('likes')) {
      commentsCol.fields.add(
        new NumberField({
          name: 'likes',
          required: false,
        }),
      )
    }

    if (!commentsCol.fields.getByName('parent_id')) {
      commentsCol.fields.add(
        new RelationField({
          name: 'parent_id',
          collectionId: commentsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    app.save(commentsCol)

    let commentLikesCol
    try {
      commentLikesCol = app.findCollectionByNameOrId('comment_likes')
    } catch (err) {
      commentLikesCol = new Collection({
        name: 'comment_likes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != '' && user = @request.auth.id",
        updateRule: null,
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'comment',
            type: 'relation',
            required: true,
            collectionId: commentsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_comment_likes_unique ON comment_likes (comment, user)',
          'CREATE INDEX idx_comment_likes_user ON comment_likes (user)',
        ],
      })
      app.save(commentLikesCol)
    }
  },
  (app) => {
    try {
      const commentLikesCol = app.findCollectionByNameOrId('comment_likes')
      app.delete(commentLikesCol)
    } catch (err) {}

    try {
      const commentsCol = app.findCollectionByNameOrId('comments')
      commentsCol.fields.removeByName('likes')
      commentsCol.fields.removeByName('parent_id')
      app.save(commentsCol)
    } catch (err) {}
  },
)
