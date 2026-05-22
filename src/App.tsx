import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import Explore from './pages/Explore'
import Search from './pages/Search'
import Novel from './pages/Novel'
import Reader from './pages/Reader'
import ReadingList from './pages/ReadingList'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import Library from './pages/Library'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from './hooks/use-auth'
import { Navigate } from 'react-router-dom'
import { ThemeProvider } from './components/ThemeProvider'
import { WalletProvider } from './hooks/use-wallet'
import Store from './pages/Store'
import StudioDashboard from './pages/Studio/Dashboard'
import StudioNovel from './pages/Studio/Novel'
import StudioChapter from './pages/Studio/Chapter'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return null
  return isAuthenticated ? <>{children}</> : <Navigate to="/" />
}

const AuthorRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth()
  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/" />
  if (!user?.is_author) return <Navigate to="/" />
  return <>{children}</>
}

const App = () => (
  <AuthProvider>
    <WalletProvider>
      <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Index />} />
                <Route path="/explore" element={<Explore />} />
                <Route path="/search" element={<Search />} />
                <Route path="/novel/:id" element={<Novel />} />
                <Route path="/novel/:id/chapter/:num" element={<Reader />} />
                <Route path="/list/:id" element={<ReadingList />} />
                <Route
                  path="/store"
                  element={
                    <ProtectedRoute>
                      <Store />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/library"
                  element={
                    <ProtectedRoute>
                      <Library />
                    </ProtectedRoute>
                  }
                />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route
                  path="/studio"
                  element={
                    <AuthorRoute>
                      <StudioDashboard />
                    </AuthorRoute>
                  }
                />
                <Route
                  path="/studio/novel/:id"
                  element={
                    <AuthorRoute>
                      <StudioNovel />
                    </AuthorRoute>
                  }
                />
                <Route
                  path="/studio/novel/:id/chapter/:chapterId"
                  element={
                    <AuthorRoute>
                      <StudioChapter />
                    </AuthorRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </WalletProvider>
  </AuthProvider>
)

export default App
