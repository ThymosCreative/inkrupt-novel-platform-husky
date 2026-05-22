import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { BookPlus, LayoutDashboard, PenTool, Save, Send, List, Trash2, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { Link } from 'react-router-dom'

export default function Author() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('chapters')
  const [novels, setNovels] = useState<any[]>([])
  const [selectedNovelId, setSelectedNovelId] = useState<string>('')

  const [chapters, setChapters] = useState<any[]>([])
  const [editingChapter, setEditingChapter] = useState<any>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [chapterNumber, setChapterNumber] = useState<number>(1)
  const [isPremium, setIsPremium] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      pb.collection('novels')
        .getFullList({ filter: `author = "${user.id}"` })
        .then((res) => {
          setNovels(res)
          if (res.length > 0 && !selectedNovelId) {
            setSelectedNovelId(res[0].id)
          }
        })
    }
  }, [user])

  useEffect(() => {
    if (selectedNovelId) {
      fetchChapters()
    } else {
      setChapters([])
    }
  }, [selectedNovelId])

  const fetchChapters = () => {
    pb.collection('chapters')
      .getFullList({ filter: `novel = "${selectedNovelId}"`, sort: 'chapter_number' })
      .then((res) => setChapters(res))
      .catch((err) => console.error(err))
  }

  const handleCreateNew = () => {
    setEditingChapter(null)
    setTitle('')
    setContent('')
    setChapterNumber(chapters.length > 0 ? chapters[chapters.length - 1].chapter_number + 1 : 1)
    setIsPremium(false)
    setActiveTab('editor')
  }

  const handleEdit = (chapter: any) => {
    setEditingChapter(chapter)
    setTitle(chapter.title)
    setContent(chapter.content)
    setChapterNumber(chapter.chapter_number)
    setIsPremium(chapter.is_premium || false)
    setActiveTab('editor')
  }

  const handleDelete = async (chapterId: string) => {
    if (confirm('Tem certeza que deseja excluir este capítulo?')) {
      try {
        await pb.collection('chapters').delete(chapterId)
        toast({ title: 'Capítulo excluído' })
        fetchChapters()
      } catch (err) {
        toast({ title: 'Erro ao excluir', variant: 'destructive' })
      }
    }
  }

  const handleSave = async (status: 'draft' | 'published') => {
    if (!selectedNovelId) return toast({ title: 'Selecione uma obra', variant: 'destructive' })
    if (!title.trim() || !content.trim())
      return toast({ title: 'Preencha todos os campos', variant: 'destructive' })

    setIsSaving(true)
    const data = {
      novel: selectedNovelId,
      title,
      content,
      chapter_number: chapterNumber,
      is_premium: isPremium,
      status,
      ...(status === 'published' ? { published_at: new Date().toISOString() } : {}),
    }

    try {
      if (editingChapter) {
        await pb.collection('chapters').update(editingChapter.id, data)
        toast({ title: 'Capítulo atualizado com sucesso' })
      } else {
        await pb.collection('chapters').create(data)
        toast({ title: 'Capítulo criado com sucesso' })
      }
      fetchChapters()
      setActiveTab('chapters')
    } catch (err: any) {
      toast({ title: 'Erro ao salvar capítulo', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const sidebarItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', link: '/dashboard' },
    { id: 'chapters', icon: List, label: 'Capítulos' },
    { id: 'editor', icon: PenTool, label: 'Editor' },
  ]

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/20 flex-shrink-0 hidden md:block">
        <div className="p-6">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">
            Centro de Criação
          </h2>
          <div className="mb-6">
            <Label className="text-xs mb-2 block">Obra Selecionada</Label>
            <select
              value={selectedNovelId}
              onChange={(e) => setSelectedNovelId(e.target.value)}
              className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {novels.length === 0 && <option value="">Nenhuma obra</option>}
              {novels.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
          <nav className="space-y-1">
            {sidebarItems.map((item) =>
              item.link ? (
                <Link
                  key={item.id}
                  to={item.link}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'editor' && activeTab !== 'editor') handleCreateNew()
                    else setActiveTab(item.id)
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                    activeTab === item.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ),
            )}
          </nav>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {novels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
            <BookPlus className="w-16 h-16 opacity-20" />
            <p>Você ainda não possui obras. Crie uma obra primeiro para adicionar capítulos.</p>
          </div>
        ) : activeTab === 'chapters' ? (
          <div className="max-w-5xl mx-auto animate-in fade-in">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold">Capítulos</h1>
              <Button onClick={handleCreateNew} className="font-bold">
                <PenTool className="w-4 h-4 mr-2" /> Novo Capítulo
              </Button>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              {chapters.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhum capítulo encontrado.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nº</th>
                      <th className="px-4 py-3 font-medium">Título</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {chapters.map((chapter) => (
                      <tr key={chapter.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{chapter.chapter_number}</td>
                        <td className="px-4 py-3">{chapter.title}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              chapter.status === 'published'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {chapter.status === 'published' ? 'Publicado' : 'Rascunho'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(chapter)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDelete(chapter.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : activeTab === 'editor' ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold">
                {editingChapter ? 'Editar Capítulo' : 'Criar Capítulo'}
              </h1>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => handleSave('draft')}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="w-4 h-4 mr-2" /> Rascunho
                </Button>
                <Button
                  onClick={() => handleSave('published')}
                  disabled={isSaving}
                  className="font-bold flex-1 sm:flex-none"
                >
                  <Send className="w-4 h-4 mr-2" /> Publicar
                </Button>
              </div>
            </div>

            <div className="space-y-6 bg-card p-6 md:p-8 rounded-2xl border shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-2">
                  <Label htmlFor="title">Título do Capítulo</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: O Confronto"
                    className="text-lg py-5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chapterNumber">Número</Label>
                  <Input
                    id="chapterNumber"
                    type="number"
                    min="1"
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                    className="text-lg py-5"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2 pb-4">
                <Switch id="premium" checked={isPremium} onCheckedChange={setIsPremium} />
                <Label htmlFor="premium" className="cursor-pointer">
                  Capítulo Premium (Exige moedas para ler)
                </Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content">Conteúdo</Label>
                  <span className="text-xs text-muted-foreground">
                    {content.trim().split(/\s+/).filter(Boolean).length} palavras
                  </span>
                </div>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva sua história aqui..."
                  className="min-h-[400px] text-base resize-y font-serif leading-relaxed"
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
