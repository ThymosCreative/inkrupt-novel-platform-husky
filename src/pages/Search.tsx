import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { searchNovels, getCoverUrl } from '@/services/api'
import { Loader2, Search as SearchIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function Search() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!query) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    searchNovels(query, 50)
      .then((res) => {
        setResults(res.items)
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false)
      })
  }, [query])

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-black mb-8">
          Resultados para <span className="text-lime-400">"{query}"</span>
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-lime-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {results.map((novel) => (
              <Link key={novel.id} to={`/novel/${novel.id}`} className="group">
                <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden hover:border-lime-400 transition-colors h-full flex flex-col">
                  <div className="aspect-[2/3] overflow-hidden relative shrink-0">
                    <img
                      src={getCoverUrl(novel)}
                      alt={novel.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {novel.rating && (
                      <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-lime-400 px-2 py-1 rounded text-xs font-bold">
                        ★ {novel.rating.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 flex flex-col justify-center flex-1">
                    <h3 className="font-bold truncate group-hover:text-lime-400 transition-colors">
                      {novel.title}
                    </h3>
                    <p className="text-sm text-zinc-400 truncate mt-1">
                      {novel.expand?.author?.name || 'Autor'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/20">
            <SearchIcon className="w-12 h-12 text-zinc-600 mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhum resultado encontrado</h2>
            <p className="text-zinc-500 max-w-md">
              Não encontramos nenhuma obra com esse título ou gênero. Tente usar outras
              palavras-chave.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
