import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, Bell, X, Loader2, User, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuthModal } from './AuthModal'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { searchNovels, getCoverUrl } from '@/services/api'
import pb from '@/lib/pocketbase/client'

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const { user, isAuthenticated, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'Explorar', path: '/explore' },
    { name: 'Escrever', path: '/write' },
  ]

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(() => {
      searchNovels(searchQuery.trim())
        .then((res) => {
          setSearchResults(res.items)
        })
        .catch(() => {
          setSearchResults([])
        })
        .finally(() => {
          setIsSearching(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-2xl font-black tracking-tighter text-white hover:text-lime-400 transition-colors"
            >
              INKRUPT.
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-lime-400',
                    location.pathname === link.path ? 'text-lime-400' : 'text-zinc-400',
                  )}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block" ref={searchRef}>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (searchQuery.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
                    setSearchQuery('')
                    searchRef.current?.blur()
                  }
                }}
                className="flex items-center bg-zinc-900 rounded-full px-3 py-1.5 border border-zinc-800 focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400 transition-all"
              >
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar obras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0 ml-2 w-48 lg:w-64 placeholder:text-zinc-600"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </form>

              {searchQuery && (
                <div className="absolute top-full right-0 mt-2 w-[300px] lg:w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[400px]">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-6 text-zinc-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="overflow-y-auto">
                      {searchResults.map((novel) => (
                        <Link
                          key={novel.id}
                          to={`/novel/${novel.id}`}
                          onClick={() => setSearchQuery('')}
                          className="flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                        >
                          <img
                            src={getCoverUrl(novel)}
                            alt={novel.title}
                            className="w-10 h-14 object-cover rounded bg-zinc-800"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white truncate group-hover:text-lime-400">
                              {novel.title}
                            </h4>
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {novel.expand?.author?.name || 'Autor'}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-zinc-500">
                      Nenhum resultado encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full"
            >
              <Link to="/explore">
                <Search className="w-5 h-5" />
              </Link>
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-zinc-400 hover:text-white rounded-full"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-0 right-0 w-4 h-4 bg-lime-400 rounded-full text-[10px] text-black font-bold flex items-center justify-center">
                    3
                  </span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="w-9 h-9 border-2 border-lime-400 transition-colors cursor-pointer bg-zinc-800 hover:opacity-80">
                      <AvatarImage
                        src={
                          user?.avatar
                            ? pb.files.getURL(user, user.avatar)
                            : `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`
                        }
                      />
                      <AvatarFallback>
                        {user?.name?.charAt(0).toUpperCase() ||
                          user?.email?.charAt(0).toUpperCase() ||
                          'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-zinc-900 border-zinc-800 text-white rounded-xl shadow-xl"
                  >
                    <div className="flex items-center gap-2 p-3">
                      <Avatar className="w-8 h-8 bg-zinc-800 border border-zinc-700">
                        <AvatarImage
                          src={
                            user?.avatar
                              ? pb.files.getURL(user, user.avatar)
                              : `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`
                          }
                        />
                        <AvatarFallback>
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-0.5 leading-none min-w-0">
                        <p className="font-medium text-sm text-zinc-100 truncate">
                          {user?.name || 'Usuário'}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 rounded-md m-1"
                    >
                      <Link to="/profile" className="flex items-center w-full text-zinc-300">
                        <User className="mr-2 h-4 w-4" />
                        <span>Meu Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-zinc-800 focus:bg-zinc-800 rounded-md m-1"
                    >
                      <Link to="/settings" className="flex items-center w-full text-zinc-300">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Configurações</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-red-400 hover:bg-red-400/10 focus:bg-red-400/10 focus:text-red-400 rounded-md m-1"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsAuthOpen(true)}
                  className="border-zinc-700 hover:bg-zinc-800 text-white bg-transparent rounded-xl h-10 px-6"
                >
                  Entrar
                </Button>
                <Button
                  onClick={() => setIsAuthOpen(true)}
                  className="bg-lime-400 text-black hover:bg-lime-500 font-bold rounded-xl h-10 px-6"
                >
                  Cadastrar
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <AuthModal isOpen={isAuthOpen} onOpenChange={setIsAuthOpen} />
    </>
  )
}
