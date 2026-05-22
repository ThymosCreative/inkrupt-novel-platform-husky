import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getCoverUrl } from '@/services/api'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Save,
  Plus,
  ExternalLink,
  Image as ImageIcon,
  CheckCircle2,
  Edit,
  Coins,
} from 'lucide-react'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export default function StudioNovel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [novel, setNovel] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: '',
    type: '',
    genres: [] as string[],
  })

  const [genreInput, setGenreInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    if (!id) return
    try {
      const record = await pb.collection('novels').getOne(id)
      setNovel(record)
      setFormData({
        title: record.title || '',
        description: record.description || '',
        status: record.status || 'Em Andamento',
        type: record.type || 'Original',
        genres: record.genres || [],
      })

      const chaps = await pb.collection('chapters').getFullList({
        filter: `novel = "${id}"`,
        sort: '-chapter_number',
      })
      setChapters(chaps)
    } catch (err) {
      console.error(err)
      navigate('/studio')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('chapters', (e) => {
    if (e.record.novel === id) loadData()
  })
  useRealtime('novels', (e) => {
    if (e.record.id === id) loadData()
  })

  const addGenre = () => {
    const val = genreInput.trim()
    if (val && !formData.genres.includes(val)) {
      setFormData((prev) => ({ ...prev, genres: [...prev.genres, val] }))
    }
    setGenreInput('')
  }

  const removeGenre = (g: string) => {
    setFormData((prev) => ({ ...prev, genres: prev.genres.filter((x) => x !== g) }))
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    setErrors({})
    try {
      const data = new FormData()
      data.append('title', formData.title)
      data.append('description', formData.description)
      data.append('status', formData.status)
      data.append('type', formData.type)
      data.append('genres', JSON.stringify(formData.genres))

      if (fileInputRef.current?.files?.[0]) {
        data.append('cover', fileInputRef.current.files[0])
      }

      await pb.collection('novels').update(id, data)
      toast({ title: 'Obra salva com sucesso' })
    } catch (err) {
      setErrors(extractFieldErrors(err))
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const createChapter = async () => {
    if (!id) return
    try {
      const nextNum = chapters.length > 0 ? chapters[0].chapter_number + 1 : 1
      const record = await pb.collection('chapters').create({
        novel: id,
        title: `Capítulo ${nextNum}`,
        chapter_number: nextNum,
        status: 'draft',
      })
      navigate(`/studio/novel/${id}/chapter/${record.id}`)
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao criar capítulo', variant: 'destructive' })
    }
  }

  if (loading) return <div className="p-12 text-center">Carregando...</div>
  if (!novel) return null

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to="/studio">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold line-clamp-1">{novel.title}</h1>
        </div>
        <Button variant="outline" asChild className="rounded-xl hidden sm:flex gap-2">
          <Link to={`/novel/${id}`}>
            <ExternalLink className="w-4 h-4" /> Ver Obra
          </Link>
        </Button>
        <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="mb-6 w-full justify-start h-auto p-1 bg-muted/50 rounded-xl overflow-x-auto">
          <TabsTrigger value="details" className="rounded-lg px-6 py-2.5">
            Detalhes
          </TabsTrigger>
          <TabsTrigger value="chapters" className="rounded-lg px-6 py-2.5">
            Capítulos ({chapters.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid md:grid-cols-[240px_1fr] gap-8">
            <div className="space-y-4">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden border bg-muted relative group">
                <img
                  src={novel.tempCover || getCoverUrl(novel)}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" /> Alterar Capa
                  </Button>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    const url = URL.createObjectURL(e.target.files[0])
                    setNovel((prev: any) => ({ ...prev, tempCover: url }))
                  }
                }}
              />
              {errors.cover && <p className="text-sm text-destructive">{errors.cover}</p>}
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl"
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label>Sinopse</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl min-h-[150px]"
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                      <SelectItem value="Hiato">Hiato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Original">Original</SelectItem>
                      <SelectItem value="Tradução">Tradução</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gêneros</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                    className="rounded-xl"
                    placeholder="Adicionar gênero..."
                  />
                  <Button
                    type="button"
                    onClick={addGenre}
                    variant="secondary"
                    className="rounded-xl"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.genres.map((g) => (
                    <Badge
                      key={g}
                      variant="secondary"
                      className="px-3 py-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => removeGenre(g)}
                    >
                      {g} &times;
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="chapters">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold">Capítulos</h2>
            <Button onClick={createChapter} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Novo Capítulo
            </Button>
          </div>

          {chapters.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
              <p className="text-muted-foreground">Nenhum capítulo ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chapters.map((chap) => (
                <Link
                  key={chap.id}
                  to={`/studio/novel/${id}/chapter/${chap.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border bg-card hover:border-primary transition-colors group"
                >
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">
                      {chap.chapter_number}. {chap.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm">
                      <span
                        className={
                          chap.status === 'published'
                            ? 'text-green-600 font-medium flex items-center gap-1'
                            : 'text-orange-500 font-medium flex items-center gap-1'
                        }
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {chap.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                      {chap.is_premium && (
                        <span className="text-amber-500 font-medium flex items-center gap-1">
                          • <Coins className="w-3 h-3" /> Premium
                        </span>
                      )}
                      {chap.published_at && (
                        <span className="text-muted-foreground">
                          • {new Date(chap.published_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground group-hover:text-primary"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
