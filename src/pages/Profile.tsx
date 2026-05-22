import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { NovelCard } from '@/components/NovelCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Settings,
  LogOut,
  Loader2,
  BookOpen,
  List as ListIcon,
  Globe,
  Lock,
  CheckCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { topUpCoins } from '@/services/api'
import { Coins } from 'lucide-react'
import { AuthModal } from '@/components/AuthModal'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'

export default function Profile() {
  const { id } = useParams()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profileUser, setProfileUser] = useState<any>(null)
  const [library, setLibrary] = useState<any[]>([])
  const [authoredNovels, setAuthoredNovels] = useState<any[]>([])
  const [readingLists, setReadingLists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateListOpen, setIsCreateListOpen] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDesc, setNewListDesc] = useState('')
  const [newListVis, setNewListVis] = useState('public')
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followRecordId, setFollowRecordId] = useState<string | null>(null)
  const [authorApplication, setAuthorApplication] = useState<any>(null)
  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [applyBio, setApplyBio] = useState('')
  const [applyPortfolio, setApplyPortfolio] = useState('')
  const [isApplying, setIsApplying] = useState(false)

  const isOwnProfile = !id || (user && id === user.id)

  const handleCreateList = async () => {
    if (!newListTitle.trim()) {
      toast.error('O título é obrigatório.')
      return
    }
    setIsCreatingList(true)
    try {
      const newList = await pb.collection('reading_lists').create({
        user: user?.id,
        title: newListTitle,
        description: newListDesc,
        visibility: newListVis,
      })
      setReadingLists([newList, ...readingLists])
      setIsCreateListOpen(false)
      setNewListTitle('')
      setNewListDesc('')
      setNewListVis('public')
      toast.success('Lista criada com sucesso!')
    } catch (e) {
      toast.error('Erro ao criar lista.')
    } finally {
      setIsCreatingList(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true)
        const targetId = id || user?.id
        if (!targetId) {
          navigate('/')
          return
        }

        const u = await pb.collection('users').getOne(targetId)
        setProfileUser(u)

        const [libRes, novelsRes, listsRes, followRes, appRes] = await Promise.all([
          pb
            .collection('library_entries')
            .getFullList({ filter: `user = "${targetId}"`, expand: 'novel,last_chapter' }),
          pb.collection('novels').getFullList({ filter: `author = "${targetId}"` }),
          pb.collection('reading_lists').getFullList({
            filter: `user = "${targetId}"${id && id !== user?.id ? ' && visibility = "public"' : ''}`,
            sort: '-created',
          }),
          !isOwnProfile && user
            ? pb
                .collection('author_follows')
                .getList(1, 1, { filter: `follower="${user.id}" && author="${targetId}"` })
                .catch(() => null)
            : Promise.resolve(null),
          (!id || id === user?.id) && user && !user.is_author
            ? getAuthorApplication(user.id)
            : Promise.resolve(null),
        ])

        setLibrary(libRes)
        setAuthoredNovels(novelsRes)
        setReadingLists(listsRes)
        if (appRes) setAuthorApplication(appRes)

        if (followRes && followRes.items.length > 0) {
          setIsFollowing(true)
          setFollowRecordId(followRes.items[0].id)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [id, user, navigate])

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const handleApplySubmit = async () => {
    if (!applyBio.trim()) {
      toast.error('A biografia é obrigatória.')
      return
    }
    if (!user) return
    setIsApplying(true)
    try {
      const app = await createAuthorApplication(user.id, applyBio, applyPortfolio)
      setAuthorApplication(app)
      setIsApplyOpen(false)
      toast.success('Aplicação enviada com sucesso!')
    } catch (e) {
      toast.error('Erro ao enviar aplicação.')
    } finally {
      setIsApplying(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!user) {
      setIsAuthOpen(true)
      return
    }
    if (isOwnProfile || !profileUser) return
    try {
      if (isFollowing && followRecordId) {
        await pb.collection('author_follows').delete(followRecordId)
        setIsFollowing(false)
        setFollowRecordId(null)
        toast.success('Deixou de seguir.')
      } else {
        const res = await pb
          .collection('author_follows')
          .create({ follower: user.id, author: profileUser.id })
        setIsFollowing(true)
        setFollowRecordId(res.id)
        toast.success('Seguindo autor!')
      }
    } catch (e) {
      toast.error('Erro ao seguir autor')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Usuário não encontrado.
      </div>
    )
  }

  const reading = library.filter((e) => e.status === 'reading')
  const plan = library.filter((e) => e.status === 'plan_to_read')
  const completed = library.filter((e) => e.status === 'completed')

  return (
    <div className="pb-20">
      {/* Banner */}
      <div className="h-48 bg-muted w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
        <div className="absolute inset-0 bg-primary/5 opacity-50" />
      </div>

      <div className="container mx-auto px-4 relative z-20">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-12 -mt-16 md:ml-6">
          <Avatar className="w-32 h-32 border-4 border-background bg-card shadow-xl relative z-20">
            <AvatarImage
              src={
                profileUser?.avatar
                  ? pb.files.getURL(profileUser, profileUser.avatar)
                  : `https://img.usecurling.com/ppl/thumbnail?seed=${profileUser?.id}`
              }
            />
            <AvatarFallback>{profileUser?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">
                {profileUser?.name || profileUser?.email?.split('@')[0] || 'Usuário'}
              </h1>
              {profileUser?.is_author && (
                <Badge variant="outline" className="text-lime-400 border-lime-400 bg-lime-400/10">
                  <CheckCircle className="w-4 h-4 mr-1" /> Autor Verificado
                </Badge>
              )}
            </div>
            {profileUser.bio && (
              <p className="text-muted-foreground text-sm max-w-2xl mt-2">{profileUser.bio}</p>
            )}
            {!isOwnProfile && profileUser?.is_author && (
              <Button
                onClick={handleFollowToggle}
                variant={isFollowing ? 'outline' : 'default'}
                className={`mt-4 ${!isFollowing ? 'bg-lime-400 text-black hover:bg-lime-500 font-bold' : 'border-lime-400 text-lime-400 hover:bg-lime-400/10'}`}
              >
                {isFollowing ? 'Seguindo' : 'Seguir Autor'}
              </Button>
            )}
          </div>
          {isOwnProfile && (
            <div className="flex gap-3 shrink-0 flex-wrap justify-center md:justify-end">
              {isOwnProfile && (
                <Button
                  onClick={async () => {
                    try {
                      await topUpCoins(user.id, 500)
                      toast.success('Adicionado 500 Moedas!')
                    } catch (e) {
                      toast.error('Erro ao adicionar moedas.')
                    }
                  }}
                  variant="outline"
                  className="rounded-xl border-amber-500 text-amber-500 hover:bg-amber-500/10"
                >
                  <Coins className="w-4 h-4 mr-2" /> Top Up (+500)
                </Button>
              )}
              {!profileUser.is_author &&
                (authorApplication ? (
                  <Badge
                    variant="outline"
                    className="h-10 px-4 rounded-xl bg-amber-500/10 text-amber-500 border-amber-500 flex items-center justify-center"
                  >
                    Aplicação Pendente
                  </Badge>
                ) : (
                  <Button
                    onClick={() => setIsApplyOpen(true)}
                    className="h-10 bg-lime-400 text-black hover:bg-lime-500 rounded-xl font-bold"
                  >
                    Tornar-se Autor
                  </Button>
                ))}
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate('/settings')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <Tabs defaultValue="library" className="w-full">
          <TabsList className="bg-transparent border-b w-full justify-start rounded-none h-auto p-0 mb-8">
            <TabsTrigger
              value="library"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 py-3 text-base text-muted-foreground"
            >
              Biblioteca ({library.length})
            </TabsTrigger>
            {authoredNovels.length > 0 && (
              <TabsTrigger
                value="authored"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 py-3 text-base text-muted-foreground"
              >
                Obras ({authoredNovels.length})
              </TabsTrigger>
            )}
            <TabsTrigger
              value="lists"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-6 py-3 text-base text-muted-foreground"
            >
              Listas ({readingLists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="animate-in fade-in">
            <div className="space-y-12">
              {reading.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" /> Lendo
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {reading.map((entry) => (
                      <div key={entry.id} className="relative group">
                        <NovelCard novel={entry.expand?.novel} />
                        {entry.expand?.last_chapter && (
                          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-primary border">
                            Cap. {entry.expand.last_chapter.chapter_number}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {plan.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Quero Ler</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {plan.map((entry) => (
                      <NovelCard key={entry.id} novel={entry.expand?.novel} />
                    ))}
                  </div>
                </div>
              )}

              {completed.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-4">Concluídos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {completed.map((entry) => (
                      <NovelCard key={entry.id} novel={entry.expand?.novel} />
                    ))}
                  </div>
                </div>
              )}

              {library.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  A biblioteca está vazia.
                </div>
              )}
            </div>
          </TabsContent>

          {authoredNovels.length > 0 && (
            <TabsContent value="authored" className="animate-in fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                {authoredNovels.map((novel) => (
                  <NovelCard key={novel.id} novel={novel} />
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="lists" className="animate-in fade-in">
            {isOwnProfile && (
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Suas Listas</h3>
                <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <ListIcon className="w-4 h-4 mr-2" /> Nova Lista
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                    <DialogHeader>
                      <DialogTitle>Criar Nova Lista</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Título</label>
                        <Input
                          value={newListTitle}
                          onChange={(e) => setNewListTitle(e.target.value)}
                          placeholder="Ex: Melhores de Cultivo"
                          className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-lime-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Descrição</label>
                        <Textarea
                          value={newListDesc}
                          onChange={(e) => setNewListDesc(e.target.value)}
                          placeholder="Uma breve descrição..."
                          className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-lime-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Visibilidade</label>
                        <Select value={newListVis} onValueChange={setNewListVis}>
                          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white focus:ring-lime-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                            <SelectItem value="public" className="focus:bg-zinc-800 cursor-pointer">
                              Pública (Todos podem ver)
                            </SelectItem>
                            <SelectItem
                              value="private"
                              className="focus:bg-zinc-800 cursor-pointer"
                            >
                              Privada (Apenas eu)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setIsCreateListOpen(false)}
                        className="hover:bg-zinc-800 hover:text-white"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateList}
                        disabled={isCreatingList}
                        className="bg-lime-400 text-black hover:bg-lime-500 font-bold"
                      >
                        {isCreatingList && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Criar Lista
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {readingLists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {readingLists.map((list) => (
                  <Link key={list.id} to={`/list/${list.id}`} className="block group">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 h-full transition-all group-hover:border-lime-400 group-hover:shadow-md">
                      <div className="flex items-start justify-between mb-4">
                        <div className="bg-lime-400/10 text-lime-400 p-3 rounded-xl">
                          <ListIcon className="w-6 h-6" />
                        </div>
                        {list.visibility === 'public' ? (
                          <div className="flex items-center text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
                            <Globe className="w-3 h-3 mr-1" /> Público
                          </div>
                        ) : (
                          <div className="flex items-center text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md">
                            <Lock className="w-3 h-3 mr-1" /> Privado
                          </div>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-lime-400 transition-colors line-clamp-1">
                        {list.title}
                      </h3>
                      {list.description && (
                        <p className="text-zinc-400 text-sm line-clamp-2">{list.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500">
                Nenhuma lista de leitura encontrada.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <AuthModal isOpen={isAuthOpen} onOpenChange={setIsAuthOpen} />

      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Tornar-se Autor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Biografia / Motivação</label>
              <Textarea
                value={applyBio}
                onChange={(e) => setApplyBio(e.target.value)}
                placeholder="Conte-nos por que você quer ser um autor..."
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-lime-400 min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">
                Link do Portfólio (Opcional)
              </label>
              <Input
                value={applyPortfolio}
                onChange={(e) => setApplyPortfolio(e.target.value)}
                placeholder="https://..."
                className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-lime-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsApplyOpen(false)}
              className="hover:bg-zinc-800 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplySubmit}
              disabled={isApplying}
              className="bg-lime-400 text-black hover:bg-lime-500 font-bold"
            >
              {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Aplicação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
