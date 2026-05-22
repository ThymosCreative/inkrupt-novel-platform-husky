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
  theme?: string
  onClose: () => void
}

export function ChapterComments({
  chapterId,
  novelAuthorId,
  theme,
  onClose,
}: ChapterCommentsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { addExp } = useWallet()
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'liked' | 'recent'>('liked')

  const fetchComments = async () => {
    try {
      const records = await pb.collection('comments').getFullList({
        filter: `chapter = "${chapterId}"`,
        sort: '-created', // For mocked likes scenario, we still sort by created from API
        expand: 'user',
      })
      setComments(records)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [chapterId, activeTab])

  useRealtime('comments', () => {
    fetchComments()
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    if (!user) {
      toast({
        title: 'Autenticação necessária',
        description: 'Você precisa estar logado para comentar.',
        variant: 'destructive',
      })
      return
    }

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

  return (
    <div
      className={cn(
        'flex flex-col h-full w-[380px] border-l shadow-2xl',
        theme === 'sepia' ? 'bg-[#2C2420] border-[#4A3B32]' : 'bg-zinc-900 border-zinc-800',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between p-4 border-b',
          theme === 'sepia' ? 'border-[#4A3B32]' : 'border-zinc-800',
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-white text-lg">Comentários do Capítulo</h3>
          <span
            className={cn(
              'text-white text-xs font-bold px-2 py-0.5 rounded-full',
              theme === 'sepia' ? 'bg-black/30' : 'bg-zinc-800',
            )}
          >
            {comments.length}
          </span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {user ? (
          <form onSubmit={handleSubmit} className="mb-6">
            <Textarea
              placeholder="O que achou deste capítulo?"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className={cn(
                'text-white mb-3 min-h-[80px] resize-none',
                theme === 'sepia'
                  ? 'bg-black/20 border-[#4A3B32] focus:border-zinc-500'
                  : 'bg-zinc-800 border-zinc-700 focus:border-zinc-500',
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className="bg-white text-black hover:bg-zinc-200 rounded-xl h-9 px-4 font-bold text-sm"
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Comentar
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-4 rounded-xl mb-6 text-center bg-zinc-800/50">
            <p className="text-zinc-400 text-sm">Faça login para participar da discussão.</p>
          </div>
        )}

        <div
          className={cn(
            'flex border-b mb-6',
            theme === 'sepia' ? 'border-[#4A3B32]' : 'border-zinc-800',
          )}
        >
          <button
            onClick={() => setActiveTab('liked')}
            className={cn(
              'px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === 'liked'
                ? 'border-b-2 border-white text-white'
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
                ? 'border-b-2 border-white text-white'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            Mais recentes
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-sm">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 border border-zinc-800 shrink-0">
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
                      <span className="bg-white/10 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                        Autor
                      </span>
                    )}
                    <span className="text-xs text-zinc-500 shrink-0">
                      {timeAgo(comment.created)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-zinc-300 mb-2 leading-snug break-words">
                    {comment.content}
                  </p>
                  <div className="flex items-center gap-4">
                    <button className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors group">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{Math.floor(Math.random() * 50)}</span>
                    </button>
                    <button className="text-zinc-400 hover:text-white text-xs font-semibold hover:underline">
                      Ver respostas
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
