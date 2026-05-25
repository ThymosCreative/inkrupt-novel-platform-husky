import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Home, Search } from 'lucide-react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404: Rota não encontrada:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <div className="mb-8 relative">
        <span className="text-[120px] font-black text-zinc-900 select-none leading-none">404</span>
        <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-zinc-700" />
      </div>

      <h1 className="text-3xl font-black text-white mb-3">Página não encontrada</h1>
      <p className="text-zinc-400 text-lg max-w-md mb-10">
        A página que você está procurando não existe ou foi removida.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Button
          asChild
          className="bg-white text-black hover:bg-zinc-200 font-bold px-8 h-12 rounded-xl"
        >
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white h-12 px-8 rounded-xl"
        >
          <Link to="/explore">
            <Search className="w-4 h-4 mr-2" />
            Explorar Obras
          </Link>
        </Button>
      </div>

      <div className="mt-16 text-zinc-800 font-black text-xl tracking-tighter select-none">
        INKRUPT.
      </div>
    </div>
  )
}

export default NotFound
