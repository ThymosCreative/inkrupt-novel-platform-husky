import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Search,
  Bell,
  X,
  Loader2,
  User,
  Settings as SettingsIcon,
  LogOut,
  Clock,
  BookOpen,
  LayoutDashboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AuthModal } from './AuthModal'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { searchNovels, getCoverUrl } from '@/services/api'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Coins, Zap } from 'lucide-react'
import { useWallet } from '@/hooks/use-wallet'

function timeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Agora mesmo'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`
  return `${Math.floor(diffInSeconds / 86400)}d atrás`
}

const getHistory = () => {
  try {
    const saved = localStorage.getItem('inkrupt_search_history')
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

const saveHistory = (q: string) => {
  if (!q.trim()) return
  const history = getHistory()
  const newHistory = [q, ...history.filter((h: string) => h !== q)].slice(0, 5)
  localStorage.setItem('inkrupt_search_history', JSON.stringify(newHistory))
}

export function Header() {
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const { user, isAuthenticated, signOut } = useAuth()
  const { wallet, totalFastPasses } = useWallet()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)

  const [libraryCount, setLibraryCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const loadNotifications = () => {
    if (!user) return
    pb.collection('notifications')
      .getList(1, 10, { filter: `user = "${user.id}"`, sort: '-created', expand: 'novel,chapter' })
      .then((res) => setNotifications(res.items))
      .catch(() => {})
  }

  useEffect(() => {
    loadNotifications()
  }, [user])

  useRealtime(
    'users',
    (e) => {
      if (user && e.record.id === user.id) {
        pb.collection('users').authRefresh().catch(console.error)
      }
    },
    !!user,
  )

  useRealtime(
    'notifications',
    (e) => {
      if (user && e.record.user === user.id) {
        loadNotifications()
      }
    },
    !!user,
  )

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      try {
        await pb.collection('notifications').update(notif.id, { is_read: true })
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
        )
      } catch (err) {
        console.error(err)
      }
    }
    const novelId = notif.novel
    const chapterNum = notif.expand?.chapter?.chapter_number
    if (novelId && chapterNum) {
      navigate(`/novel/${novelId}/chapter/${chapterNum}`)
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read)
    for (const n of unread) {
      try {
        await pb.collection('notifications').update(n.id, { is_read: true })
      } catch {
        /* intentionally ignored */
      }
    }
    loadNotifications()
  }

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'Explorar', path: '/explore' },
    ...(isAuthenticated
      ? [{ name: 'Biblioteca', path: '/library', badge: libraryCount > 0 ? libraryCount : null }]
      : []),
    ...(user?.is_author ? [{ name: 'Studio', path: '/studio' }] : []),
  ]

  useEffect(() => {
    if (user) {
      pb.collection('library_entries')
        .getFullList({ filter: `user = "${user.id}"` })
        .then((list) => setLibraryCount(list.length))
        .catch(() => {})
    } else {
      setLibraryCount(0)
    }
  }, [user])

  useRealtime(
    'library_entries',
    (e) => {
      if (!user) return
      if (e.action === 'create' && e.record.user === user.id) setLibraryCount((c) => c + 1)
      if (e.action === 'delete' && e.record.user === user.id)
        setLibraryCount((c) => Math.max(0, c - 1))
    },
    !!user,
  )

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setSelectedIndex(-1)
    const timer = setTimeout(() => {
      searchNovels({ query: searchQuery.trim(), limit: 5 })
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearching && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, searchResults.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, -1))
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0) {
          e.preventDefault()
          if (selectedIndex === searchResults.length) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
          } else {
            const novel = searchResults[selectedIndex]
            navigate(`/novel/${novel.id}`)
          }
          setSearchQuery('')
          saveHistory(searchQuery)
          setHistory(getHistory())
          searchRef.current?.blur()
          setIsMobileSearchOpen(false)
        }
      }
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent, query: string) => {
    e.preventDefault()
    if (query.trim()) {
      saveHistory(query.trim())
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setSearchQuery('')
      setIsMobileSearchOpen(false)
      searchRef.current?.blur()
      setHistory(getHistory())
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              to="/"
              className="text-2xl font-black tracking-tighter text-white hover:text-white/80 transition-colors"
            >
              INKRUPT.
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-white flex items-center gap-1.5',
                    location.pathname === link.path ? 'text-white font-bold' : 'text-zinc-400',
                  )}
                >
                  {link.name}
                  {link.badge != null && (
                    <span className="bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      {link.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block" ref={searchRef}>
              <form
                onSubmit={(e) => handleSearchSubmit(e, searchQuery)}
                className="flex items-center bg-zinc-900 rounded-full px-3 py-1.5 border border-transparent focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700 transition-all"
              >
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Pesquisar obras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="bg-transparent border-none text-sm text-white focus:outline-none focus:ring-0 ml-2 w-48 lg:w-64 placeholder:text-zinc-500"
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
                <div className="absolute top-full right-0 mt-2 w-[300px] lg:w-[400px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[500px]">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-8 text-white">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="overflow-y-auto">
                      <div className="p-2">
                        {searchResults.map((novel, idx) => (
                          <Link
                            key={novel.id}
                            to={`/novel/${novel.id}`}
                            onClick={() => {
                              setSearchQuery('')
                              saveHistory(searchQuery)
                              setHistory(getHistory())
                            }}
                            className={cn(
                              'flex items-center gap-3 p-2 rounded-lg transition-colors',
                              selectedIndex === idx ? 'bg-zinc-800' : 'hover:bg-zinc-800/60',
                            )}
                          >
                            <img
                              src={getCoverUrl(novel)}
                              alt={novel.title}
                              className="w-10 h-14 object-cover rounded bg-zinc-900 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-white">
                                {novel.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                                <span className="truncate">
                                  {novel.expand?.author?.name || 'Autor'}
                                </span>
                                {novel.rating ? (
                                  <span className="text-white font-medium flex items-center gap-0.5">
                                    ★ {novel.rating.toFixed(1)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                      <div className="p-2 border-t border-zinc-800 bg-zinc-900/50">
                        <Link
                          to={`/search?q=${encodeURIComponent(searchQuery)}`}
                          onClick={() => {
                            setSearchQuery('')
                            saveHistory(searchQuery)
                            setHistory(getHistory())
                          }}
                          className={cn(
                            'flex items-center justify-center p-2 text-sm font-bold text-white hover:opacity-80 rounded-lg transition-colors',
                            selectedIndex === searchResults.length
                              ? 'bg-zinc-800'
                              : 'hover:bg-zinc-800/60',
                          )}
                        >
                          Ver todos os resultados
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-zinc-400">
                      Nenhum resultado encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSearchOpen(true)}
              className="sm:hidden text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full"
            >
              <Search className="w-5 h-5" />
            </Button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <Link
                  to="/store"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 rounded-full text-sm transition-colors"
                >
                  <Coins className="w-4 h-4" />
                  {wallet?.coins || 0}
                </Link>
                <Link
                  to="/store"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-zinc-400 hover:text-zinc-200 rounded-full text-sm transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  {totalFastPasses || 0}
                </Link>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-full flex"
                    >
                      <Bell className="w-5 h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-white rounded-full text-[10px] text-black font-bold flex items-center justify-center">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="w-[calc(100vw-2rem)] sm:w-80 bg-zinc-950 border-zinc-800 p-0 rounded-xl shadow-xl overflow-hidden z-50"
                  >
                    <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/40">
                      <h3 className="font-bold text-white text-sm">Notificações</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-white hover:opacity-80 font-medium transition-colors"
                        >
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className="max-h-[350px] overflow-y-auto overscroll-contain">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                          <Bell className="w-8 h-8 text-zinc-500" />
                          <p className="text-sm text-zinc-400 font-medium">Nenhuma notificação</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={cn(
                              'p-4 border-b border-zinc-800/50 cursor-pointer transition-colors last:border-0 hover:bg-zinc-900',
                              !notif.is_read ? 'bg-zinc-800/50' : 'bg-transparent',
                            )}
                          >
                            <div className="flex gap-3">
                              <div
                                className={cn(
                                  'w-2 h-2 rounded-full mt-1.5 shrink-0',
                                  !notif.is_read ? 'bg-white' : 'bg-transparent',
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-300 leading-snug">
                                  <span className="font-bold text-white">
                                    {notif.expand?.novel?.title}
                                  </span>
                                  : {notif.message.replace('Um novo capítulo foi publicado: ', '')}
                                </p>
                                <span className="text-xs text-zinc-500 mt-1.5 block font-medium">
                                  {timeAgo(notif.created)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="w-9 h-9 border border-zinc-700 transition-colors cursor-pointer bg-zinc-900 hover:opacity-80">
                      <AvatarImage
                        src={
                          user?.avatar
                            ? pb.files.getURL(user, user.avatar)
                            : `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`
                        }
                      />
                      <AvatarFallback className="bg-zinc-800 text-white">
                        {user?.name?.charAt(0).toUpperCase() ||
                          user?.email?.charAt(0).toUpperCase() ||
                          'U'}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-zinc-950 border-zinc-800 text-white rounded-xl shadow-xl"
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
                        <AvatarFallback className="bg-zinc-700 text-white">
                          {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-0.5 leading-none min-w-0">
                        <p className="font-medium text-sm text-white truncate">
                          {user?.name || 'Usuário'}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="px-3 py-2 sm:hidden flex flex-col gap-2 font-bold text-sm">
                      <Link
                        to="/store"
                        className="flex items-center gap-2 text-amber-500 p-2 rounded-md hover:bg-amber-500/10"
                      >
                        <Coins className="w-4 h-4" /> {wallet?.coins || 0} Coins
                      </Link>
                      <Link
                        to="/store"
                        className="flex items-center gap-2 text-blue-500 p-2 rounded-md hover:bg-blue-500/10"
                      >
                        <Zap className="w-4 h-4" /> {totalFastPasses || 0} Fast Passes
                      </Link>
                    </div>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 rounded-md m-1 text-zinc-200"
                    >
                      <Link to={`/profile/${user?.id}`} className="flex items-center w-full">
                        <User className="mr-2 h-4 w-4" />
                        <span>Meu Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    {user?.is_author ? (
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 rounded-md m-1 text-zinc-200"
                      >
                        <Link to="/studio" className="flex items-center w-full">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Studio</span>
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        asChild
                        className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 rounded-md m-1 text-zinc-200"
                      >
                        <Link to="/profile" className="flex items-center w-full">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Tornar-se Autor</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 rounded-md m-1 text-zinc-200"
                    >
                      <Link to="/library" className="flex items-center w-full">
                        <BookOpen className="mr-2 h-4 w-4" />
                        <span>Biblioteca</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 rounded-md m-1 text-zinc-200"
                    >
                      <Link to="/settings" className="flex items-center w-full">
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Editar Perfil / Configurações</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer text-red-400 hover:bg-red-900/20 hover:text-red-300 focus:bg-red-900/20 focus:text-red-300 rounded-md m-1"
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
                  className="rounded-xl h-10 px-6 border-zinc-700 hover:bg-zinc-800 text-white"
                >
                  Entrar
                </Button>
                <Button
                  onClick={() => setIsAuthOpen(true)}
                  className="font-bold rounded-xl h-10 px-6 bg-white text-black hover:bg-zinc-200"
                >
                  Cadastrar
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col sm:hidden animate-in fade-in duration-200">
          <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSearchOpen(false)}
              className="shrink-0 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900"
            >
              <X className="w-5 h-5" />
            </Button>
            <form onSubmit={(e) => handleSearchSubmit(e, searchQuery)} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar obras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-zinc-900 border border-transparent rounded-full py-2 pl-9 pr-10 text-sm text-white focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {isSearching ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="flex flex-col gap-2">
                {searchResults.map((novel, idx) => (
                  <Link
                    key={novel.id}
                    to={`/novel/${novel.id}`}
                    onClick={() => {
                      setSearchQuery('')
                      setIsMobileSearchOpen(false)
                      saveHistory(searchQuery)
                      setHistory(getHistory())
                    }}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-xl transition-colors',
                      selectedIndex === idx ? 'bg-zinc-800' : 'hover:bg-zinc-900',
                    )}
                  >
                    <img
                      src={getCoverUrl(novel)}
                      className="w-12 h-16 object-cover rounded bg-zinc-900 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{novel.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        <span className="truncate">{novel.expand?.author?.name || 'Autor'}</span>
                        {novel.rating ? (
                          <span className="text-white font-medium flex items-center gap-0.5">
                            ★ {novel.rating.toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
                <Link
                  to={`/search?q=${encodeURIComponent(searchQuery)}`}
                  onClick={() => {
                    setSearchQuery('')
                    setIsMobileSearchOpen(false)
                    saveHistory(searchQuery)
                    setHistory(getHistory())
                  }}
                  className={cn(
                    'block p-3 mt-2 text-center text-sm font-bold text-white bg-zinc-800 rounded-xl transition-colors',
                    selectedIndex === searchResults.length ? 'bg-zinc-700' : 'hover:bg-zinc-700/80',
                  )}
                >
                  Ver todos os resultados
                </Link>
              </div>
            ) : history.length > 0 && !searchQuery ? (
              <div>
                <h4 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Buscas Recentes
                </h4>
                <div className="flex flex-col gap-1">
                  {history.map((h) => (
                    <button
                      key={h}
                      onClick={() => {
                        setSearchQuery(h)
                        searchRef.current?.querySelector('input')?.focus()
                      }}
                      className="text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <Search className="w-4 h-4 text-zinc-500" />
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            ) : searchQuery ? (
              <div className="text-center p-8 text-sm text-zinc-500">
                Nenhum resultado encontrado
              </div>
            ) : null}
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onOpenChange={setIsAuthOpen} />
    </>
  )
}

