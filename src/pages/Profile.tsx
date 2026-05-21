import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { NovelCard } from '@/components/NovelCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Settings, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { getLibrary } from '@/services/api'
import pb from '@/lib/pocketbase/client'

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [library, setLibrary] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    loadLibrary()
  }, [user, navigate])

  const loadLibrary = async () => {
    try {
      const res = await getLibrary(user.id)
      setLibrary(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lime-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const reading = library.filter((e) => e.status === 'reading')
  const plan = library.filter((e) => e.status === 'plan_to_read')
  const completed = library.filter((e) => e.status === 'completed')

  return (
    <div className="pb-20">
      {/* Banner */}
      <div className="h-40 bg-zinc-900 w-full relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10" />
      </div>

      <div className="container mx-auto px-4 relative z-20">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-12 -mt-12 md:ml-6">
          <Avatar className="w-32 h-32 border-4 border-lime-400 bg-zinc-800 shadow-xl">
            <AvatarImage
              src={
                user?.avatar
                  ? pb.files.getURL(user, user.avatar)
                  : `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`
              }
            />
            <AvatarFallback>{user?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left mt-4 md:mt-0">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white">
                {user?.name || user?.email?.split('@')[0] || 'Usuário'}
              </h1>
              <span className="bg-zinc-800 text-lime-400 text-xs px-2 py-1 rounded-full font-bold">
                Lv. 12
              </span>
            </div>
            <p className="text-zinc-400">Membro da Inkrupt</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 rounded-xl"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurações
            </Button>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="reading" className="w-full">
          <TabsList className="bg-transparent border-b border-zinc-900 w-full justify-start rounded-none h-auto p-0 mb-8">
            <TabsTrigger
              value="reading"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-lime-400 data-[state=active]:bg-transparent data-[state=active]:text-lime-400 px-6 py-3 text-base text-zinc-400"
            >
              Lendo ({reading.length})
            </TabsTrigger>
            <TabsTrigger
              value="plan"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-lime-400 data-[state=active]:bg-transparent data-[state=active]:text-lime-400 px-6 py-3 text-base text-zinc-400"
            >
              Quero Ler ({plan.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-lime-400 data-[state=active]:bg-transparent data-[state=active]:text-lime-400 px-6 py-3 text-base text-zinc-400"
            >
              Concluídos ({completed.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reading" className="animate-in fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {reading.map((entry) => (
                <div key={entry.id} className="relative group">
                  <NovelCard novel={entry.expand?.novel} />
                  {entry.expand?.last_chapter && (
                    <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 rounded text-xs font-bold text-lime-400 border border-zinc-800">
                      Cap. {entry.expand.last_chapter.chapter_number}
                    </div>
                  )}
                </div>
              ))}
              {reading.length === 0 && (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  Nenhuma obra sendo lida no momento.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="plan" className="animate-in fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {plan.map((entry) => (
                <NovelCard key={entry.id} novel={entry.expand?.novel} />
              ))}
              {plan.length === 0 && (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  Sua lista de "Quero Ler" está vazia.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="animate-in fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {completed.map((entry) => (
                <NovelCard key={entry.id} novel={entry.expand?.novel} />
              ))}
              {completed.length === 0 && (
                <div className="col-span-full py-12 text-center text-zinc-500">
                  Nenhuma obra concluída ainda.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
