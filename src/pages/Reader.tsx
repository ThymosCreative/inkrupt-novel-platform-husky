import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getNovel, getChapterByNum, getChapters, getChapterCost } from '@/services/api'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Settings,
  List,
  Bookmark,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Coins,
  Lock,
  Zap,
  BookmarkCheck,
  Check,
  X,
  Gift,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChapterComments } from '@/components/ChapterComments'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'

export default function Reader() {
  const { id, num } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { wallet, votes, voteNovel, unlockChapter } = useWallet()
  const chapterNum = parseInt(num || '1', 10)

  const [novel, setNovel] = useState<any>(null)
  const [chapter, setChapter] = useState<any>(null)
  const [chaptersList, setChaptersList] = useState<any[]>([])
  const [totalChapters, setTotalChapters] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isUnlockedLocal, setIsUnlockedLocal] = useState(false)
  const [progress, setProgress] = useState(0)

  const [isBookmarked, setIsBookmarked] = useState(false)
  const [libraryEntryId, setLibraryEntryId] = useState<string | null>(null)

  const [activeDrawer, setActiveDrawer] = useState<'settings' | 'list' | 'comments' | null>(null)
  const [showUI, setShowUI] = useState(true)

  const [settings, setSettings] = useState({
    theme: user?.preferences?.theme || 'dark',
    fontFamily: user?.preferences?.fontFamily || 'sans',
    fontSize: user?.preferences?.fontSize || 18,
    lineHeight: user?.preferences?.lineHeight || 'normal',
    paragraphComments: user?.preferences?.paragraphComments || false,
  })

  useEffect(() => {
    if (user?.preferences) {
      setSettings((s) => ({ ...s, ...user.preferences }))
    }
  }, [user?.preferences])

  const updateSetting = (key: string, value: string | number | boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    if (user) {
      pb.collection('users').update(user.id, { preferences: newSettings }).catch(console.error)
    }
  }

  const lineHeightMap: Record<string, number> = { normal: 1.6, wide: 2.0 }

  useEffect(() => {
    let timeout: NodeJS.Timeout
    const resetTimer = () => {
      setShowUI(true)
      clearTimeout(timeout)
      timeout = setTimeout(() => setShowUI(false), 3000)
    }

    window.addEventListener('mousemove', resetTimer)
    window.addEventListener('scroll', resetTimer)
    window.addEventListener('keydown', resetTimer)
    window.addEventListener('click', resetTimer)

    resetTimer()

    return () => {
      window.removeEventListener('mousemove', resetTimer)
      window.removeEventListener('scroll', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      window.removeEventListener('click', resetTimer)
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (id && num) {
      setLoading(true)
      Promise.all([getNovel(id), getChapterByNum(id, chapterNum), getChapters(id)])
        .then(async ([n, c, clist]) => {
          setNovel(n)
          setChapter(c)
          setChaptersList(clist.sort((a: any, b: any) => a.chapter_number - b.chapter_number))
          setTotalChapters(clist.length)

          if (user && c) {
            if (n.author === user.id) {
              setIsUnlockedLocal(true)
            } else if (!c.is_premium) {
              setIsUnlockedLocal(true)
            } else {
              try {
                await pb
                  .collection('unlocked_chapters')
                  .getFirstListItem(`user="${user.id}" && chapter="${c.id}"`)
                setIsUnlockedLocal(true)
              } catch {
                setIsUnlockedLocal(false)
              }
            }
          } else {
            setIsUnlockedLocal(!c?.is_premium)
          }

          setLoading(false)
          window.scrollTo(0, 0)

          if (user && c) {
            pb.collection('library_entries')
              .getFullList({ filter: `user = "${user.id}" && novel = "${id}"` })
              .then((entries) => {
                if (entries.length > 0) {
                  setIsBookmarked(true)
                  setLibraryEntryId(entries[0].id)
                  if (entries[0].last_chapter !== c.id || entries[0].status !== 'reading') {
                    pb.collection('library_entries')
                      .update(entries[0].id, { last_chapter: c.id, status: 'reading' })
                      .catch(console.error)
                  }
                }
              })
              .catch(console.error)
          }
        })
        .catch((err) => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [id, num, user?.id])

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop
      const windowHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight
      const scroll = windowHeight > 0 ? (totalScroll / windowHeight) * 100 : 0
      setProgress(Number(scroll))
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleBookmark = async () => {
    if (!user) {
      toast.error('Faça login para salvar na biblioteca')
      return
    }
    if (isBookmarked && libraryEntryId) {
      await pb.collection('library_entries').delete(libraryEntryId)
      setIsBookmarked(false)
      setLibraryEntryId(null)
      toast('Removido da biblioteca', {
        style: { backgroundColor: '#18181b', borderColor: '#27272a', color: 'white' },
        duration: 3000,
      })
    } else {
      const record = await pb.collection('library_entries').create({
        user: user.id,
        novel: id,
        status: 'reading',
        last_chapter: chapter.id,
      })
      setIsBookmarked(true)
      setLibraryEntryId(record.id)
      toast('Adicionado à biblioteca', {
        icon: <Check className="w-4 h-4 text-white" />,
        style: { backgroundColor: '#18181b', borderColor: '#27272a', color: 'white' },
        duration: 3000,
      })
    }
  }

  const toggleDrawer = (drawer: 'settings' | 'list' | 'comments') => {
    setActiveDrawer((prev) => (prev === drawer ? null : drawer))
  }

  const hasVoted = votes.some(
    (v: any) => v.novel_id === novel?.id && v.voted_at > new Date().setHours(0, 0, 0, 0),
  )

  const sidebarBtnClass = (isActive: boolean) =>
    cn(
      'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200',
      settings.theme === 'light' || settings.theme === 'sepia'
        ? isActive
          ? 'bg-[#D4C4A8] text-[#3D2B1F]'
          : 'text-[#8B7355] hover:bg-[#D4C4A8] hover:text-[#3D2B1F]'
        : isActive
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-500 hover:bg-zinc-800 hover:text-white',
    )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!chapter || !novel) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Capítulo não encontrado</h2>
          <Link
            to={`/novel/${id}`}
            className="text-zinc-400 hover:text-white hover:underline transition-colors"
          >
            Voltar para a obra
          </Link>
        </div>
      </div>
    )
  }

  const themeClasses = {
    dark: 'bg-black text-slate-300',
    sepia: 'bg-[#F2E8D9] text-[#3D2B1F]',
    light: 'bg-white text-black',
  }

  const headerThemeClasses = {
    dark: 'bg-black/90 border-slate-900',
    sepia: 'bg-[#EBE0CE]/90 border-[#D4C4A8]',
    light: 'bg-white/90 border-zinc-200',
  }

  const isAuthor = user && novel?.author === user.id
  const isLocked = !isAuthor && chapter.is_premium && !isUnlockedLocal

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-500 pb-32 overflow-x-hidden',
        themeClasses[settings.theme as keyof typeof themeClasses] || themeClasses.dark,
      )}
    >
      <div className="fixed top-0 left-0 w-full h-0.5 bg-black/10 z-50">
        <div
          className="h-full bg-white opacity-30 transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header
        className={cn(
          'fixed top-0 z-40 w-full backdrop-blur-md border-b transition-opacity duration-300',
          headerThemeClasses[settings.theme as keyof typeof headerThemeClasses] ||
            headerThemeClasses.dark,
          showUI || activeDrawer
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="container mx-auto pl-4 pr-[64px] md:pr-[64px] h-16 flex items-center justify-between max-w-4xl">
          <Link
            to={`/novel/${novel.id}`}
            className="flex items-center gap-3 text-sm font-medium hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-bold truncate max-w-[200px]">{novel.title}</span>
          </Link>
          <div className="text-sm font-bold opacity-70">Capítulo {chapterNum}</div>
          <div className="flex justify-end items-center">
            <Button
              onClick={() => {
                if (!user) {
                  toast.error('Faça login para votar.')
                  return
                }
                voteNovel(novel.id)
              }}
              className={cn(
                'transition-colors rounded-xl px-4 py-2 h-9 font-semibold border',
                hasVoted
                  ? 'bg-zinc-700 border-zinc-600 text-white hover:bg-zinc-600'
                  : 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700',
              )}
            >
              <Zap className={cn('w-4 h-4 mr-1.5', hasVoted ? 'fill-white' : '')} />
              Votar
            </Button>
          </div>
        </div>
      </header>

      {/* Fixed Right Sidebar */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[48px] z-50 flex flex-col items-center py-6 gap-6 transition-colors duration-300',
          settings.theme === 'light' || settings.theme === 'sepia'
            ? 'bg-[#E8DDD0] border-l border-[#C8B89A]'
            : 'bg-zinc-950 border-l border-zinc-800',
        )}
      >
        <button
          onClick={() => toggleDrawer('settings')}
          className={sidebarBtnClass(activeDrawer === 'settings')}
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => toggleDrawer('list')}
          className={sidebarBtnClass(activeDrawer === 'list')}
        >
          <List className="w-5 h-5" />
        </button>
        <button onClick={handleBookmark} className={sidebarBtnClass(isBookmarked)}>
          {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
        </button>
        <button
          onClick={() => toggleDrawer('comments')}
          className={sidebarBtnClass(activeDrawer === 'comments')}
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Drawers Container */}
      <div
        className={cn(
          'fixed top-0 right-[48px] h-full z-40 transition-transform duration-300 transform flex',
          activeDrawer ? 'translate-x-0 shadow-2xl' : 'translate-x-full',
        )}
      >
        {/* Settings Drawer */}
        {activeDrawer === 'settings' && (
          <div
            className={cn(
              'w-[280px] border-l p-6 flex flex-col gap-8 h-full overflow-y-auto',
              settings.theme === 'sepia'
                ? 'bg-[#2C2420] border-[#4A3B32]'
                : 'bg-zinc-900 border-zinc-800',
            )}
          >
            <h3 className="font-bold text-white mb-2">Configurações</h3>

            <div>
              <h4 className="text-sm text-zinc-400 mb-3">Fundo</h4>
              <div className="flex gap-4">
                <button
                  onClick={() => updateSetting('theme', 'dark')}
                  className={cn(
                    'w-10 h-10 rounded-full bg-black border-2 border-zinc-600 outline-none transition-all',
                    settings.theme === 'dark' ? 'ring-2 ring-white' : '',
                  )}
                />
                <button
                  onClick={() => updateSetting('theme', 'sepia')}
                  className={cn(
                    'w-10 h-10 rounded-full bg-[#F2E8D9] border-2 border-[#C8B89A] outline-none transition-all',
                    settings.theme === 'sepia' ? 'ring-2 ring-[#3D2B1F]' : '',
                  )}
                />
                <button
                  onClick={() => updateSetting('theme', 'light')}
                  className={cn(
                    'w-10 h-10 rounded-full bg-white border-2 border-zinc-300 outline-none transition-all',
                    settings.theme === 'light' ? 'ring-2 ring-zinc-900' : '',
                  )}
                />
              </div>
            </div>

            <div>
              <h4 className="text-sm text-zinc-400 mb-3">Fonte</h4>
              <div className="flex bg-zinc-800 rounded-full p-1">
                <button
                  onClick={() => updateSetting('fontFamily', 'sans')}
                  className={cn(
                    'flex-1 py-1.5 rounded-full text-sm font-sans transition-colors',
                    settings.fontFamily === 'sans'
                      ? 'bg-zinc-600 text-white'
                      : 'text-zinc-400 hover:text-white',
                  )}
                >
                  Inter
                </button>
                <button
                  onClick={() => updateSetting('fontFamily', 'serif')}
                  className={cn(
                    'flex-1 py-1.5 rounded-full text-sm font-serif transition-colors',
                    settings.fontFamily === 'serif'
                      ? 'bg-zinc-600 text-white'
                      : 'text-zinc-400 hover:text-white',
                  )}
                >
                  Georgia
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm text-zinc-400 mb-3">Tamanho</h4>
              <div className="flex items-center justify-between bg-zinc-800 rounded-full p-1">
                <button
                  onClick={() => updateSetting('fontSize', Math.max(14, settings.fontSize - 1))}
                  className="w-10 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  A-
                </button>
                <span className="text-white font-medium">{settings.fontSize}</span>
                <button
                  onClick={() => updateSetting('fontSize', Math.min(24, settings.fontSize + 1))}
                  className="w-10 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  A+
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-sm text-zinc-400 mb-3">Espaçamento</h4>
              <div className="flex bg-zinc-800 rounded-full p-1">
                <button
                  onClick={() => updateSetting('lineHeight', 'normal')}
                  className={cn(
                    'flex-1 py-1.5 rounded-full text-sm transition-colors',
                    settings.lineHeight === 'normal'
                      ? 'bg-zinc-600 text-white'
                      : 'text-zinc-400 hover:text-white',
                  )}
                >
                  Normal
                </button>
                <button
                  onClick={() => updateSetting('lineHeight', 'wide')}
                  className={cn(
                    'flex-1 py-1.5 rounded-full text-sm transition-colors',
                    settings.lineHeight === 'wide'
                      ? 'bg-zinc-600 text-white'
                      : 'text-zinc-400 hover:text-white',
                  )}
                >
                  Amplo
                </button>
              </div>
            </div>

            <div
              className={cn(
                'flex items-center justify-between mt-auto pt-4 border-t',
                settings.theme === 'sepia' ? 'border-[#4A3B32]' : 'border-zinc-800',
              )}
            >
              <span className="text-sm text-zinc-300">Comentários de Parágrafo</span>
              <Switch
                checked={settings.paragraphComments}
                onCheckedChange={(c) => updateSetting('paragraphComments', c)}
                className="data-[state=checked]:bg-zinc-500 data-[state=unchecked]:bg-zinc-700"
              />
            </div>
          </div>
        )}

        {/* List Drawer */}
        {activeDrawer === 'list' && (
          <div
            className={cn(
              'w-[320px] flex flex-col h-full border-l shadow-2xl',
              settings.theme === 'sepia'
                ? 'bg-[#2C2420] border-[#4A3B32]'
                : 'bg-zinc-900 border-zinc-800',
            )}
          >
            <div
              className={cn(
                'p-4 flex items-center justify-between border-b',
                settings.theme === 'sepia' ? 'border-[#4A3B32]' : 'border-zinc-800',
              )}
            >
              <h3 className="font-bold text-white truncate pr-4">{novel?.title}</h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-zinc-400 hover:text-white shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className={cn(
                'p-4 border-b',
                settings.theme === 'sepia'
                  ? 'border-[#4A3B32] bg-black/10'
                  : 'border-zinc-800 bg-zinc-900/50',
              )}
            >
              <div className="flex justify-between text-sm mb-2 text-zinc-400">
                <span>Progresso</span>
                <span>
                  Capítulo {chapterNum} de {totalChapters}
                </span>
              </div>
              <Progress
                value={(chapterNum / totalChapters) * 100}
                className="h-2 bg-zinc-800 [&>div]:bg-white"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {chaptersList.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    navigate(`/novel/${id}/chapter/${ch.chapter_number}`)
                    setActiveDrawer(null)
                  }}
                  className={cn(
                    'w-full text-left p-4 border-b flex items-center justify-between transition-colors',
                    settings.theme === 'sepia'
                      ? 'border-[#4A3B32]/50 hover:bg-black/20'
                      : 'border-zinc-800/50 hover:bg-zinc-800/80',
                    ch.chapter_number === chapterNum
                      ? settings.theme === 'sepia'
                        ? 'bg-black/20 border-l-2 border-l-white text-white'
                        : 'bg-zinc-800 border-l-2 border-l-white text-white'
                      : ch.chapter_number < chapterNum
                        ? 'text-zinc-500'
                        : 'text-zinc-300',
                  )}
                >
                  <span className="truncate pr-4 font-medium">
                    {ch.chapter_number}. {ch.title}
                  </span>
                  {ch.is_premium && (
                    <div className="flex items-center gap-1 text-zinc-500 shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                      <span className="text-xs">{ch.coin_price || 0}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments Drawer */}
        {activeDrawer === 'comments' && (
          <ChapterComments
            chapterId={chapter.id}
            novelAuthorId={novel.author}
            theme={settings.theme}
            onClose={() => setActiveDrawer(null)}
          />
        )}
      </div>

      <main className="container mx-auto pl-4 pr-[64px] md:pl-8 md:pr-[64px] mt-24 mb-20 transition-all duration-300 max-w-3xl">
        <h1 className="text-2xl font-semibold mb-12 text-center font-sans tracking-tight">
          {chapter.title}
        </h1>

        {(() => {
          if (isLocked) {
            const { type, cost } = getChapterCost(chapter)

            const handleLocalUnlock = async (method: 'coin' | 'fast_pass') => {
              if (!user) {
                toast.error('Faça login para desbloquear.')
                return
              }
              const success = await unlockChapter(chapter.id, method, cost)
              if (success) {
                setIsUnlockedLocal(true)
                toast.success('Capítulo desbloqueado!')
              } else {
                toast.error(
                  method === 'coin' ? 'Coins insuficientes.' : 'Fast Passes insuficientes.',
                )
              }
            }

            return (
              <div className="bg-zinc-900/50 border border-border rounded-2xl p-8 text-center flex flex-col items-center max-w-lg mx-auto text-white">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-zinc-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Capítulo Bloqueado</h2>
                {type === 'privilege' && (
                  <Badge className="bg-white text-black mb-4 font-black">PRIVILEGE</Badge>
                )}
                <p className="text-zinc-400 mb-6">
                  {type === 'privilege'
                    ? 'Este capítulo é Privilege e só pode ser desbloqueado com Coins.'
                    : 'Desbloqueie este capítulo premium para continuar lendo.'}
                </p>

                <div className="flex items-center gap-2 bg-zinc-800 px-4 py-2 rounded-xl font-bold mb-6">
                  <Coins className="w-5 h-5 text-amber-500" />
                  Custo: {cost} Coins
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  {type === 'premium' && (
                    <Button
                      onClick={() => handleLocalUnlock('fast_pass')}
                      variant="outline"
                      className="flex-1 h-12 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 font-bold"
                      disabled={
                        wallet.fast_passes.reduce((a: number, b: any) => a + b.amount, 0) < 1
                      }
                    >
                      <Zap className="w-4 h-4 mr-2" /> Usar 1 Fast Pass
                    </Button>
                  )}
                  <Button
                    onClick={() => handleLocalUnlock('coin')}
                    className="flex-1 h-12 bg-amber-500 text-black hover:bg-amber-600 font-bold border-none"
                    disabled={wallet.coins < cost}
                  >
                    <Coins className="w-4 h-4 mr-2" /> Usar {cost} Coins
                  </Button>
                </div>

                {wallet.coins < cost &&
                  (type === 'privilege' ||
                    wallet.fast_passes.reduce((a: number, b: any) => a + b.amount, 0) < 1) && (
                    <Link
                      to="/store"
                      className="mt-6 text-sm text-zinc-300 hover:text-white hover:underline font-medium transition-colors"
                    >
                      Saldo insuficiente. Comprar Coins.
                    </Link>
                  )}
              </div>
            )
          }

          const contentText =
            chapter.content ||
            `<p>[Conteúdo do Capítulo ${chapterNum}]</p><p>Este capítulo foi desbloqueado com sucesso usando sua Inkrupt Wallet.</p>`

          return (
            <div
              className={cn(
                'transition-all duration-300 [&>p]:mb-6 [&>div]:mb-6',
                settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans',
              )}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: lineHeightMap[settings.lineHeight] || 1.6,
              }}
              dangerouslySetInnerHTML={{ __html: contentText }}
            />
          )
        })()}

        {/* Chapter Action Bar */}
        <div className="flex justify-center gap-8 md:gap-16 py-8 border-y border-zinc-800 my-12">
          <button
            onClick={() => toggleDrawer('comments')}
            className="flex flex-col items-center gap-2 group"
          >
            <MessageCircle className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
            <span className="text-xs text-zinc-400 font-semibold tracking-widest group-hover:text-white transition-colors mt-1">
              COMENTAR
            </span>
          </button>
          <button
            onClick={() => {
              if (!user) {
                toast.error('Faça login para votar.')
                return
              }
              voteNovel(novel.id)
            }}
            className="flex flex-col items-center gap-2 group"
          >
            <Zap
              className={cn(
                'w-6 h-6 transition-colors',
                hasVoted ? 'text-white fill-white' : 'text-zinc-400 group-hover:text-white',
              )}
            />
            <span
              className={cn(
                'text-xs font-semibold tracking-widest transition-colors mt-1',
                hasVoted ? 'text-white' : 'text-zinc-400 group-hover:text-white',
              )}
            >
              VOTAR
            </span>
          </button>
          <button
            disabled
            className="flex flex-col items-center gap-2 group opacity-50 cursor-not-allowed"
          >
            <Gift className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
            <span className="text-xs text-zinc-400 font-semibold tracking-widest flex flex-col items-center mt-1 group-hover:text-white transition-colors">
              PRESENTE
              <span className="text-[10px] text-zinc-500 font-normal normal-case tracking-normal">
                Em breve
              </span>
            </span>
          </button>
        </div>
      </main>

      <div className="container mx-auto pl-4 pr-[64px] flex flex-col gap-6 max-w-3xl">
        <div className="flex justify-between gap-4 mt-2 mb-8">
          <button
            onClick={() => navigate(`/novel/${novel.id}/chapter/${chapterNum - 1}`)}
            disabled={chapterNum <= 1}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-medium transition-all bg-zinc-900 border border-zinc-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800"
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </button>
          <button
            onClick={() => navigate(`/novel/${novel.id}/chapter/${chapterNum + 1}`)}
            disabled={chapterNum >= totalChapters}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-medium transition-all bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-700 shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
