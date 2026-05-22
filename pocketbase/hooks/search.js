routerAdd('POST', '/backend/v1/search', (e) => {
  const body = e.requestInfo().body || {}
  const query = (body.query || '').trim()
  if (!query) return e.badRequestError('missing query')

  try {
    const filterStr = body.filter || ''
    const keywordFilter =
      `(title ~ {:q} || description ~ {:q} || genres ~ {:q} || author.name ~ {:q})` +
      (filterStr ? ` && (${filterStr})` : '')

    let keywordResults = []
    try {
      keywordResults = $app.findRecordsByFilter(
        'novels',
        keywordFilter,
        body.sort && body.sort !== 'semantic' ? body.sort : '-reads',
        body.k || 20,
        0,
        { q: query },
      )
      $apis.enrichRecords(e, keywordResults, 'author')
    } catch (err) {
      $app.logger().error('keyword search failed', 'error', err.message)
    }

    let vecItems = []
    try {
      const embedRes = $ai.embed({ input: query })
      const vectorResults = $vectors.search(e, 'novels', {
        field: 'embedding',
        query: embedRes.data[0].embedding,
        k: body.k || 20,
        filter: filterStr,
        expand: ['author'],
      })
      vecItems = vectorResults.items || []
    } catch (err) {
      $app.logger().error('semantic search failed', 'error', err.message)
    }

    const seen = new Set()
    const combined = []

    for (const rec of keywordResults) {
      if (!seen.has(rec.id)) {
        seen.add(rec.id)
        const exp = JSON.parse(JSON.stringify(rec))
        exp._matchType = 'keyword'
        combined.push(exp)
      }
    }
    for (const rec of vecItems) {
      if (!seen.has(rec.id)) {
        seen.add(rec.id)
        const exp = JSON.parse(JSON.stringify(rec))
        exp._matchType = 'semantic'
        combined.push(exp)
      }
    }

    return e.json(200, { items: combined.slice(0, body.k || 20) })
  } catch (err) {
    $app.logger().error('hybrid search failed', 'error', err.message)
    return e.json(200, { items: [] })
  }
})
