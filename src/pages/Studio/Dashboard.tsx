import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { getCoverUrl } from '@/services/api'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Plus, BookOpen, Settings } from 'lucide-react'

export default function StudioDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [novels, setNovels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadNovels = async () => {
    if (!user) return
    try {
      const records = await pb.collection('novels').getFullList({
        filter: `author = "${user.id}"`,
        sort: '-updated',
      })
      setNovels(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNovels()
  }, [user])

  useRealtime('novels', (e) => {
    if (e.record.author === user?.id) {
      loadNovels()
    }
  })

  const createNovel = async () => {
    try {
      const record = await pb.collection('novels').create({
        title: 'Nova Obra',
        author: user?.id,
        status: 'Em Andamento',
        type: 'Original',
      })
      navigate(`/studio/novel/${record.id}`)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Studio</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas obras e capítulos</p>
        </div>
        <Button onClick={createNovel} className="gap-2 rounded-xl">
          <Plus className="w-4 h-4" />
          Nova Obra
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : novels.length === 0 ? (
        <div className="text-center py-24 bg-muted/30 rounded-2xl border border-dashed">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Nenhuma obra encontrada</h3>
          <p className="text-muted-foreground mb-6">
            Você ainda não criou nenhuma obra. Comece agora!
          </p>
          <Button onClick={createNovel} variant="outline" className="rounded-xl">
            Criar primeira obra
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {novels.map((novel) => (
            <div
              key={novel.id}
              className="bg-card border rounded-2xl overflow-hidden hover:shadow-lg transition-all group flex flex-col"
            >
              <div className="aspect-[3/2] relative overflow-hidden bg-muted">
                <img
                  src={getCoverUrl(novel)}
                  alt={novel.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="font-bold truncate text-lg">{novel.title}</h3>
                  <div className="text-xs text-white/80 mt-1 capitalize">
                    {novel.status} • {novel.type}
                  </div>
                </div>
              </div>
              <div className="p-4 flex gap-2">
                <Button asChild variant="secondary" className="flex-1 rounded-xl">
                  <Link to={`/studio/novel/${novel.id}`}>
                    <Settings className="w-4 h-4 mr-2" />
                    Gerenciar
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
