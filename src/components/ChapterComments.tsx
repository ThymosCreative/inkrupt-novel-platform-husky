import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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
}

export function ChapterComments({ chapterId, novelAuthorId, theme }: ChapterCommentsProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchComments = async () => {
    try {
      const records = await pb.collection('comments').getFullList({
        filter: `chapter = "${chapterId}"`,
        sort: '-created',
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
  }, [chapterId])

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

  const textColor =
    theme === 'light' ? 'text-zinc-900' : theme === 'sepia' ? 'text-[#5b4636]' : 'text-zinc-300'
  const subtextColor =
    theme === 'light' ? 'text-zinc-500' : theme === 'sepia' ? 'text-[#5b4636]/70' : 'text-zinc-500'
  const bgColor =
    theme === 'light' ? 'bg-zinc-50' : theme === 'sepia' ? 'bg-[#e6dcc0]' : 'bg-zinc-900/50'

  return (
    <div
      className={cn(
        'mt-12 pt-8 border-t',
        theme === 'light'
          ? 'border-zinc-200'
          : theme === 'sepia'
            ? 'border-[#e6dcc0]'
            : 'border-zinc-800',
      )}
    >
      <h3 className={cn('text-2xl font-bold mb-8', textColor)}>Comentários</h3>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-10">
          <Textarea
            placeholder="O que achou deste capítulo?"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={cn('mb-4 min-h-[100px]', bgColor, textColor, 'border-transparent')}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-lime-400 text-black hover:bg-lime-500"
            >
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Comentar
            </Button>
          </div>
        </form>
      ) : (
        <div className={cn('p-6 rounded-xl mb-10 text-center', bgColor)}>
          <p className={subtextColor}>Faça login para participar da discussão.</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className={cn('text-center py-10', subtextColor)}>
          Nenhum comentário ainda. Seja o primeiro a comentar!
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <Avatar className="w-10 h-10 border border-zinc-800">
                <AvatarImage
                  src={
                    comment.expand?.user?.avatar
                      ? pb.files.getURL(comment.expand.user, comment.expand.user.avatar)
                      : undefined
                  }
                />
                <AvatarFallback className="bg-zinc-800 text-zinc-400">
                  {comment.expand?.user?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className={cn('font-bold', textColor)}>
                    {comment.expand?.user?.name || 'User'}
                  </span>
                  {comment.expand?.user?.id === novelAuthorId && (
                    <span className="bg-primary/20 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                      Autor
                    </span>
                  )}
                  <span className={cn('text-xs', subtextColor)}>{timeAgo(comment.created)}</span>
                </div>
                <p className={cn('whitespace-pre-wrap text-sm', textColor)}>{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
