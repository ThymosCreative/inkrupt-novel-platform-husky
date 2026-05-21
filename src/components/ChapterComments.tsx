import { useState, useEffect } from 'react'
import { getComments, createComment } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, MessageSquare } from 'lucide-react'
import { AuthModal } from '@/components/AuthModal'
import { cn } from '@/lib/utils'

interface ChapterCommentsProps {
  chapterId: string
  theme: string
}

export function ChapterComments({ chapterId, theme }: ChapterCommentsProps) {
  const { user, isAuthenticated } = useAuth()
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  const loadComments = () => {
    getComments(chapterId)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadComments()
  }, [chapterId])

  useRealtime('comments', (e) => {
    if (e.action === 'create' && e.record.chapter === chapterId) {
      loadComments()
    } else if (e.action === 'delete' && e.record.chapter === chapterId) {
      setComments((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || !user) return
    setSubmitting(true)
    try {
      await createComment(chapterId, content.trim(), user.id)
      setContent('')
      loadComments()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    )
  }

  const isDark = theme === 'dark'
  const isSepia = theme === 'sepia'

  const borderClass = isDark ? 'border-zinc-800' : isSepia ? 'border-[#e6dcc0]' : 'border-zinc-200'
  const bgClass = isDark ? 'bg-zinc-900/50' : isSepia ? 'bg-[#e6dcc0]/30' : 'bg-zinc-100/50'
  const textMutedClass = isDark ? 'text-zinc-400' : isSepia ? 'text-[#8c7457]' : 'text-zinc-500'

  return (
    <div className={cn('mt-16 pt-10 border-t', borderClass)}>
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare
          className={cn(
            'w-6 h-6',
            isDark ? 'text-lime-400' : isSepia ? 'text-[#5b4636]' : 'text-black',
          )}
        />
        <h3 className="text-2xl font-bold">Comentários</h3>
        <span
          className={cn(
            'text-sm px-2.5 py-0.5 rounded-full font-medium',
            isDark
              ? 'bg-zinc-800 text-zinc-300'
              : isSepia
                ? 'bg-[#e6dcc0] text-[#5b4636]'
                : 'bg-zinc-200 text-black',
          )}
        >
          {comments.length}
        </span>
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-10 flex gap-4">
          <Avatar className={cn('w-10 h-10 border', borderClass)}>
            <AvatarImage src={`https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`} />
            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que você achou deste capítulo?"
              className={cn(
                'resize-none focus:ring-1',
                bgClass,
                borderClass,
                isDark
                  ? 'focus:border-lime-400 focus:ring-lime-400'
                  : 'focus:border-black focus:ring-black',
              )}
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!content.trim() || submitting}
                className={cn(
                  'font-bold',
                  isDark
                    ? 'bg-lime-400 text-black hover:bg-lime-500'
                    : 'bg-black text-white hover:bg-black/80',
                )}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Postar Comentário'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className={cn('mb-10 p-6 rounded-xl text-center border', bgClass, borderClass)}>
          <p className={cn('mb-4', textMutedClass)}>Faça login para comentar.</p>
          <Button
            onClick={() => setIsAuthOpen(true)}
            variant="outline"
            className={cn(
              isDark
                ? 'border-lime-400 text-lime-400 hover:bg-lime-400 hover:text-black'
                : 'border-black text-black hover:bg-black hover:text-white',
            )}
          >
            Fazer Login
          </Button>
          <AuthModal isOpen={isAuthOpen} onOpenChange={setIsAuthOpen} />
        </div>
      )}

      <div className="space-y-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4">
            <Avatar className={cn('w-10 h-10 border', borderClass)}>
              <AvatarImage
                src={`https://img.usecurling.com/ppl/thumbnail?seed=${comment.expand?.user?.id}`}
              />
              <AvatarFallback>{comment.expand?.user?.name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="font-bold text-sm">{comment.expand?.user?.name || 'Usuário'}</span>
                <span className={cn('text-xs', textMutedClass)}>
                  {formatDistanceToNow(new Date(comment.created), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}

        {comments.length === 0 && (
          <div className={cn('text-center py-10', textMutedClass)}>
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </div>
        )}
      </div>
    </div>
  )
}
