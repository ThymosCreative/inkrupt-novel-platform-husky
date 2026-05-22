import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getNovel, getChapterByNum, getChapters } from '@/services/api'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  Minus,
  Plus,
  AlignJustify,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChapterComments } from '@/components/ChapterComments'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useWallet } from '@/hooks/use-wallet'
import { getChapterCost } from '@/services/api'
import { Badge } from '@/components/ui/badge'

export default function Reader() {
  const { id, num } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { wallet, votes, voteNovel, unlockChapter } = useWallet()
  const chapterNum = parseInt(num || '1', 10)

  const [novel, setNovel] = useState<any>(null)
  const [chapter, setChapter] = useState<any>(null)
  const [totalChapters, setTotalChapters] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isUnlockedLocal, setIsUnlockedLocal] = useState(false)

  const [progress, setProgress] = useState(0)
  const [settings, setSettings] = useState({
    theme: user?.preferences?.theme || 'dark',
    fontFamily: user?.preferences?.fontFamily || 'sans',
    fontSize: user?.preferences?.fontSize || 18,
    lineHeight: user?.preferences?.lineHeight || 'normal',
    margins: user?.preferences?.margins || 'standard',
  })

  useEffect(() => {
    if (user?.preferences) {
      setSettings((s) => ({ ...s, ...user.preferences }))
    }
  }, [user?.preferences])

  const updateSetting = (key: string, value: string | number) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    if (user) {
      pb.collection('users').update(user.id, { preferences: newSettings }).catch(console.error)
    }
  }

  const lineHeightMap: Record<string, number> = { compact: 1.4, normal: 1.6, wide: 2.0 }
  const marginClasses: Record<string, string> = {
    narrow: 'max-w-xl',
    standard: 'max-w-3xl',
    wide: 'max-w-5xl',
  }

  useEffect(() => {
    if (id && num) {
      setLoading(true)
      Promise.all([getNovel(id), getChapterByNum(id, chapterNum), getChapters(id)])
        .then(async ([n, c, clist]) => {
          setNovel(n)
          setChapter(c)
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
                  if (entries[0].last_chapter !== c.id || entries[0].status !== 'reading') {
                    pb.collection('library_entries')
                      .update(entries[0].id, { last_chapter: c.id, status: 'reading' })
                      .catch(console.error)
                  }
                } else {
                  pb.collection('library_entries')
                    .create({ user: user.id, novel: id, status: 'reading', last_chapter: c.id })
                    .catch(console.error)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lime-400 bg-black">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!chapter || !novel) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-black">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Capítulo não encontrado</h2>
          <Link to={`/novel/${id}`} className="text-lime-400 hover:underline">
            Voltar para a obra
          </Link>
        </div>
      </div>
    )
  }

  const themeClasses = {
    dark: 'bg-black text-slate-300',
    slate: 'bg-slate-900 text-slate-300',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]',
    light: 'bg-white text-zinc-900',
  }

  const headerThemeClasses = {
    dark: 'bg-black/90 border-slate-900',
    slate: 'bg-slate-900/90 border-slate-800',
    sepia: 'bg-[#f4ecd8]/90 border-[#e6dcc0]',
    light: 'bg-white/90 border-zinc-200',
  }

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-500 pb-32',
        themeClasses[settings.theme as keyof typeof themeClasses] || themeClasses.dark,
      )}
    >
      <div className="fixed top-0 left-0 w-full h-0.5 bg-black/10 z-50">
        <div
          className="h-full bg-lime-400 transition-all duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <header
        className={cn(
          'sticky top-0 z-40 w-full backdrop-blur-md border-b transition-colors',
          headerThemeClasses[settings.theme as keyof typeof headerThemeClasses] ||
            headerThemeClasses.dark,
        )}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-4xl">
          <Link
            to={`/novel/${novel.id}`}
            className="flex items-center gap-3 text-sm font-medium hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline font-bold truncate max-w-[200px]">{novel.title}</span>
          </Link>
          <div className="text-sm font-bold opacity-70">Capítulo {chapterNum}</div>
          <div className="w-20 flex justify-end"></div>
        </div>
      </header>

      <div className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-lime-400 flex items-center justify-center backdrop-blur-sm transition-all shadow-xl">
              <Settings className="w-5 h-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="left"
            className="w-80 bg-zinc-950 border-zinc-800 p-6 rounded-2xl mr-4 shadow-2xl"
          >
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Tema</h4>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    className={cn(
                      'h-10 rounded-lg bg-white border-2',
                      settings.theme === 'light' ? 'border-lime-400' : 'border-zinc-800',
                    )}
                    title="Light"
                  />
                  <button
                    onClick={() => updateSetting('theme', 'sepia')}
                    className={cn(
                      'h-10 rounded-lg bg-[#f4ecd8] border-2',
                      settings.theme === 'sepia' ? 'border-lime-400' : 'border-zinc-800',
                    )}
                    title="Sepia"
                  />
                  <button
                    onClick={() => updateSetting('theme', 'slate')}
                    className={cn(
                      'h-10 rounded-lg bg-slate-900 border-2',
                      settings.theme === 'slate' ? 'border-lime-400' : 'border-zinc-800',
                    )}
                    title="Slate"
                  />
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    className={cn(
                      'h-10 rounded-lg bg-black border-2',
                      settings.theme === 'dark' ? 'border-lime-400' : 'border-zinc-800',
                    )}
                    title="Dark"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Fonte</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSetting('fontFamily', 'sans')}
                    className={cn(
                      'flex-1 h-10 rounded-lg border font-sans',
                      settings.fontFamily === 'sans'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    Inter
                  </button>
                  <button
                    onClick={() => updateSetting('fontFamily', 'serif')}
                    className={cn(
                      'flex-1 h-10 rounded-lg border font-serif',
                      settings.fontFamily === 'serif'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    Georgia
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3 flex justify-between">
                  Tamanho <span>{settings.fontSize}px</span>
                </h4>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => updateSetting('fontSize', Math.max(14, settings.fontSize - 1))}
                    className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="range"
                    min={14}
                    max={28}
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                    className="flex-1 accent-lime-400"
                  />
                  <button
                    onClick={() => updateSetting('fontSize', Math.min(28, settings.fontSize + 1))}
                    className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Espaçamento</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSetting('lineHeight', 'compact')}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm flex flex-col items-center gap-1',
                      settings.lineHeight === 'compact'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    <AlignJustify className="w-4 h-4 opacity-70" />
                    Compacto
                  </button>
                  <button
                    onClick={() => updateSetting('lineHeight', 'normal')}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm flex flex-col items-center gap-1',
                      settings.lineHeight === 'normal'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    <AlignJustify className="w-4 h-4" />
                    Normal
                  </button>
                  <button
                    onClick={() => updateSetting('lineHeight', 'wide')}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm flex flex-col items-center gap-1',
                      settings.lineHeight === 'wide'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    <AlignJustify
                      className="w-4 h-4 opacity-70"
                      style={{ transform: 'scaleY(1.2)' }}
                    />
                    Amplo
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Margens</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSetting('margins', 'narrow')}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm',
                      settings.margins === 'narrow'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    Estreita
                  </button>
                  <button
                    onClick={() => updateSetting('margins', 'standard')}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm',
                      settings.margins === 'standard'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    Padrão
                  </button>
                  <button
                    onClick={() => updateSetting('margins', 'wide')}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm',
                      settings.margins === 'wide'
                        ? 'border-lime-400 text-lime-400 bg-lime-400/10'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    Larga
                  </button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <button className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-lime-400 flex items-center justify-center backdrop-blur-sm transition-all shadow-xl">
          <List className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-lime-400 hover:border-lime-400 flex items-center justify-center backdrop-blur-sm transition-all shadow-xl">
          <Bookmark className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:border-lime-400 flex items-center justify-center backdrop-blur-sm transition-all shadow-xl relative">
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      <main
        className={cn(
          'container mx-auto px-4 md:px-8 mt-12 mb-20 transition-all duration-300',
          marginClasses[settings.margins] || 'max-w-3xl',
        )}
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-12 text-center font-sans tracking-tight">
          {chapter.title}
        </h1>

        {(() => {
          const isAuthor = user && novel?.author === user.id
          const isLocked = !isAuthor && chapter.is_premium && !isUnlockedLocal
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
              toast.error(method === 'coin' ? 'Coins insuficientes.' : 'Fast Passes insuficientes.')
            }
          }

          if (isLocked) {
            return (
              <div className="bg-zinc-900/50 border border-border rounded-2xl p-8 text-center flex flex-col items-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Capítulo Bloqueado</h2>
                {type === 'privilege' && (
                  <Badge className="bg-lime-400 text-black mb-4 font-black">PRIVILEGE</Badge>
                )}
                <p className="text-muted-foreground mb-6">
                  {type === 'privilege'
                    ? 'Este capítulo é Privilege e só pode ser desbloqueado com Coins.'
                    : 'Desbloqueie este capítulo premium para continuar lendo.'}
                </p>

                <div className="flex items-center gap-2 bg-muted px-4 py-2 rounded-xl font-bold mb-6">
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
                    className="flex-1 h-12 bg-amber-500 text-black hover:bg-amber-600 font-bold"
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
                      className="mt-6 text-sm text-lime-400 hover:underline font-medium"
                    >
                      Saldo insuficiente. Comprar Coins.
                    </Link>
                  )}
              </div>
            )
          }

          const contentText =
            chapter.content ||
            `[Conteúdo do Capítulo ${chapterNum}]\n\nEste capítulo foi desbloqueado com sucesso usando sua Inkrupt Wallet.\n\n${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. '.repeat(15)}`

          return (
            <div
              className={cn(
                'whitespace-pre-wrap transition-all duration-300',
                settings.fontFamily === 'serif' ? 'font-serif' : 'font-sans',
              )}
              style={{
                fontSize: `${settings.fontSize}px`,
                lineHeight: lineHeightMap[settings.lineHeight] || 1.6,
              }}
            >
              {contentText}
            </div>
          )
        })()}
      </main>

      <div
        className={cn(
          'container mx-auto px-4 flex flex-col gap-6 transition-all duration-300',
          marginClasses[settings.margins] || 'max-w-3xl',
        )}
      >
        <div className="flex justify-center">
          <Button
            onClick={() => {
              if (!user) {
                toast.error('Faça login para votar.')
                return
              }
              voteNovel(novel.id)
            }}
            className={`h-12 rounded-xl px-8 font-bold ${
              votes.some(
                (v: any) => v.novel_id === novel.id && v.voted_at > new Date().setHours(0, 0, 0, 0),
              )
                ? 'bg-lime-400 text-black hover:bg-lime-500'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <Zap className="w-5 h-5 mr-2" /> Votar ({wallet.power_stones})
          </Button>
        </div>

        <div className="flex justify-between gap-4">
          <button
            onClick={() => navigate(`/novel/${novel.id}/chapter/${chapterNum - 1}`)}
            disabled={chapterNum <= 1}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-bold transition-all border',
              settings.theme === 'light'
                ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-black'
                : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </button>
          <button
            onClick={() => navigate(`/novel/${novel.id}/chapter/${chapterNum + 1}`)}
            disabled={chapterNum >= totalChapters}
            className="flex-1 flex items-center justify-center gap-2 h-14 rounded-xl font-bold transition-all bg-lime-400 hover:bg-lime-500 text-black shadow-lg shadow-lime-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'container mx-auto px-4 pb-10 mt-8 transition-all duration-300',
          marginClasses[settings.margins] || 'max-w-3xl',
        )}
      >
        <ChapterComments
          chapterId={chapter.id}
          novelAuthorId={novel.author}
          theme={settings.theme}
        />
      </div>
    </div>
  )
}
