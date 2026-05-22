import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { Eye, Star, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNumber, getCoverUrl } from '@/services/api'
import { Coins } from 'lucide-react'

interface NovelCardProps {
  novel: any
  layout?: 'vertical' | 'horizontal' | 'dense'
  className?: string
}

export function NovelCard({ novel, layout = 'vertical', className }: NovelCardProps) {
  if (!novel) return null

  const authorName = novel.expand?.author?.name || 'Autor'
  const coverUrl = getCoverUrl(novel)
  const isOriginal = novel.type === 'Original'

  if (layout === 'dense') {
    return (
      <Link
        to={`/novel/${novel.id}`}
        className={cn(
          'group flex items-center gap-4 bg-zinc-900/50 hover:bg-zinc-800/80 p-3 rounded-xl transition-all',
          className,
        )}
      >
        <img
          src={coverUrl}
          alt={novel.title}
          className="w-12 h-16 object-cover rounded-md shadow-md"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate group-hover:text-lime-400 transition-colors text-zinc-100">
            {novel.title}
          </h4>
          <p className="text-xs text-zinc-400 mt-1">{authorName}</p>
          <div className="flex items-center gap-2 mt-1">
            {novel.genres && novel.genres.length > 0 && (
              <Badge variant="outline" className="text-[9px] py-0 border-zinc-700 text-zinc-400">
                {novel.genres[0]}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <BookOpen className="w-3 h-3" /> {novel.chapter_count || 0}
            </span>
            {novel.has_premium && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                <Coins className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </Link>
    )
  }

  if (layout === 'horizontal') {
    return (
      <Link
        to={`/novel/${novel.id}`}
        className={cn(
          'group flex gap-4 bg-zinc-900 p-3 rounded-xl hover:scale-[1.02] transition-all duration-300',
          className,
        )}
      >
        <div className="relative shrink-0">
          <img
            src={coverUrl}
            alt={novel.title}
            className="w-24 h-36 object-cover rounded-lg shadow-lg"
          />
          {novel.is_hot && !novel.has_premium && (
            <Badge className="absolute -top-2 -left-2 bg-lime-400 text-black border-none">
              HOT
            </Badge>
          )}
          {novel.has_premium && (
            <Badge className="absolute -top-2 -left-2 bg-amber-500 text-black border-none flex items-center gap-1">
              <Coins className="w-3 h-3" /> Premium
            </Badge>
          )}
        </div>
        <div className="flex flex-col justify-center py-1 overflow-hidden">
          <h3 className="font-bold text-lg leading-tight group-hover:text-lime-400 transition-colors truncate text-zinc-100">
            {novel.title}
          </h3>
          <p className="text-sm text-zinc-400 mt-1 truncate">{authorName}</p>
          <div className="flex items-center gap-3 text-xs text-zinc-500 mt-3">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {formatNumber(novel.reads)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-lime-400" /> {novel.rating?.toFixed(1) || 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {novel.chapter_count || 0}
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{novel.description}</p>
          {novel.genres && novel.genres.length > 0 && (
            <div className="flex gap-1 mt-3">
              {novel.genres.slice(0, 3).map((g: string) => (
                <Badge
                  key={g}
                  variant="outline"
                  className="text-[10px] py-0 border-zinc-800 text-zinc-400"
                >
                  {g}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/novel/${novel.id}`}
      className={cn(
        'group flex flex-col gap-3 hover:scale-[1.02] transition-all duration-300',
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-lg">
        <img
          src={coverUrl}
          alt={novel.title}
          className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
        />
        {novel.has_premium && (
          <Badge className="absolute top-2 right-2 bg-amber-500 text-black border-none text-[10px] px-1.5 flex items-center gap-1">
            <Coins className="w-3 h-3" />
          </Badge>
        )}
        {isOriginal && !novel.has_premium && (
          <Badge className="absolute top-2 right-2 bg-white text-black border-none text-[10px] px-1.5">
            ORIGINAL
          </Badge>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-sm leading-tight group-hover:text-lime-400 transition-colors line-clamp-2 text-zinc-100">
          {novel.title}
        </h3>
        <p className="text-xs text-zinc-400 mt-1 truncate">{authorName}</p>
        <div className="flex items-center justify-between mt-2">
          {novel.genres && novel.genres.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1 border-zinc-800 text-zinc-400 truncate max-w-[60%]"
            >
              {novel.genres[0]}
            </Badge>
          )}
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <BookOpen className="w-3 h-3" /> {novel.chapter_count || 0}
          </span>
        </div>
      </div>
    </Link>
  )
}
