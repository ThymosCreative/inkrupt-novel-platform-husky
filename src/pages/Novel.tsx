import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  getNovel,
  getChapters,
  getReviews,
  formatNumber,
  getCoverUrl,
  getNovelDiscussions,
  createNovelDiscussion,
  deleteNovelDiscussion,
  checkIsFollowing,
  followAuthor,
  unfollowAuthor,
  getAuthorFollowerCount,
  getChapterCost,
} from '@/services/api'
import pb from '@/lib/pocketbase/client'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuthModal } from '@/components/AuthModal'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Eye,
  Star,
  Lock,
  List,
  MessageSquare,
  Clock,
  Plus,
  Loader2,
  Bookmark,
  CheckCircle,
  BookOpen,
  ListPlus,
  Coins,
  Zap,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AddToListDialog } from '@/components/AddToListDialog'
import { useWallet } from '@/hooks/use-wallet'

export default function Novel() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { wallet, votes, voteNovel, addExp, isChapterUnlocked, unlockChapter } = useWallet()

  const [novel, setNovel] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [libraryEntry, setLibraryEntry] = useState<any>(null)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isListDialogOpen, setIsListDialogOpen] = useState(false)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewErrors, setReviewErrors] = useState<{ rating?: string; content?: string }>({})
  const [discussions, setDiscussions] = useState<any[]>([])
  const [discussionContent, setDiscussionContent] = useState('')
  const [isPostingDiscussion, setIsPostingDiscussion] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followRecordId, setFollowRecordId] = useState<string | null>(null)
  const [followerCount, setFollowerCount] = useState(0)
  const [selectedChapter, setSelectedChapter] = useState<any>(null)

  const loadLibraryEntry = async (novelId: string) => {
    if (!user) return
    try {
      const entries = await pb.collection('library_entries').getFullList({
        filter: `user = "${user.id}" && novel = "${novelId}"`,
        expand: 'last_chapter',
      })
      if (entries.length > 0) setLibraryEntry(entries[0])
      else setLibraryEntry(null)
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    if (id) {
      Promise.all([getNovel(id), getChapters(id), getReviews(id), getNovelDiscussions(id)])
        .then(async ([n, c, r, d]) => {
          await loadLibraryEntry(n.id)
          setNovel(n)
          setChapters(c)
          setReviews(r)
          setDiscussions(d)

          if (n.expand?.author) {
            getAuthorFollowerCount(n.expand.author.id).then(setFollowerCount).catch(console.error)

            if (user) {
              const followRes = await checkIsFollowing(user.id, n.expand.author.id)
              if (followRes) {
                setIsFollowing(true)
                setFollowRecordId(followRes.id)
              } else {
                setIsFollowing(false)
                setFollowRecordId(null)
              }
            }
          }

          setLoading(false)
        })
        .catch((e) => {
          console.error(e)
          setLoading(false)
        })
    }
  }, [id, user])

  useRealtime(
    'library_entries',
    (e) => {
      if (user && novel && e.record.novel === novel.id && e.record.user === user.id) {
        if (e.action === 'delete') {
          setLibraryEntry(null)
        } else {
          loadLibraryEntry(novel.id)
        }
      }
    },
    !!user && !!novel,
  )

  useRealtime(
    'reviews',
    (e) => {
      if (novel && e.record.novel === novel.id) {
        getReviews(novel.id).then(setReviews).catch(console.error)
      }
    },
    !!novel,
  )

  useRealtime(
    'novel_discussions',
    (e) => {
      if (novel && e.record.novel === novel.id) {
        getNovelDiscussions(novel.id).then(setDiscussions).catch(console.error)
      }
    },
    !!novel,
  )

  useRealtime(
    'author_follows',
    (e) => {
      if (novel?.expand?.author && e.record.author === novel.expand.author.id) {
        getAuthorFollowerCount(novel.expand.author.id).then(setFollowerCount).catch(console.error)
      }
    },
    !!novel?.expand?.author,
  )

  const handleUpdateLibrary = async (status: string) => {
    if (!user) {
      setIsAuthOpen(true)
      return
    }
    try {
      if (libraryEntry) {
        const updated = await pb.collection('library_entries').update(libraryEntry.id, { status })
        setLibraryEntry(updated)
        toast.success('Status atualizado com sucesso!')
      } else {
        const newEntry = await pb.collection('library_entries').create({
          user: user.id,
          novel: novel.id,
          status,
        })
        setLibraryEntry(newEntry)
        toast.success('Adicionado à biblioteca!')
      }
    } catch (e) {
      toast.error('Erro ao atualizar a biblioteca.')
    }
  }

  const handleFollowToggle = async () => {
    if (!user) {
      setIsAuthOpen(true)
      return
    }
    if (!novel?.expand?.author) return

    try {
      if (isFollowing && followRecordId) {
        await unfollowAuthor(followRecordId)
        setIsFollowing(false)
        setFollowRecordId(null)
        setFollowerCount((prev) => Math.max(0, prev - 1))
        toast.success('Deixou de seguir o autor.')
      } else {
        const res = await followAuthor(user.id, novel.expand.author.id)
        setIsFollowing(true)
        setFollowRecordId(res.id)
        setFollowerCount((prev) => prev + 1)
        toast.success('Seguindo o autor!')
      }
    } catch (e) {
      toast.error('Erro ao seguir autor.')
    }
  }

  const handlePostDiscussion = async () => {
    if (!discussionContent.trim() || !user || !novel) return
    setIsPostingDiscussion(true)
    try {
      await createNovelDiscussion(novel.id, discussionContent, user.id)
      setDiscussionContent('')
      addExp(5, 'Discussão')
      toast.success('Comentário postado!')
    } catch (e) {
      toast.error('Erro ao postar comentário.')
    } finally {
      setIsPostingDiscussion(false)
    }
  }

  const handleDeleteDiscussion = async (discussionId: string) => {
    try {
      await deleteNovelDiscussion(discussionId)
      toast.success('Comentário removido.')
    } catch (e) {
      toast.error('Erro ao remover comentário.')
    }
  }

  const handleRemoveLibrary = async () => {
    if (libraryEntry) {
      try {
        await pb.collection('library_entries').delete(libraryEntry.id)
        setLibraryEntry(null)
        toast.success('Obra removida da biblioteca.')
      } catch (e) {
        toast.error('Erro ao remover da biblioteca.')
      }
    }
  }

  const userReview = reviews.find((r) => r.user === user?.id)

  const handleOpenReview = () => {
    if (!user) {
      setIsAuthOpen(true)
      return
    }
    setReviewErrors({})
    if (userReview) {
      setReviewContent(userReview.content || '')
      setReviewRating(userReview.rating || 0)
    } else {
      setReviewContent('')
      setReviewRating(0)
    }
    setIsReviewOpen(true)
  }

  const handleSubmitReview = async () => {
    const errors: { rating?: string; content?: string } = {}
    if (reviewRating < 1 || reviewRating > 5) {
      errors.rating = 'Please select a rating between 1 and 5 stars.'
    }
    if (!reviewContent.trim()) {
      errors.content = 'Review content is required.'
    }

    if (Object.keys(errors).length > 0) {
      setReviewErrors(errors)
      return
    }
    setReviewErrors({})
    setIsSubmittingReview(true)
    try {
      if (userReview) {
        await pb.collection('reviews').update(userReview.id, {
          rating: reviewRating,
          content: reviewContent,
        })
        toast.success('Review atualizada com sucesso!')
      } else {
        await pb.collection('reviews').create({
          novel: novel.id,
          user: user.id,
          rating: reviewRating,
          content: reviewContent,
        })
        addExp(20, 'Review')
        toast.success('Review submitted successfully!')
      }
      setIsReviewOpen(false)
    } catch (e) {
      toast.error('Erro ao enviar review.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!userReview) return
    try {
      await pb.collection('reviews').delete(userReview.id)
      toast.success('Review removida.')
      setIsReviewOpen(false)
    } catch (e) {
      toast.error('Erro ao remover review.')
    }
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : novel?.rating || 0

  if (loading) {
    return (
      <div className="pb-20">
        <div className="w-full h-[300px] bg-zinc-900 animate-pulse" />
        <div className="container mx-auto px-4 -mt-32 relative z-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <Skeleton className="w-[220px] h-[330px] rounded-2xl shrink-0 mx-auto md:mx-0 bg-zinc-800" />
            <div className="flex-1 pt-4 md:pt-12 w-full flex flex-col items-center md:items-start">
              <Skeleton className="h-12 w-3/4 max-w-[400px] mb-4 bg-zinc-800" />
              <Skeleton className="h-6 w-1/2 max-w-[200px] mb-8 bg-zinc-800" />
              <div className="flex gap-4">
                <Skeleton className="h-12 w-32 rounded-xl bg-zinc-800" />
                <Skeleton className="h-12 w-32 rounded-xl bg-zinc-800" />
                <Skeleton className="h-12 w-32 rounded-xl bg-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!novel) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-zinc-500">
        <h2 className="text-2xl font-bold text-white mb-2">Obra não encontrada</h2>
        <p>A novel que você está procurando não existe ou foi removida.</p>
        <Link to="/">
          <Button
            variant="outline"
            className="mt-6 border-lime-400 text-lime-400 hover:bg-lime-400/10 font-bold"
          >
            Voltar para o Início
          </Button>
        </Link>
      </div>
    )
  }

  const handleVote = () => {
    if (!user) {
      setIsAuthOpen(true)
      return
    }
    voteNovel(novel.id)
  }

  const coverUrl = getCoverUrl(novel)

  return (
    <div className="pb-20">
      <div className="w-full h-[300px] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
          style={{ backgroundImage: `url(${coverUrl})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="shrink-0 mx-auto md:mx-0">
            <img
              src={coverUrl}
              alt={novel.title}
              className="w-[220px] h-[330px] object-cover rounded-2xl shadow-2xl ring-1 ring-white/10"
            />
          </div>
          <div className="flex-1 pt-4 md:pt-12 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              {novel.type === 'Original' && (
                <Badge className="bg-white text-black hover:bg-zinc-200">ORIGINAL</Badge>
              )}
              {novel.is_hot && (
                <Badge className="bg-lime-400 text-black hover:bg-lime-500 border-none">HOT</Badge>
              )}
              <Badge variant="outline" className="border-lime-400 text-lime-400">
                {novel.status}
              </Badge>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{novel.title}</h1>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-6">
              <div className="flex items-center gap-2">
                <p className="text-lg text-lime-400 font-medium">
                  {novel.expand?.author?.name ||
                    novel.expand?.author?.email ||
                    'Autor Desconhecido'}
                </p>
                {novel.expand?.author?.is_author && (
                  <Badge
                    variant="outline"
                    className="text-lime-400 border-lime-400 bg-lime-400/10 text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Verificado
                  </Badge>
                )}
              </div>
              {novel.expand?.author && (
                <div className="flex items-center gap-3">
                  {user?.id !== novel.expand.author.id && (
                    <Button
                      onClick={handleFollowToggle}
                      variant={isFollowing ? 'outline' : 'default'}
                      size="sm"
                      className={`h-7 px-3 rounded-full text-xs ${!isFollowing ? 'bg-lime-400 text-black hover:bg-lime-500 font-bold' : 'border-lime-400 text-lime-400 hover:bg-lime-400/10'}`}
                    >
                      {isFollowing ? 'Seguindo' : 'Seguir'}
                    </Button>
                  )}
                  <span className="text-sm font-medium text-zinc-400">
                    {followerCount} {followerCount === 1 ? 'seguidor' : 'seguidores'}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center md:justify-start items-center gap-6 text-sm text-zinc-300 mb-8">
              <div className="flex flex-col items-center md:items-start">
                <span className="text-zinc-500 text-xs uppercase font-bold">Lidas</span>
                <span className="flex items-center gap-1.5 font-semibold text-white mt-1">
                  <Eye className="w-4 h-4 text-zinc-400" /> {formatNumber(novel.reads)}
                </span>
              </div>
              <div className="w-px h-8 bg-zinc-800 hidden md:block" />
              <div className="flex flex-col items-center md:items-start">
                <span className="text-zinc-500 text-xs uppercase font-bold">Avaliação</span>
                <span className="flex items-center gap-1.5 font-semibold text-white mt-1">
                  <Star className="w-4 h-4 text-lime-400 fill-lime-400" /> {avgRating.toFixed(1)}{' '}
                  <span className="text-zinc-500 font-normal text-xs ml-1">({reviews.length})</span>
                </span>
              </div>
              <div className="w-px h-8 bg-zinc-800 hidden md:block" />
              <div className="flex flex-col items-center md:items-start">
                <span className="text-zinc-500 text-xs uppercase font-bold">Capítulos</span>
                <span className="flex items-center gap-1.5 font-semibold text-white mt-1">
                  <List className="w-4 h-4 text-zinc-400" /> {chapters.length}
                </span>
              </div>
              <div className="w-px h-8 bg-zinc-800 hidden md:block" />
              <div className="flex flex-col items-center md:items-start">
                <span className="text-zinc-500 text-xs uppercase font-bold">Votos</span>
                <span className="flex items-center gap-1.5 font-semibold text-white mt-1">
                  <Star className="w-4 h-4 text-purple-400 fill-purple-400" />{' '}
                  {novel.power_stones_count || 0}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start flex-wrap">
              {chapters.length > 0 ? (
                (() => {
                  const getResumeChapterNum = () => {
                    if (!libraryEntry?.expand?.last_chapter) return 1
                    const lastChapterNum = libraryEntry.expand.last_chapter.chapter_number
                    const hasNext = chapters.some((c) => c.chapter_number === lastChapterNum + 1)
                    return hasNext ? lastChapterNum + 1 : lastChapterNum
                  }
                  const resumeNum = getResumeChapterNum()
                  return (
                    <Link to={`/novel/${novel.id}/chapter/${resumeNum}`}>
                      <Button className="w-full sm:w-auto bg-lime-400 text-black hover:bg-lime-500 font-bold px-8 h-12 rounded-xl text-base">
                        {libraryEntry?.expand?.last_chapter
                          ? `Continuar: Cap. ${resumeNum}`
                          : 'Ler Agora'}
                      </Button>
                    </Link>
                  )
                })()
              ) : (
                <Button
                  disabled
                  className="w-full sm:w-auto bg-zinc-800 text-zinc-500 font-bold px-8 h-12 rounded-xl text-base"
                >
                  Sem Capítulos
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white h-12 rounded-xl text-base px-6"
                  >
                    {libraryEntry ? (
                      <>
                        <Bookmark className="w-5 h-5 mr-2 text-lime-400 fill-lime-400" />
                        {libraryEntry.status === 'reading'
                          ? 'Lendo'
                          : libraryEntry.status === 'completed'
                            ? 'Concluído'
                            : 'Quero Ler'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Adicionar à Biblioteca
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-zinc-800 text-white w-48 rounded-xl">
                  <DropdownMenuItem
                    className="focus:bg-zinc-800 cursor-pointer"
                    onClick={() => handleUpdateLibrary('reading')}
                  >
                    <BookOpen className="w-4 h-4 mr-2" /> Lendo
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="focus:bg-zinc-800 cursor-pointer"
                    onClick={() => handleUpdateLibrary('plan_to_read')}
                  >
                    <Clock className="w-4 h-4 mr-2" /> Quero Ler
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="focus:bg-zinc-800 cursor-pointer"
                    onClick={() => handleUpdateLibrary('completed')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Concluído
                  </DropdownMenuItem>
                  {libraryEntry && (
                    <>
                      <DropdownMenuSeparator className="bg-zinc-800" />
                      <DropdownMenuItem
                        className="focus:bg-red-900/20 text-red-400 cursor-pointer"
                        onClick={handleRemoveLibrary}
                      >
                        Remover da Biblioteca
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                className="w-full sm:w-auto border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-white h-12 rounded-xl text-base px-4"
                onClick={() => {
                  if (!user) setIsAuthOpen(true)
                  else setIsListDialogOpen(true)
                }}
              >
                <ListPlus className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleVote}
                className={`w-full sm:w-auto h-12 rounded-xl px-6 font-bold ${
                  (votes || []).some(
                    (v: any) =>
                      v.novel_id === novel.id && v.voted_at > new Date().setHours(0, 0, 0, 0),
                  )
                    ? 'bg-lime-400 text-black hover:bg-lime-500'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <Zap className="w-5 h-5 mr-2" /> Votar ({wallet?.power_stones || 0})
              </Button>
            </div>
          </div>{' '}
        </div>

        <div className="mt-16 max-w-4xl mx-auto md:mx-0">
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="w-full sm:w-auto bg-zinc-900/50 p-1 rounded-xl mb-8 border border-zinc-800/50">
              <TabsTrigger
                value="about"
                className="flex-1 sm:w-32 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-lime-400"
              >
                Sobre
              </TabsTrigger>
              <TabsTrigger
                value="chapters"
                className="flex-1 sm:w-32 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-lime-400"
              >
                Capítulos ({chapters.length})
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="flex-1 sm:w-32 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-lime-400"
              >
                Reviews ({reviews.length})
              </TabsTrigger>
              <TabsTrigger
                value="discussions"
                className="flex-1 sm:w-32 rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-lime-400"
              >
                Discussões ({discussions.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="about"
              className="animate-in fade-in slide-in-from-bottom-4 space-y-8"
            >
              <div className="prose prose-invert prose-zinc max-w-none">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                  <div className="w-1 h-5 bg-lime-400 rounded-full" />
                  Sinopse
                </h3>
                <p className="text-zinc-300 leading-relaxed text-lg whitespace-pre-wrap">
                  {novel.description || 'Nenhuma sinopse disponível.'}
                </p>
              </div>
              {novel.genres && novel.genres.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                    <div className="w-1 h-5 bg-lime-400 rounded-full" />
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {novel.genres.map((g: string) => (
                      <Badge
                        key={g}
                        variant="secondary"
                        className="bg-zinc-900 text-zinc-300 hover:bg-zinc-800 px-3 py-1 text-sm rounded-full"
                      >
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="chapters" className="animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-zinc-950/50 rounded-2xl border border-zinc-900 overflow-hidden">
                <div className="p-4 bg-zinc-900/50 border-b border-zinc-900 flex justify-between items-center">
                  <span className="font-medium text-zinc-300">Índice</span>
                </div>
                <div className="divide-y divide-zinc-900/50 max-h-[500px] overflow-y-auto">
                  {chapters.map((chap) => {
                    const { type, cost } = getChapterCost(chap)
                    const isLocked =
                      type !== 'free' && !isChapterUnlocked(chap.id) && user?.id !== novel.author
                    return (
                      <div
                        key={chap.id}
                        onClick={() => {
                          if (isLocked) {
                            if (!user) setIsAuthOpen(true)
                            else setSelectedChapter(chap)
                          } else {
                            navigate(`/novel/${novel.id}/chapter/${chap.chapter_number}`)
                          }
                        }}
                        className="flex items-center justify-between p-4 hover:bg-zinc-900/30 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-zinc-500 font-mono w-8 text-right">
                            {chap.chapter_number}
                          </span>
                          <span className="text-zinc-200 group-hover:text-lime-400 transition-colors">
                            {chap.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-zinc-500 text-sm">
                          {(() => {
                            if (type === 'privilege')
                              return (
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-lime-400 text-black text-[10px] uppercase font-black px-1.5 py-0 rounded-sm">
                                    Privilege
                                  </Badge>
                                  <span className="flex items-center gap-1 text-xs text-zinc-400 font-bold">
                                    <Lock className="w-3 h-3" /> {cost} Coins
                                  </span>
                                </div>
                              )
                            if (type === 'premium')
                              return (
                                <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold">
                                  <Lock className="w-3 h-3" /> {cost} Coins
                                </div>
                              )
                            return <div className="w-4" />
                          })()}
                        </div>
                      </div>
                    )
                  })}
                  {chapters.length === 0 && (
                    <div className="p-8 text-center text-zinc-500">
                      Nenhum capítulo publicado ainda.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="discussions"
              className="animate-in fade-in slide-in-from-bottom-4 space-y-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <div className="w-1 h-5 bg-lime-400 rounded-full" />
                  Discussão da Novel
                </h3>
              </div>

              {user ? (
                <div className="mb-6 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-900">
                  <Textarea
                    value={discussionContent}
                    onChange={(e) => setDiscussionContent(e.target.value)}
                    placeholder="Escreva algo sobre a novel..."
                    className="bg-zinc-900 border-zinc-800 text-white mb-4 resize-none focus-visible:ring-lime-400"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handlePostDiscussion}
                      disabled={isPostingDiscussion || !discussionContent.trim()}
                      className="bg-lime-400 text-black hover:bg-lime-500 font-bold"
                    >
                      {isPostingDiscussion && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Postar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mb-6 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-900 text-center text-zinc-400">
                  Faça{' '}
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="text-lime-400 hover:underline font-bold"
                  >
                    login
                  </button>{' '}
                  para participar da discussão.
                </div>
              )}

              <div className="space-y-4">
                {discussions.map((disc) => (
                  <div
                    key={disc.id}
                    className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-900"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-zinc-800">
                          <AvatarImage
                            src={
                              disc.expand?.user?.avatar
                                ? pb.files.getURL(disc.expand.user, disc.expand.user.avatar)
                                : `https://img.usecurling.com/ppl/thumbnail?seed=${disc.user}`
                            }
                          />
                          <AvatarFallback>
                            {disc.expand?.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-zinc-200">
                              {disc.expand?.user?.name || disc.expand?.user?.email || 'Usuário'}
                            </p>
                            {disc.expand?.user?.is_author && (
                              <Badge
                                variant="outline"
                                className="text-lime-400 border-lime-400 bg-lime-400/10 py-0 px-1 text-[10px] h-4"
                              >
                                <CheckCircle className="w-2 h-2 mr-1" /> Verificado
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(disc.created), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {user?.id === disc.user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDiscussion(disc.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 px-2"
                        >
                          Excluir
                        </Button>
                      )}
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {disc.content}
                    </p>
                  </div>
                ))}
                {discussions.length === 0 && (
                  <div className="text-center text-zinc-500 py-8">
                    Nenhuma discussão ainda. Seja o primeiro a comentar!
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="reviews"
              className="animate-in fade-in slide-in-from-bottom-4 space-y-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <div className="w-1 h-5 bg-lime-400 rounded-full" />
                  Comunidade
                </h3>
                <Button
                  onClick={handleOpenReview}
                  className="bg-zinc-900 text-white hover:bg-zinc-800 border border-zinc-800"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {userReview ? 'Editar Review' : 'Escrever Review'}
                </Button>
              </div>
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-900"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-zinc-800">
                          <AvatarImage
                            src={
                              rev.expand?.user?.avatar
                                ? pb.files.getURL(rev.expand.user, rev.expand.user.avatar)
                                : `https://img.usecurling.com/ppl/thumbnail?seed=${rev.user}`
                            }
                          />
                          <AvatarFallback>
                            {rev.expand?.user?.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm text-zinc-200">
                            {rev.expand?.user?.name || rev.expand?.user?.email || 'Usuário'}
                          </p>
                          <div className="flex items-center text-lime-400 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${i < Math.floor(rev.rating) ? 'fill-current' : 'text-zinc-700'}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">
                        {new Date(rev.created).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed">{rev.content}</p>
                  </div>
                ))}
                {reviews.length === 0 && (
                  <div className="text-center text-zinc-500 py-8">
                    No reviews yet. Be the first to share your thoughts!
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <AuthModal isOpen={isAuthOpen} onOpenChange={setIsAuthOpen} />

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{userReview ? 'Editar Review' : 'Escrever Review'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-zinc-400">Sua nota</span>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setReviewRating(star)
                      if (reviewErrors.rating)
                        setReviewErrors({ ...reviewErrors, rating: undefined })
                    }}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= reviewRating ? 'fill-lime-400 text-lime-400' : 'text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {reviewErrors.rating && <p className="text-sm text-red-500">{reviewErrors.rating}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">O que você achou da obra?</label>
              <Textarea
                placeholder="Escreva sua review aqui..."
                value={reviewContent}
                onChange={(e) => {
                  setReviewContent(e.target.value)
                  if (reviewErrors.content) setReviewErrors({ ...reviewErrors, content: undefined })
                }}
                className={`min-h-[120px] bg-zinc-900 border-zinc-800 focus-visible:ring-lime-400 resize-none ${reviewErrors.content ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {reviewErrors.content && (
                <p className="text-sm text-red-500">{reviewErrors.content}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {userReview && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDeleteReview}
                className="w-full sm:w-auto border-red-900/50 text-red-400 hover:bg-red-900/20 hover:text-red-300"
              >
                Excluir
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsReviewOpen(false)}
              className="w-full sm:w-auto hover:bg-zinc-800 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmitReview}
              disabled={isSubmittingReview}
              className="w-full sm:w-auto bg-lime-400 text-black hover:bg-lime-500 font-bold"
            >
              {isSubmittingReview && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {userReview ? 'Salvar Alterações' : 'Enviar Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {novel && (
        <AddToListDialog
          novelId={novel.id}
          isOpen={isListDialogOpen}
          onOpenChange={setIsListDialogOpen}
        />
      )}

      <Dialog open={!!selectedChapter} onOpenChange={(open) => !open && setSelectedChapter(null)}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white sm:max-w-md">
          {selectedChapter &&
            (() => {
              const { type, cost } = getChapterCost(selectedChapter)
              const activeFps = (wallet?.fast_passes || []).reduce(
                (a, b) => a + (b.expires_at > Date.now() ? b.amount : 0),
                0,
              )
              const canUseCoin = (wallet?.coins || 0) >= cost
              const canUseFp = type === 'premium' && activeFps >= 1

              const handleUnlock = (method: 'coin' | 'fast_pass') => {
                const success = unlockChapter(selectedChapter.id, method, cost)
                if (success) {
                  toast.success('Capítulo desbloqueado!')
                  setSelectedChapter(null)
                  navigate(`/novel/${novel.id}/chapter/${selectedChapter.chapter_number}`)
                }
              }

              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-xl">Desbloquear Capítulo</DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-4 text-center">
                    <div className="text-lg font-bold text-zinc-200 mb-2">
                      {selectedChapter.title}
                    </div>

                    <div className="flex justify-center items-center gap-4 text-sm text-zinc-400 mb-6">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-amber-500 flex items-center gap-1">
                          <Coins className="w-4 h-4" /> {wallet?.coins || 0}
                        </span>
                        <span className="text-[10px] uppercase">Seus Coins</span>
                      </div>
                      {type === 'premium' && (
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-blue-500 flex items-center gap-1">
                            <Zap className="w-4 h-4" /> {activeFps}
                          </span>
                          <span className="text-[10px] uppercase">Seus Fast Passes</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      {type === 'premium' && (
                        <Button
                          onClick={() => handleUnlock('fast_pass')}
                          disabled={!canUseFp}
                          variant="outline"
                          className="w-full h-12 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-bold"
                        >
                          <Zap className="w-4 h-4 mr-2" /> Usar 1 Fast Pass
                        </Button>
                      )}
                      <Button
                        onClick={() => handleUnlock('coin')}
                        disabled={!canUseCoin}
                        className="w-full h-12 bg-amber-500 text-black hover:bg-amber-600 font-bold"
                      >
                        <Coins className="w-4 h-4 mr-2" /> Usar {cost} Coins
                      </Button>
                    </div>

                    {!canUseCoin && (!canUseFp || type === 'privilege') && (
                      <Link
                        to="/store"
                        className="inline-block mt-4 text-sm text-lime-400 hover:underline font-medium"
                      >
                        Saldo insuficiente. Comprar Coins.
                      </Link>
                    )}
                  </div>
                </>
              )
            })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
