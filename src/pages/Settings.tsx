import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Camera, Save } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar
      ? pb.files.getURL(user, user.avatar)
      : `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`,
  )
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update initial state if user is somehow loaded after mount
  useEffect(() => {
    if (user && !name && !avatarFile) {
      setName(user.name || '')
      if (user.avatar) {
        setAvatarPreview(pb.files.getURL(user, user.avatar))
      }
    }
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5242880) {
        // 5MB limit check client-side
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 5MB.',
          variant: 'destructive',
        })
        return
      }
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('name', name)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      await pb.collection('users').update(user.id, formData)

      // Refresh auth store to update the context globally
      await pb.collection('users').authRefresh()

      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      })
      setAvatarFile(null) // Reset file to avoid re-uploading if submitting again without change
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao salvar',
        description:
          error?.response?.message || 'Ocorreu um erro ao atualizar o perfil. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl min-h-[calc(100vh-4rem)]">
      <h1 className="text-3xl font-black text-white mb-8">Configurações da Conta</h1>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Perfil Público</CardTitle>
          <CardDescription className="text-zinc-400">
            Atualize suas informações pessoais que serão exibidas para outros usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div
                className="relative w-24 h-24 group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Avatar className="w-24 h-24 border-2 border-zinc-700 bg-zinc-800 transition-all group-hover:border-lime-400">
                  <AvatarImage src={avatarPreview || ''} className="object-cover" />
                  <AvatarFallback className="text-2xl">
                    {name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex flex-col items-center justify-center">
                  <Camera className="w-6 h-6 text-white mb-1" />
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold text-white mb-1">Foto de Perfil</h3>
                <p className="text-sm text-zinc-400 mb-3">
                  Recomendado: Imagem quadrada (JPG ou PNG). Tamanho máximo 5MB.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Alterar Imagem
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400">
                  Email
                </Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-zinc-800/50 border-zinc-800 text-zinc-500 cursor-not-allowed"
                />
                <p className="text-xs text-zinc-500">O endereço de email não pode ser alterado.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-200">
                  Nome de Exibição
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="bg-zinc-800 border-zinc-700 text-white focus-visible:ring-lime-400 focus-visible:border-lime-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={loading || (!name.trim() && !avatarFile)}
                className="bg-lime-400 text-black hover:bg-lime-500 font-bold px-8"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
