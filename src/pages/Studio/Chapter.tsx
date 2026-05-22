import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, ExternalLink } from 'lucide-react'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

export default function StudioChapter() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [chapter, setChapter] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    chapter_number: 1,
    status: 'draft',
  })

  useEffect(() => {
    if (!chapterId) return
    pb.collection('chapters')
      .getOne(chapterId)
      .then((record) => {
        setChapter(record)
        setFormData({
          title: record.title || '',
          content: record.content || '',
          chapter_number: record.chapter_number || 1,
          status: record.status || 'draft',
        })
      })
      .catch((err) => {
        console.error(err)
        navigate(`/studio/novel/${id}`)
      })
      .finally(() => setLoading(false))
  }, [chapterId, id, navigate])

  const handleSave = async () => {
    if (!chapterId) return
    setSaving(true)
    setErrors({})
    try {
      await pb.collection('chapters').update(chapterId, formData)
      toast({ title: 'Capítulo salvo com sucesso' })
    } catch (err) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar capítulo', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center">Carregando...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center gap-4 mb-6 shrink-0 flex-wrap">
        <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
          <Link to={`/studio/novel/${id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 flex items-center gap-4 min-w-[200px]">
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="text-xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto"
            placeholder="Título do Capítulo"
          />
        </div>

        <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border shrink-0">
          <Label htmlFor="publish-mode" className="text-sm font-medium cursor-pointer">
            Publicado
          </Label>
          <Switch
            id="publish-mode"
            checked={formData.status === 'published'}
            onCheckedChange={(c) => setFormData({ ...formData, status: c ? 'published' : 'draft' })}
          />
        </div>

        <Button variant="outline" asChild className="rounded-xl hidden sm:flex gap-2 shrink-0">
          <Link to={`/novel/${id}/chapter/${formData.chapter_number}`}>
            <ExternalLink className="w-4 h-4" /> Ler
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2 shrink-0">
          <Save className="w-4 h-4" /> {saving ? '...' : 'Salvar'}
        </Button>
      </div>

      {errors.title && <p className="text-sm text-destructive mb-4 shrink-0">{errors.title}</p>}
      {errors.status && <p className="text-sm text-destructive mb-4 shrink-0">{errors.status}</p>}

      <div className="flex-1 flex flex-col min-h-0 bg-card border rounded-2xl overflow-hidden shadow-sm">
        <Textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          className="flex-1 resize-none border-0 focus-visible:ring-0 rounded-none p-6 md:p-8 text-base md:text-lg leading-relaxed font-serif"
          placeholder="Escreva seu capítulo aqui..."
        />
      </div>
      {errors.content && <p className="text-sm text-destructive mt-2 shrink-0">{errors.content}</p>}
    </div>
  )
}
