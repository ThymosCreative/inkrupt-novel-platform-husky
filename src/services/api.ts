import pb from '@/lib/pocketbase/client'

export const formatNumber = (num: number) => {
  if (!num) return '0'
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export const getCoverUrl = (novel: any) => {
  if (novel.cover) return pb.files.getURL(novel, novel.cover)
  return `https://img.usecurling.com/p/300/400?q=fantasy,epic&seed=${novel.id}`
}

export const getNovels = async (options: any = {}) => {
  return pb.collection('novels').getList(1, 50, { expand: 'author', ...options })
}

export const getHotNovels = async () => {
  return pb.collection('novels').getList(1, 5, {
    filter: 'is_hot = true',
    expand: 'author',
    sort: '-reads',
  })
}

export const getTrendingNovels = async () => {
  return pb.collection('novels').getList(1, 12, {
    expand: 'author',
    sort: '-reads',
  })
}

export const getHiddenGems = async () => {
  return pb.collection('novels').getList(1, 6, {
    filter: 'rating >= 4.0 && reads < 1000',
    expand: 'author',
    sort: '-rating',
  })
}

export interface SearchOptions {
  query?: string
  status?: string
  type?: string
  genres?: string[]
  sort?: string
  limit?: number
  minRating?: number
  chapterRange?: string
}

export const searchNovels = async (options: SearchOptions = {}) => {
  const {
    query = '',
    status,
    type,
    genres = [],
    sort = '-reads',
    limit = 20,
    minRating,
    chapterRange,
  } = options

  let filterStr = ''
  const filters = []
  if (status && status !== 'all') filters.push(`status = "${status}"`)
  if (type && type !== 'all') filters.push(`type = "${type}"`)
  if (minRating) filters.push(`rating >= ${minRating}`)

  if (chapterRange && chapterRange !== 'all') {
    if (chapterRange === '1-10') filters.push('chapter_count >= 1 && chapter_count <= 10')
    if (chapterRange === '10-50') filters.push('chapter_count > 10 && chapter_count <= 50')
    if (chapterRange === '50-100') filters.push('chapter_count > 50 && chapter_count <= 100')
    if (chapterRange === '100+') filters.push('chapter_count > 100')
  }

  if (genres.length > 0) {
    const genreConditions = genres.map((g) => `genres ~ "${g}"`)
    filters.push(`(${genreConditions.join(' || ')})`)
  }

  if (filters.length > 0) filterStr = filters.join(' && ')

  if (query) {
    try {
      const res = await pb.send('/backend/v1/search', {
        method: 'POST',
        body: JSON.stringify({ query, filter: filterStr, k: limit, sort }),
      })
      return { items: res.items || [] }
    } catch (err) {
      console.error(err)
      return { items: [] }
    }
  }

  return pb.collection('novels').getList(1, limit, {
    filter: filterStr,
    sort: sort === 'semantic' ? '-reads' : sort,
    expand: 'author',
  })
}

export const getComments = async (chapterId: string) => {
  return pb
    .collection('comments')
    .getFullList({ filter: `chapter = "${chapterId}"`, expand: 'user', sort: '-created' })
}

export const createComment = async (chapterId: string, content: string, userId: string) => {
  return pb.collection('comments').create({ chapter: chapterId, content, user: userId })
}

export const getNovel = async (id: string) => {
  return pb.collection('novels').getOne(id, { expand: 'author' })
}

export const getChapters = async (novelId: string) => {
  return pb
    .collection('chapters')
    .getFullList({ filter: `novel = "${novelId}"`, sort: 'chapter_number' })
}

export const getChapterByNum = async (novelId: string, num: number) => {
  return pb
    .collection('chapters')
    .getFirstListItem(`novel = "${novelId}" && chapter_number = ${num}`)
}

export const getReviews = async (novelId: string) => {
  return pb
    .collection('reviews')
    .getFullList({ filter: `novel = "${novelId}"`, expand: 'user', sort: '-created' })
}

export const getLibrary = async (userId: string) => {
  return pb
    .collection('library_entries')
    .getFullList({ filter: `user = "${userId}"`, expand: 'novel,last_chapter', sort: '-updated' })
}

export const getNovelDiscussions = async (novelId: string) => {
  return pb
    .collection('novel_discussions')
    .getFullList({ filter: `novel = "${novelId}"`, expand: 'user', sort: '-created' })
}

export const createNovelDiscussion = async (novelId: string, content: string, userId: string) => {
  return pb.collection('novel_discussions').create({ novel: novelId, content, user: userId })
}

export const deleteNovelDiscussion = async (id: string) => {
  return pb.collection('novel_discussions').delete(id)
}

export const getAuthorFollowerCount = async (authorId: string) => {
  const result = await pb.collection('author_follows').getList(1, 1, {
    filter: `author="${authorId}"`,
  })
  return result.totalItems
}

export const checkIsFollowing = async (followerId: string, authorId: string) => {
  try {
    return await pb
      .collection('author_follows')
      .getFirstListItem(`follower="${followerId}" && author="${authorId}"`)
  } catch (e) {
    return null
  }
}

export const followAuthor = async (followerId: string, authorId: string) => {
  return pb.collection('author_follows').create({ follower: followerId, author: authorId })
}

export const unfollowAuthor = async (id: string) => {
  return pb.collection('author_follows').delete(id)
}

export const getAuthorApplication = async (userId: string) => {
  try {
    return await pb.collection('author_applications').getFirstListItem(`user="${userId}"`)
  } catch {
    return null
  }
}

export const createAuthorApplication = async (
  userId: string,
  bio: string,
  portfolio_link?: string,
) => {
  return pb.collection('author_applications').create({
    user: userId,
    bio,
    portfolio_link,
    status: 'pending',
  })
}
