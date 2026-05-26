migrate(
  (app) => {
    // Update premium chapters
    app
      .db()
      .newQuery(`
    UPDATE chapters
    SET type = 'premium'
    WHERE is_premium = 1 OR is_premium = 'true' OR is_premium = '1'
  `)
      .execute()

    // Set everything else to free where type is not defined
    app
      .db()
      .newQuery(`
    UPDATE chapters
    SET type = 'free'
    WHERE type IS NULL OR type = '' OR type = 'null'
  `)
      .execute()
  },
  (app) => {
    // Irreversible operation
  },
)
