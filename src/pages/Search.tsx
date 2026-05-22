import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchNovels } from '@/services/api'
import { NovelCard } from '@/components/NovelCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, Search as SearchIcon, Filter } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

const GENRES = [
  'Ação',
  'Aventura',
  'Comédia',
  'Drama',
  'Fantasia',
  'Ficção Científica',
  'Mistério',
  'Romance',
  'Terror',
]

export default function Search() {
  const [searchParams] = useSearchParams()
  const initialGenre = searchParams.get('genre')

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [genres, setGenres] = useState<string[]>(initialGenre ? [initialGenre] : [])
  const [sort, setSort] = useState('-reads')
  const [minRating, setMinRating] = useState<number | undefined>(undefined)
  const [chapterRange, setChapterRange] = useState('all')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      searchNovels({ query, status, type, genres, sort, minRating, chapterRange, limit: 30 }).then(
        (res) => {
          setResults(res.items)
          setLoading(false)
        },
      )
    }, 500)
    return () => clearTimeout(timer)
  }, [query, status, type, genres, sort])

  const toggleGenre = (g: string) => {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  }

  const FilterSidebar = () => (
    <div className="space-y-8">
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Status</h3>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-lime-400">
            <SelectValue placeholder="Qualquer" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="focus:bg-zinc-800">
              Qualquer
            </SelectItem>
            <SelectItem value="Em Andamento" className="focus:bg-zinc-800">
              Em Andamento
            </SelectItem>
            <SelectItem value="Concluído" className="focus:bg-zinc-800">
              Concluído
            </SelectItem>
            <SelectItem value="Hiato" className="focus:bg-zinc-800">
              Hiato
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Tipo</h3>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-lime-400">
            <SelectValue placeholder="Qualquer" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="focus:bg-zinc-800">
              Qualquer
            </SelectItem>
            <SelectItem value="Original" className="focus:bg-zinc-800">
              Original
            </SelectItem>
            <SelectItem value="Tradução" className="focus:bg-zinc-800">
              Tradução
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">
          Avaliação (Min)
        </h3>
        <Select
          value={minRating?.toString() || 'all'}
          onValueChange={(v) => setMinRating(v === 'all' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-lime-400">
            <SelectValue placeholder="Qualquer" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="focus:bg-zinc-800">
              Qualquer
            </SelectItem>
            <SelectItem value="3" className="focus:bg-zinc-800">
              3.0+
            </SelectItem>
            <SelectItem value="4" className="focus:bg-zinc-800">
              4.0+
            </SelectItem>
            <SelectItem value="4.5" className="focus:bg-zinc-800">
              4.5+
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Capítulos</h3>
        <Select value={chapterRange} onValueChange={setChapterRange}>
          <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 focus:ring-lime-400">
            <SelectValue placeholder="Qualquer" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="focus:bg-zinc-800">
              Qualquer
            </SelectItem>
            <SelectItem value="1-10" className="focus:bg-zinc-800">
              1 a 10
            </SelectItem>
            <SelectItem value="10-50" className="focus:bg-zinc-800">
              10 a 50
            </SelectItem>
            <SelectItem value="50-100" className="focus:bg-zinc-800">
              50 a 100
            </SelectItem>
            <SelectItem value="100+" className="focus:bg-zinc-800">
              100+
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h3 className="font-bold text-sm text-zinc-400 uppercase tracking-wider">Gêneros</h3>
        <div className="space-y-2">
          {GENRES.map((g) => (
            <div key={g} className="flex items-center space-x-2">
              <Checkbox
                id={`genre-${g}`}
                checked={genres.includes(g)}
                onCheckedChange={() => toggleGenre(g)}
                className="border-zinc-700 data-[state=checked]:bg-lime-400 data-[state=checked]:text-black"
              />
              <Label htmlFor={`genre-${g}`} className="text-zinc-300 font-normal cursor-pointer">
                {g}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black tracking-tight text-white">Explorar Obras</h1>
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800">
                <Filter className="w-4 h-4 mr-2" /> Filtros
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-zinc-950 border-zinc-800 text-white w-[300px] p-0"
            >
              <SheetHeader className="p-6 border-b border-zinc-800">
                <SheetTitle className="text-white text-left">Filtros</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-80px)] px-6 py-6">
                <FilterSidebar />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block w-64 shrink-0">
          <FilterSidebar />
        </aside>

        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Buscar pelo título ou descrição (Busca Semântica)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-lime-400 h-11 rounded-xl"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full sm:w-48 bg-zinc-900/50 border-zinc-800 h-11 rounded-xl focus:ring-lime-400">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="-reads" className="focus:bg-zinc-800">
                  Mais Lidas
                </SelectItem>
                <SelectItem value="-rating" className="focus:bg-zinc-800">
                  Melhor Avaliadas
                </SelectItem>
                <SelectItem value="-created" className="focus:bg-zinc-800">
                  Mais Recentes
                </SelectItem>
                {query && (
                  <SelectItem value="semantic" className="focus:bg-zinc-800">
                    Relevância Semântica
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="min-h-[400px] flex items-center justify-center text-lime-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-in fade-in">
              {results.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
          ) : (
            <div className="min-h-[400px] flex flex-col items-center justify-center text-zinc-500 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
              <SearchIcon className="w-12 h-12 mb-4 text-zinc-600" />
              <h3 className="text-lg font-bold text-zinc-400">Nenhuma obra encontrada</h3>
              <p className="text-sm mt-1">Tente ajustar seus filtros ou termos de busca.</p>
              {(query || status !== 'all' || type !== 'all' || genres.length > 0) && (
                <Button
                  variant="link"
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                    setType('all')
                    setGenres([])
                    setSort('-reads')
                    setMinRating(undefined)
                    setChapterRange('all')
                  }}
                  className="mt-4 text-lime-400 hover:text-lime-300"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
