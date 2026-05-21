migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('novels')
    if (!col.fields.getByName('embedding')) {
      col.fields.add(
        new VectorField({
          name: 'embedding',
          dimensions: 1536,
          distance: 'cosine',
        }),
      )
    }
    col.addIndex('idx_novels_title', false, 'title', '')
    col.addIndex('idx_novels_author', false, 'author', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('novels')
    if (col.fields.getByName('embedding')) {
      col.fields.removeByName('embedding')
    }
    col.removeIndex('idx_novels_title')
    col.removeIndex('idx_novels_author')
    app.save(col)
  },
)
