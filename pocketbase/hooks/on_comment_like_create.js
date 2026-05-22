onRecordAfterCreateSuccess((e) => {
  const commentId = e.record.getString('comment')
  if (!commentId) return e.next()
  try {
    const comment = $app.findRecordById('comments', commentId)
    comment.set('likes', (comment.getInt('likes') || 0) + 1)
    $app.saveNoValidate(comment)
  } catch (err) {
    $app.logger().error('Failed to increment likes', 'error', err.message)
  }
  return e.next()
}, 'comment_likes')
