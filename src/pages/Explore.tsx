import { useState, useEffect } from 'react'
import { getNovels } from '@/services/api'
import { NovelCard } from '@/components/NovelCard'
import { Loader2 } from 'lucide-react'

export default function Explore() {
  const [novels, setNovels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNovels({ sort: '-created' })
      .then((res) => {
        setNovels(res.items)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-black mb-8 text-foreground">Explorar Obras</h1>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
        </div>
      ) : novels.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {novels.map((novel) => (
            <NovelCard key={novel.id} novel={novel} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-muted-foreground">Nenhuma obra encontrada.</div>
      )}
    </div>
  )
}
