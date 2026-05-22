import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, X, ThumbsUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useWallet } from '@/hooks/use-wallet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Agora mesmo'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`
  return `${Math.floor(diffInSeconds / 86400)}d atrás`
}

interface ChapterCommentsProps {
  chapterId: string
  novelAuthorId?: string
  onClose: () => void
}

export function ChapterComments({ chapterId, novelAuthorId, onClose }: ChapterCommentsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { addExp } = useWallet()
  const [comments, setComments] = useState<any[]>([])
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set())
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'liked' | 'recent'>('liked')

  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyingSubmitting, setReplyingSubmitting] = useState(false)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())

  const fetchComments = async () => {
    try {
      const records = await pb.collection('comments').getFullList({
        filter: `chapter = "${chapterId}"`,
        sort: activeTab === 'liked' ? '-likes,-created' : '-created',
        expand: 'user',
      })
      setComments(records)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserLikes = async () => {
    if (!user) return
    try {
      const likes = await pb.collection('comment_likes').getFullList({
        filter: `user = "${user.id}" && comment.chapter = "${chapterId}"`,
      })
      setUserLikes(new Set(likes.map((l) => l.comment)))
    } catch (err) {
      console.error('Error fetching user likes:', err)
    }
  }

  useEffect(() => {
    fetchComments()
    fetchUserLikes()
  }, [chapterId, activeTab, user])

  useRealtime('comments', (e) => {
    if (e.action === 'create' || e.action === 'update' || e.action === 'delete') {
      fetchComments()
    }
  })

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newComment.trim() || !user) return

    setSubmitting(true)
    try {
      await pb.collection('comments').create({
        chapter: chapterId,
        user: user.id,
        content: newComment,
      })
      setNewComment('')
      addExp(5, 'Comentário')
      toast({
        title: 'Sucesso',
        description: 'Comentário enviado!',
      })
    } catch (err) {
      console.error('Error posting comment:', err)
      toast({
        title: 'Erro',
        description: 'Falha ao enviar comentário. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async (parentId: string) => {
    if (!replyText.trim() || !user) return
    setReplyingSubmitting(true)
    try {
      await pb.collection('comments').create({
        chapter: chapterId,
        user: user.id,
        content: replyText,
        parent_id: parentId,
      })
      setReplyText('')
      setReplyingTo(null)
      setExpandedThreads((prev) => {
        const next = new Set(prev)
        next.add(parentId)
        return next
      })
      toast({
        title: 'Sucesso',
        description: 'Resposta enviada!',
      })
    } catch (err) {
      console.error('Error posting reply:', err)
      toast({ title: 'Erro', description: 'Falha ao enviar resposta.', variant: 'destructive' })
    } finally {
      setReplyingSubmitting(false)
    }
  }

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa estar logado para curtir.',
        variant: 'destructive',
      })
      return
    }

    const isLiked = userLikes.has(commentId)

    // Optimistic UI
    setUserLikes((prev) => {
      const next = new Set(prev)
      if (isLiked) next.delete(commentId)
      else next.add(commentId)
      return next
    })

    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return { ...c, likes: Math.max(0, (c.likes || 0) + (isLiked ? -1 : 1)) }
        }
        return c
      }),
    )

    try {
      if (isLiked) {
        const likeRecord = await pb
          .collection('comment_likes')
          .getFirstListItem(`user="${user.id}" && comment="${commentId}"`)
        await pb.collection('comment_likes').delete(likeRecord.id)
      } else {
        await pb.collection('comment_likes').create({ user: user.id, comment: commentId })
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const toggleThread = (commentId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      if (next.has(commentId)) next.delete(commentId)
      else next.add(commentId)
      return next
    })
  }

  const rootComments = comments.filter((c) => !c.parent_id)
  const repliesMap = new Map<string, any[]>()
  comments.forEach((c) => {
    if (c.parent_id) {
      if (!repliesMap.has(c.parent_id)) repliesMap.set(c.parent_id, [])
      repliesMap.get(c.parent_id)!.push(c)
    }
  })

  const renderCommentContent = (comment: any, isReply: boolean = false) => {
    const isLiked = userLikes.has(comment.id)
    const replies = (repliesMap.get(comment.id) || []).sort(
      (a, b) => new Date(a.created).getTime() - new Date(b.created).getTime(),
    )
    const hasReplies = replies.length > 0
    const isExpanded = expandedThreads.has(comment.id)

    return (
      <div className="flex gap-3">
        <Avatar className={cn('border border-zinc-800 shrink-0', isReply ? 'w-6 h-6' : 'w-8 h-8')}>
          <AvatarImage
            src={
              comment.expand?.user?.avatar
                ? pb.files.getURL(comment.expand.user, comment.expand.user.avatar)
                : undefined
            }
          />
          <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
            {comment.expand?.user?.name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-white text-sm truncate">
              {comment.expand?.user?.name || 'User'}
            </span>
            {comment.expand?.user?.id === novelAuthorId && (
              <span className="bg-lime-400/10 text-lime-400 text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                Autor
              </span>
            )}
            <span className="text-xs text-zinc-500 shrink-0">{timeAgo(comment.created)}</span>
          </div>
          <p className="whitespace-pre-wrap text-sm text-zinc-300 mb-2 leading-snug break-words">
            {comment.content}
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleLike(comment.id)}
              className={cn(
                'flex items-center gap-1.5 transition-colors group',
                isLiked ? 'text-lime-400' : 'text-zinc-400 hover:text-white',
              )}
            >
              <ThumbsUp className={cn('w-3.5 h-3.5', isLiked && 'fill-lime-400')} />
              <span className="text-xs font-medium">{comment.likes || 0}</span>
            </button>
            {!isReply && (
              <button
                onClick={() => {
                  if (!user) {
                    toast({
                      title: 'Autenticação necessária',
                      description: 'Você precisa estar logado para responder.',
                      variant: 'destructive',
                    })
                    return
                  }
                  setReplyingTo(replyingTo === comment.id ? null : comment.id)
                }}
                className="text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Responder
              </button>
            )}
            {!isReply && hasReplies && (
              <button
                onClick={() => toggleThread(comment.id)}
                className="text-lime-400 text-xs hover:text-lime-300 font-semibold hover:underline cursor-pointer"
              >
                {isExpanded ? 'Ocultar respostas' : `Ver respostas (${replies.length})`}
              </button>
            )}
          </div>

          {!isReply && replyingTo === comment.id && (
            <div className="mt-3">
              <Textarea
                placeholder={`Respondendo para @${comment.expand?.user?.name || 'User'}...`}
                className="text-white mb-2 min-h-[60px] resize-none bg-zinc-800 border-zinc-700 focus:border-lime-400 focus:ring-0 text-sm"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyingTo(null)
                    setReplyText('')
                  }}
                  className="text-zinc-400 hover:text-white h-8 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => submitReply(comment.id)}
                  disabled={!replyText.trim() || replyingSubmitting}
                  className="bg-lime-400 text-black hover:bg-lime-300 h-8 text-xs font-semibold rounded-lg"
                >
                  Responder
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-[320px] border-l shadow-2xl bg-zinc-900 border-zinc-800">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800 px-6 pt-6 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Comentários</h3>
          <span className="bg-lime-400/10 text-lime-400 text-xs font-bold px-2 py-0.5 rounded-full leading-none">
            {rootComments.length}
          </span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="mb-6 relative">
                <Textarea
                  placeholder="O que achou deste capítulo?"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={!user || submitting}
                  className={cn(
                    'text-white mb-3 min-h-[80px] resize-none bg-zinc-800 border-zinc-700 focus:border-lime-400 focus:ring-0 text-sm',
                    !user && 'opacity-50 cursor-not-allowed',
                  )}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!user || submitting || !newComment.trim()}
                    className="bg-lime-400 text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-lime-300 transition-colors disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Comentar
                  </Button>
                </div>
                {!user && <div className="absolute inset-0 z-10" />}
              </div>
            </TooltipTrigger>
            {!user && (
              <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                <p>Faça login para comentar</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <div className="flex border-b mb-6 border-zinc-800">
          <button
            onClick={() => setActiveTab('liked')}
            className={cn(
              'px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === 'liked'
                ? 'border-b-2 border-lime-400 text-lime-400'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            Mais curtidos
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={cn(
              'px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === 'recent'
                ? 'border-b-2 border-lime-400 text-lime-400'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            Mais recentes
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </div>
        ) : (
          <div className="space-y-6">
            {rootComments.map((comment) => (
              <div key={comment.id} className="mb-6">
                {renderCommentContent(comment)}

                {expandedThreads.has(comment.id) && repliesMap.has(comment.id) && (
                  <div className="mt-4 ml-10 border-l border-zinc-800 pl-4 space-y-4">
                    {(repliesMap.get(comment.id) || [])
                      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
                      .map((reply) => (
                        <div key={reply.id}>{renderCommentContent(reply, true)}</div>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
