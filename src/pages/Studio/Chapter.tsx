import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, ExternalLink, Type, Hash } from 'lucide-react'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { Coins } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { RichTextEditor } from '@/components/ui/rich-text-editor'

/**
 * Strip inline styles/attributes injected by external editors (Google Docs, Word, etc.)
 * that cause visual artefacts like white paragraph backgrounds on dark themes.
 * Bold/italic/underline are carried by HTML tags, not inline styles, so they survive.
 */
function sanitizeHtml(html: string): string {
  if (!html) return ''
  return html
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+bgcolor="[^"]*"/gi, '')
    .replace(/\s+color="[^"]*"/gi, '')
    .replace(/\s+face="[^"]*"/gi, '')
    .replace(/\s+size="[^"]*"/gi, '')
    .replace(/<font[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
}

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
    is_premium: false,
    coin_price: 0,
  })

  useEffect(() => {
    if (!chapterId) return
    pb.collection('chapters')
      .getOne(chapterId, { expand: 'novel' })
      .then((record) => {
        setChapter(record)
        setFormData((prev) => ({
          title: record.title || '',
          // If the API returns empty content but we already have content in the editor
          // (e.g. enrich_chapters hook stripped it for a published premium chapter),
          // keep the existing editor content rather than wiping it.
          content: sanitizeHtml(record.content || '') || prev.content || '',
          chapter_number: record.chapter_number || 1,
          status: record.status || 'draft',
          is_premium: !!record.is_premium,
          coin_price: record.coin_price || 0,
        }))
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
      const dataToSave: any = { ...formData }
      if (dataToSave.status === 'published' && !chapter?.published_at) {
        dataToSave.published_at = new Date().toISOString()
      }
      const updated = await pb
        .collection('chapters')
        .update(chapterId, dataToSave, { expand: 'novel' })
      setChapter(updated)
      // After save, sync formData with server response — but preserve content
      // if the server returned it empty (hook stripping for published premium chapters)
      setFormData((prev) => ({
        ...prev,
        title: updated.title || prev.title,
        content: updated.content || prev.content,
        chapter_number: updated.chapter_number || prev.chapter_number,
        status: updated.status || prev.status,
        is_premium: !!updated.is_premium,
        coin_price: updated.coin_price || 0,
      }))
      toast({ title: 'Capítulo salvo com sucesso' })
    } catch (err) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar capítulo', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-12 text-center">Carregando...</div>

  const textContent = formData.content
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  const wordCount = textContent ? textContent.split(/\s+/).length : 0
  const charCount = textContent.length

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl flex flex-col h-[calc(100vh-4rem)] relative">
      <div className="flex items-center gap-4 mb-6 shrink-0 flex-wrap bg-background/95 backdrop-blur z-10 sticky top-0 py-2 border-b">
        <Button variant="ghost" size="icon" asChild className="rounded-full shrink-0">
          <Link to={`/studio/novel/${id}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1 flex flex-col min-w-[200px]">
          <div className="text-xs text-muted-foreground font-medium mb-1 line-clamp-1">
            {chapter?.expand?.novel?.title} • Capítulo {formData.chapter_number}
          </div>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="text-xl font-bold border-none bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto py-0"
            placeholder="Título do Capítulo"
          />
        </div>

        <div className="flex items-center gap-3 bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/20 shrink-0">
          <Label
            htmlFor="premium-mode"
            className="text-sm font-medium text-amber-500 flex items-center gap-1.5 cursor-pointer"
          >
            <Coins className="w-4 h-4" /> Premium
          </Label>
          <Switch
            id="premium-mode"
            checked={formData.is_premium}
            onCheckedChange={(c) => setFormData({ ...formData, is_premium: c })}
          />
          {formData.is_premium && (
            <Input
              type="number"
              value={formData.coin_price}
              onChange={(e) =>
                setFormData({ ...formData, coin_price: parseInt(e.target.value) || 0 })
              }
              className="w-20 h-7 text-xs bg-background"
              placeholder="Coins"
              min="0"
            />
          )}
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
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      {errors.title && <p className="text-sm text-destructive mb-4 shrink-0">{errors.title}</p>}
      {errors.status && <p className="text-sm text-destructive mb-4 shrink-0">{errors.status}</p>}

      <div className="flex-1 flex flex-col min-h-0 bg-card border rounded-2xl overflow-hidden shadow-sm">
        <RichTextEditor
          value={formData.content}
          onChange={(val) => setFormData({ ...formData, content: val })}
          className="flex-1 border-0 rounded-none h-full"
          placeholder="Escreva seu capítulo aqui..."
        />
      </div>
      {errors.content && <p className="text-sm text-destructive mt-2 shrink-0">{errors.content}</p>}

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground shrink-0 border-t pt-4">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <Type className="w-4 h-4" /> {wordCount} palavras
          </span>
          <span className="flex items-center gap-1.5">
            <Hash className="w-4 h-4" /> {charCount} caracteres
          </span>
        </div>
        <div>
          Última alteração:{' '}
          {chapter?.updated ? new Date(chapter.updated).toLocaleString() : 'Não salvo'}
        </div>
      </div>
    </div>
  )
}

