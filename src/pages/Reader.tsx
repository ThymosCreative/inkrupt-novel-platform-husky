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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChapterComments } from '@/components/ChapterComments'
import { Coins, Lock } from 'lucide-react'
import { unlockChapter } from '@/services/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function Reader() {
  const { id, num } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const chapterNum = parseInt(num || '1', 10)

  const [novel, setNovel] = useState<any>(null)
  const [chapter, setChapter] = useState<any>(null)
  const [totalChapters, setTotalChapters] = useState(0)
  const [loading, setLoading] = useState(true)
  const [unlocking, setUnlocking] = useState(false)

  const [progress, setProgress] = useState(0)
  const [settings, setSettings] = useState({
    theme: user?.preferences?.theme || 'dark', // 'dark' | 'sepia' | 'light'
    fontSize: user?.preferences?.fontSize || 'M', // 'S' | 'M' | 'L' | 'XL'
    spacing: user?.preferences?.spacing || 'normal', // 'normal' | 'amplo'
  })

  // Keep settings synced if loaded later
  useEffect(() => {
    if (user?.preferences) {
      setSettings((s) => ({ ...s, ...user.preferences }))
    }
  }, [user?.preferences])

  const updateSetting = (key: string, value: string) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    if (user) {
      pb.collection('users').update(user.id, { preferences: newSettings }).catch(console.error)
    }
  }

  const fontSizeMap: Record<string, number> = { S: 14, M: 18, L: 22, XL: 26 }
  const spacingMap: Record<string, number> = { normal: 1.6, amplo: 2.2 }

  useEffect(() => {
    if (id && num) {
      setLoading(true)
      Promise.all([getNovel(id), getChapterByNum(id, chapterNum), getChapters(id)])
        .then(([n, c, clist]) => {
          setNovel(n)
          setChapter(c)
          setTotalChapters(clist.length)
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
  }, [id, num, user])

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

  const handleUnlock = async () => {
    if (!user) {
      toast.error('Faça login para desbloquear.')
      return
    }
    setUnlocking(true)
    try {
      await unlockChapter(chapter.id)
      toast.success('Capítulo desbloqueado com sucesso!')

      const c = await getChapterByNum(id!, chapterNum)
      setChapter(c)

      pb.collection('users').authRefresh().catch(console.error)
    } catch (e: any) {
      if (e?.response?.message === 'insufficient coins') {
        toast.error('Moedas insuficientes. Por favor, recarregue seu saldo.')
      } else {
        toast.error('Erro ao desbloquear capítulo.')
      }
    } finally {
      setUnlocking(false)
    }
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
    dark: 'bg-slate-950 text-slate-300',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]',
    light: 'bg-white text-zinc-900',
  }

  const headerThemeClasses = {
    dark: 'bg-slate-950/90 border-slate-900',
    sepia: 'bg-[#f4ecd8]/90 border-[#e6dcc0]',
    light: 'bg-white/90 border-zinc-200',
  }

  return (
    <div
      className={cn(
        'min-h-screen transition-colors duration-500 pb-32',
        themeClasses[settings.theme as keyof typeof themeClasses],
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
          headerThemeClasses[settings.theme as keyof typeof headerThemeClasses],
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
            className="w-72 bg-zinc-950 border-zinc-800 p-6 rounded-2xl mr-4 shadow-2xl"
          >
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Tema</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    className={cn(
                      'flex-1 h-10 rounded-lg bg-slate-950 border-2',
                      settings.theme === 'dark' ? 'border-lime-400' : 'border-zinc-800',
                    )}
                  />
                  <button
                    onClick={() => updateSetting('theme', 'sepia')}
                    className={cn(
                      'flex-1 h-10 rounded-lg bg-[#f4ecd8] border-2',
                      settings.theme === 'sepia' ? 'border-lime-400' : 'border-zinc-800',
                    )}
                  />
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    className={cn(
                      'flex-1 h-10 rounded-lg bg-white border-2',
                      settings.theme === 'light' ? 'border-lime-400' : 'border-zinc-800',
                    )}
                  />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Tamanho da Fonte</h4>
                <div className="flex gap-2">
                  {['S', 'M', 'L', 'XL'].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateSetting('fontSize', s)}
                      className={cn(
                        'flex-1 h-10 rounded-lg border font-medium transition-colors',
                        settings.fontSize === s
                          ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                          : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-zinc-400 mb-3">Espaçamento</h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateSetting('spacing', 'normal')}
                    className={cn(
                      'flex-1 h-10 rounded-lg border font-medium transition-colors',
                      settings.spacing === 'normal'
                        ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => updateSetting('spacing', 'amplo')}
                    className={cn(
                      'flex-1 h-10 rounded-lg border font-medium transition-colors',
                      settings.spacing === 'amplo'
                        ? 'border-lime-400 bg-lime-400/10 text-lime-400'
                        : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900',
                    )}
                  >
                    Amplo
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

      <main className="container mx-auto px-4 md:px-8 max-w-3xl mt-12 mb-20">
        <h1 className="text-3xl md:text-4xl font-bold mb-12 text-center font-sans tracking-tight">
          {chapter.title}
        </h1>

        {chapter.is_premium && !chapter.content ? (
          <div className="bg-zinc-900/50 border border-amber-500/20 rounded-2xl p-8 text-center flex flex-col items-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Capítulo Premium</h2>
            <p className="text-zinc-400 mb-6">
              Este capítulo é exclusivo e precisa ser desbloqueado para leitura. Apoie o autor
              desbloqueando com moedas.
            </p>
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl font-bold mb-6">
              <Coins className="w-5 h-5" />
              Preço: {chapter.coin_price || 0} Moedas
            </div>
            <Button
              onClick={handleUnlock}
              disabled={unlocking}
              className="bg-amber-500 text-black hover:bg-amber-600 font-bold w-full sm:w-auto px-8 h-12 rounded-xl text-base"
            >
              {unlocking && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
              Desbloquear Capítulo
            </Button>
            {user && (
              <p className="mt-4 text-sm text-zinc-500 flex items-center gap-1.5">
                Seu saldo: <Coins className="w-3.5 h-3.5" /> {user.coins || 0}
              </p>
            )}
          </div>
        ) : (
          <div
            className="font-serif whitespace-pre-wrap transition-all duration-300"
            style={{
              fontSize: `${fontSizeMap[settings.fontSize]}px`,
              lineHeight: spacingMap[settings.spacing],
            }}
          >
            {chapter.content}
          </div>
        )}
      </main>

      <div className="container mx-auto px-4 max-w-3xl flex justify-between gap-4">
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

      <div className="container mx-auto px-4 max-w-3xl pb-10">
        <ChapterComments
          chapterId={chapter.id}
          novelAuthorId={novel.author}
          theme={settings.theme}
        />
      </div>
    </div>
  )
}
