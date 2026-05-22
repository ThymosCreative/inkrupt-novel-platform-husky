import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getNovel, getChapterByNum, getChapters, getChapterCost } from '@/services/api'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Settings,
  AlignJustify,
  BookmarkPlus,
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
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChapterComments } from '@/components/ChapterComments'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { useTheme } from '@/components/ThemeProvider'

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
  const [commentsCount, setCommentsCount] = useState(0)
  const [showUI, setShowUI] = useState(true)

  const { theme, setTheme } = useTheme()

  const [settings, setSettings] = useState({
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
    if (key === 'theme') {
      setTheme(value as any)
      return
    }
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

          if (c) {
            pb.collection('comments')
              .getList(1, 1, { filter: `chapter="${c.id}"` })
              .then((res) => setCommentsCount(res.totalItems))
              .catch(console.error)
          }

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

  const isDarkTheme = theme === 'dark' || theme === 'system'

  const sidebarBtnClass = (isActive: boolean) =>
    cn(
      'w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200',
      isActive
        ? isDarkTheme
          ? 'bg-zinc-800 text-white'
          : 'bg-zinc-200 text-zinc-900'
        : cn(
            'text-zinc-500',
            isDarkTheme
              ? 'hover:bg-zinc-800 hover:text-white'
              : 'hover:bg-zinc-200 hover:text-zinc-900',
          ),
    )

  const bookmarkBtnClass = (isActive: boolean) =>
    cn(
      'w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 cursor-pointer',
      isActive
        ? 'text-white'
        : cn(
            'text-zinc-500',
            isDarkTheme
              ? 'hover:bg-zinc-800 hover:text-white'
              : 'hover:bg-zinc-200 hover:text-zinc-900',
          ),
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
    system: 'bg-black text-slate-300',
  }

  const headerThemeClasses = {
    dark: 'bg-zinc-950 border-zinc-800 text-white',
    sepia: 'bg-[#EBE0CE] border-[#C8B89A] text-[#3D2B1F]',
    light: 'bg-white border-zinc-200 text-zinc-900',
    system: 'bg-zinc-950 border-zinc-800 text-white',
  }

  const isAuthor = user && novel?.author === user.id
  const isLocked = !isAuthor && chapter.is_premium && !isUnlockedLocal

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-500 pb-32 overflow-x-hidden',
        themeClasses[theme as keyof typeof themeClasses] || themeClasses.dark,
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
          headerThemeClasses[theme as keyof typeof headerThemeClasses] || headerThemeClasses.dark,
          showUI || activeDrawer
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
      >
        <div className="h-[48px] px-4 flex items-center justify-between w-full pr-[64px] max-w-4xl mx-auto">
          {/* Left Zone */}
          <div className="flex items-center">
            <Link
              to={`/novel/${novel.id}`}
              className="flex items-center hover:opacity-70 transition-opacity text-inherit"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium truncate max-w-[200px] hidden sm:inline-block">
                {novel.title}
              </span>
            </Link>
            <div
              className={cn(
                'border-r h-4 mx-3 hidden sm:block',
                theme === 'dark' || theme === 'system' ? 'border-zinc-700' : 'border-zinc-300',
              )}
            ></div>
            <span className="text-sm text-zinc-500 truncate max-w-[200px] hidden sm:inline-block">
              {chapter.title}
            </span>
          </div>

          {/* Center Zone */}
          <div className="absolute left-1/2 -translate-x-1/2 text-xs text-zinc-400 font-medium">
            {Math.round(progress)}%
          </div>

          {/* Right Zone */}
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (!user) {
                  toast.error('Faça login para votar.')
                  return
                }
                voteNovel(novel.id)
              }}
              className={cn(
                'transition-colors rounded-xl px-3 py-1 h-7 font-semibold border text-xs',
                theme === 'dark' || theme === 'system'
                  ? 'bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700'
                  : theme === 'sepia'
                    ? 'bg-[#C8B89A] text-[#3D2B1F] border-transparent hover:opacity-80'
                    : 'bg-zinc-900 text-white border-transparent hover:bg-zinc-800',
                hasVoted ? 'opacity-50' : '',
              )}
            >
              <Zap className={cn('w-3 h-3 mr-1.5', hasVoted ? 'fill-current' : '')} />
              Votar
            </Button>
          </div>
        </div>
      </header>

      {/* Fixed Right Sidebar */}
      <div className="fixed top-0 right-0 h-full w-[48px] z-50 flex flex-col items-center justify-center gap-6 transition-colors duration-300 bg-zinc-950 border-l border-zinc-800">
        <button
          onClick={() => toggleDrawer('settings')}
          className={sidebarBtnClass(activeDrawer === 'settings')}
        >
          <Settings className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => toggleDrawer('list')}
          className={sidebarBtnClass(activeDrawer === 'list')}
        >
          <AlignJustify className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>
        <button onClick={handleBookmark} className={bookmarkBtnClass(isBookmarked)}>
          {isBookmarked ? (
            <BookmarkCheck className="w-[18px] h-[18px]" strokeWidth={1.5} />
          ) : (
            <BookmarkPlus className="w-[18px] h-[18px]" strokeWidth={1.5} />
          )}
        </button>
        <button
          onClick={() => toggleDrawer('comments')}
          className={sidebarBtnClass(activeDrawer === 'comments')}
        >
          <MessageCircle className="w-[18px] h-[18px]" strokeWidth={1.5} />
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
          <div className="w-[320px] border-l flex flex-col h-full bg-zinc-900 border-zinc-800">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800 px-6 pt-6 shrink-0">
              <h3 className="text-sm font-semibold text-white">Configurações</h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6 overflow-y-auto flex flex-col gap-8">
              <div>
                <h4 className="text-sm text-zinc-400 mb-3">Fundo</h4>
                <div className="flex gap-4">
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    className={cn(
                      'w-10 h-10 rounded-full bg-black border-2 border-zinc-600 outline-none transition-all',
                      theme === 'dark' || theme === 'system' ? 'ring-2 ring-white' : '',
                    )}
                  />
                  <button
                    onClick={() => updateSetting('theme', 'sepia')}
                    className={cn(
                      'w-10 h-10 rounded-full bg-[#F2E8D9] border-2 border-[#C8B89A] outline-none transition-all',
                      theme === 'sepia' ? 'ring-2 ring-[#3D2B1F]' : '',
                    )}
                  />
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    className={cn(
                      'w-10 h-10 rounded-full bg-white border-2 border-zinc-300 outline-none transition-all',
                      theme === 'light' ? 'ring-2 ring-zinc-900' : '',
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

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800 mt-4 shrink-0">
                <span className="text-sm text-zinc-300">Comentários de Parágrafo</span>
                <Switch
                  checked={settings.paragraphComments}
                  onCheckedChange={(c) => updateSetting('paragraphComments', c)}
                  className="data-[state=checked]:bg-zinc-500 data-[state=unchecked]:bg-zinc-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* List Drawer */}
        {activeDrawer === 'list' && (
          <div className="w-[320px] flex flex-col h-full border-l shadow-2xl bg-zinc-900 border-zinc-800">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800 px-6 pt-6 shrink-0">
              <h3 className="text-sm font-semibold text-white">Capítulos</h3>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 pb-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
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
            <div className="flex-1 overflow-y-auto py-2">
              {chaptersList.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    navigate(`/novel/${id}/chapter/${ch.chapter_number}`)
                    setActiveDrawer(null)
                  }}
                  className={cn(
                    'w-full text-left p-4 border-b flex items-center justify-between transition-colors border-zinc-800/50 hover:bg-zinc-800/80',
                    ch.chapter_number === chapterNum
                      ? 'bg-zinc-800 border-l-2 border-l-white text-white'
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
        <div
          className={cn(
            'flex justify-center items-center gap-16 py-8 border-t border-b my-8',
            theme === 'dark' || theme === 'system'
              ? 'border-zinc-800'
              : theme === 'sepia'
                ? 'border-[#C8B89A]'
                : 'border-zinc-200',
          )}
        >
          <button
            onClick={() => toggleDrawer('comments')}
            className="flex flex-col items-center gap-1 group"
          >
            <MessageCircle
              className={cn(
                'w-[22px] h-[22px] transition-colors',
                theme === 'dark' || theme === 'system'
                  ? 'text-zinc-400 group-hover:text-white'
                  : theme === 'sepia'
                    ? 'text-[#9C8467] group-hover:text-[#3D2B1F]'
                    : 'text-zinc-400 group-hover:text-zinc-700',
              )}
            />
            <span
              className={cn(
                'text-[10px] font-semibold tracking-widest uppercase mt-1',
                theme === 'sepia' ? 'text-[#9C8467]' : 'text-zinc-400',
              )}
            >
              Comentar
            </span>
            <span
              className={cn(
                'text-xs mt-0.5',
                theme === 'sepia' ? 'text-[#9C8467]' : 'text-zinc-400',
              )}
            >
              {commentsCount}
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
            className="flex flex-col items-center gap-1 group"
          >
            <Zap
              className={cn(
                'w-[22px] h-[22px] transition-colors',
                hasVoted
                  ? theme === 'dark' || theme === 'system'
                    ? 'text-white fill-white'
                    : theme === 'sepia'
                      ? 'text-[#3D2B1F] fill-[#3D2B1F]'
                      : 'text-zinc-900 fill-zinc-900'
                  : theme === 'dark' || theme === 'system'
                    ? 'text-zinc-400 group-hover:text-white'
                    : theme === 'sepia'
                      ? 'text-[#9C8467] group-hover:text-[#3D2B1F]'
                      : 'text-zinc-400 group-hover:text-zinc-700',
              )}
            />
            <span
              className={cn(
                'text-[10px] font-semibold tracking-widest uppercase mt-1 transition-colors',
                hasVoted
                  ? theme === 'dark' || theme === 'system'
                    ? 'text-white'
                    : theme === 'sepia'
                      ? 'text-[#3D2B1F]'
                      : 'text-zinc-900'
                  : theme === 'sepia'
                    ? 'text-[#9C8467]'
                    : 'text-zinc-400',
              )}
            >
              Votar
            </span>
            <span
              className={cn(
                'text-xs mt-0.5',
                theme === 'sepia' ? 'text-[#9C8467]' : 'text-zinc-400',
              )}
            >
              {novel.power_stones_count || 0}
            </span>
          </button>
          <button
            disabled
            className="flex flex-col items-center gap-1 group opacity-50 cursor-not-allowed"
          >
            <Gift
              className={cn(
                'w-[22px] h-[22px] transition-colors',
                theme === 'sepia' ? 'text-[#9C8467]' : 'text-zinc-300',
              )}
            />
            <span
              className={cn(
                'text-[10px] font-semibold tracking-widest uppercase mt-1 flex flex-col items-center',
                theme === 'sepia' ? 'text-[#9C8467]' : 'text-zinc-300',
              )}
            >
              Presente
              <span
                className={cn(
                  'text-[10px] font-normal normal-case tracking-normal mt-0.5',
                  theme === 'sepia' ? 'text-[#9C8467]' : 'text-zinc-400',
                )}
              >
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
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              theme === 'dark' || theme === 'system'
                ? 'bg-transparent border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
                : theme === 'sepia'
                  ? 'bg-transparent border border-[#C8B89A] text-[#9C8467] hover:border-[#9C8467] hover:text-[#3D2B1F]'
                  : 'bg-transparent border border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900',
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </button>
          <button
            onClick={() => navigate(`/novel/${novel.id}/chapter/${chapterNum + 1}`)}
            disabled={chapterNum >= totalChapters}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              theme === 'dark' || theme === 'system'
                ? 'bg-white text-black hover:bg-zinc-200 border border-transparent'
                : theme === 'sepia'
                  ? 'bg-[#3D2B1F] text-[#F2E8D9] border border-[#3D2B1F] hover:opacity-90'
                  : 'bg-zinc-900 text-white border border-zinc-900 hover:bg-zinc-700',
            )}
          >
            Próximo
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
