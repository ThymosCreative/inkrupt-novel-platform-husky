import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export interface FastPass {
  amount: number
  expires_at: number
}

export interface Wallet {
  coins: number
  fast_passes: FastPass[]
  power_stones: number
  last_checkin: number
  last_vote_reward: number
  exp: number
  level: number
}

export interface Transaction {
  amount: number
  type: 'coin' | 'fast_pass' | 'exp'
  description: string
  created_at: number
}

export interface UnlockedChapter {
  chapter_id: string
  unlocked_at: number
  method: 'coin' | 'fast_pass'
}

export interface Vote {
  novel_id: string
  voted_at: number
}

interface WalletContextType {
  wallet: Wallet
  transactions: Transaction[]
  unlockedChapters: UnlockedChapter[]
  votes: Vote[]
  buyCoins: (amount: number, price: number) => Promise<void>
  addExp: (amount: number, reason: string) => Promise<void>
  voteNovel: (novelId: string) => Promise<boolean>
  unlockChapter: (chapterId: string, method: 'coin' | 'fast_pass', cost: number) => Promise<boolean>
  isChapterUnlocked: (chapterId: string) => boolean
  totalFastPasses: number
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

const getLevel = (exp: number) => {
  if (exp >= 1000) return 5
  if (exp >= 600) return 4
  if (exp >= 300) return 3
  if (exp >= 100) return 2
  return 1
}

const getDailyStones = (level: number) => {
  if (level >= 5) return 3
  if (level >= 4) return 2
  return 1
}

/**
 * Safely normalise the fast_passes value coming from PocketBase.
 * A brand-new user record may have null / undefined / non-array for this
 * JSON field. Always coerce to a valid FastPass[] before iterating.
 */
const normaliseFastPasses = (raw: unknown): FastPass[] => {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (fp): fp is FastPass =>
      fp !== null &&
      typeof fp === 'object' &&
      typeof (fp as FastPass).amount === 'number' &&
      typeof (fp as FastPass).expires_at === 'number',
  )
}

const applyLevelUp = (
  currentExp: number,
  gainedExp: number,
  currentFps: FastPass[],
  currentStones: number,
): { newExp: number; newLevel: number; newFps: FastPass[]; newStones: number; levelled: boolean } => {
  const oldLevel = getLevel(currentExp)
  const newExp = currentExp + gainedExp
  const newLevel = getLevel(newExp)

  let newFps = normaliseFastPasses(currentFps).filter((fp) => fp.expires_at > Date.now())
  let newStones = currentStones

  if (newLevel > oldLevel) {
    if (newLevel === 2) newFps.push({ amount: 3, expires_at: Date.now() + 7 * 86400000 })
    if (newLevel === 3) newFps.push({ amount: 5, expires_at: Date.now() + 7 * 86400000 })
    if (newLevel === 4) {
      newFps.push({ amount: 5, expires_at: Date.now() + 7 * 86400000 })
      newStones += 1
    }
    if (newLevel === 5) {
      newFps.push({ amount: 10, expires_at: Date.now() + 7 * 86400000 })
      newStones += 2
    }
  }

  return { newExp, newLevel, newFps, newStones, levelled: newLevel > oldLevel }
}

const defaultWallet: Wallet = {
  coins: 0,
  fast_passes: [],
  power_stones: 1,
  last_checkin: 0,
  last_vote_reward: 0,
  exp: 0,
  level: 1,
}

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()

  const wallet: Wallet = user
    ? {
        coins: user.coins || 0,
        fast_passes: normaliseFastPasses(user.fast_passes),
        power_stones: user.power_stones ?? 1,
        last_checkin: user.last_checkin || 0,
        last_vote_reward: user.last_vote_reward || 0,
        exp: user.exp || 0,
        level: user.level || 1,
      }
    : defaultWallet

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('inkrupt_transactions')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [unlockedChapters, setUnlockedChapters] = useState<UnlockedChapter[]>([])

  const [votes, setVotes] = useState<Vote[]>(() => {
    try {
      const saved = localStorage.getItem('inkrupt_votes')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem('inkrupt_transactions', JSON.stringify(transactions))
  }, [transactions])

  useEffect(() => {
    localStorage.setItem('inkrupt_votes', JSON.stringify(votes))
  }, [votes])

  useEffect(() => {
    if (user) {
      pb.collection('unlocked_chapters')
        .getFullList({ filter: `user = "${user.id}"` })
        .then((records) => {
          setUnlockedChapters(
            records.map((r) => ({
              chapter_id: r.chapter,
              unlocked_at: new Date(r.created).getTime(),
              method: 'coin' as const,
            })),
          )
        })
        .catch(console.error)
    } else {
      setUnlockedChapters([])
    }
  }, [user?.id])

  const addTransaction = (amount: number, type: Transaction['type'], description: string) => {
    setTransactions((prev) => [{ amount, type, description, created_at: Date.now() }, ...prev])
  }

  const addExp = async (amount: number, reason: string) => {
    if (!user) return
    const { newExp, newLevel, newFps, newStones, levelled } = applyLevelUp(
      wallet.exp,
      amount,
      wallet.fast_passes,
      wallet.power_stones,
    )
    if (levelled) setTimeout(() => toast.success(`Parabéns! Você subiu para o Nível ${newLevel}!`), 500)
    try {
      await pb.collection('users').update(user.id, {
        exp: newExp,
        level: newLevel,
        fast_passes: newFps,
        power_stones: newStones,
      })
      addTransaction(amount, 'exp', reason)
    } catch (e) {
      console.error(e)
    }
  }

  // Track which user IDs have had check-in attempted this session so the
  // check-in does NOT re-fire every time authRefresh replaces the user object
  // with a fresh reference.
  const checkinDoneRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id) return
    const today = new Date().setHours(0, 0, 0, 0)
    if (wallet.last_checkin >= today) return
    if (checkinDoneRef.current.has(user.id)) return

    checkinDoneRef.current.add(user.id)

    const { newExp, newLevel, newFps, newStones, levelled } = applyLevelUp(
      wallet.exp,
      10,
      wallet.fast_passes,
      getDailyStones(getLevel(wallet.exp)),
    )

    // Always add 1 new fast pass from the check-in reward
    const checkinFp: FastPass = { amount: 1, expires_at: Date.now() + 7 * 86400000 }
    const finalFps = [...newFps, checkinFp]

    if (levelled) setTimeout(() => toast.success(`Parabéns! Você subiu para o Nível ${newLevel}!`), 500)

    pb.collection('users')
      .update(user.id, {
        last_checkin: Date.now(),
        power_stones: newStones,
        fast_passes: finalFps,
        exp: newExp,
        level: newLevel,
      })
      .then(() => {
        addTransaction(1, 'fast_pass', 'Daily Check-in')
        addTransaction(10, 'exp', 'Daily Check-in')
        toast.success('Check-in Diário! +1 Fast Pass, +10 EXP')
        // Force-sync user state after check-in so wallet reflects new fast_passes
        pb.collection('users').authRefresh().catch(console.error)
      })
      .catch((err) => {
        checkinDoneRef.current.delete(user.id)
        console.error('[check-in] failed:', err)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const buyCoins = async (amount: number, price: number) => {
    if (!user) return
    try {
      await pb.collection('users').update(user.id, { coins: wallet.coins + amount })
      addTransaction(amount, 'coin', `Compra de Pacote (R$ ${price.toFixed(2)})`)
      toast.success(`${amount} Coins comprados com sucesso!`)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao comprar coins.')
    }
  }

  const voteNovel = async (novelId: string) => {
    if (!user) {
      toast.error('Faça login para votar.')
      return false
    }
    const today = new Date().setHours(0, 0, 0, 0)
    if (wallet.power_stones <= 0) {
      toast.error('Você não tem mais Power Stones hoje.')
      return false
    }
    if (votes.some((v) => v.novel_id === novelId && v.voted_at > today)) {
      toast.error('Você já votou nesta obra hoje.')
      return false
    }

    let extraFp: FastPass[] = []
    let grantedFp = false
    if (wallet.last_vote_reward < today) {
      extraFp.push({ amount: 1, expires_at: Date.now() + 7 * 86400000 })
      grantedFp = true
    }

    try {
      const { newExp, newLevel, newFps, newStones, levelled } = applyLevelUp(
        wallet.exp,
        5,
        wallet.fast_passes,
        wallet.power_stones,
      )
      const nextFps = [...newFps, ...extraFp]
      const nextStones = newStones - 1

      if (levelled) setTimeout(() => toast.success(`Parabéns! Você subiu para o Nível ${newLevel}!`), 500)

      await pb.collection('users').update(user.id, {
        power_stones: nextStones,
        last_vote_reward: grantedFp ? Date.now() : wallet.last_vote_reward,
        fast_passes: nextFps,
        exp: newExp,
        level: newLevel,
      })

      if (grantedFp) {
        setTimeout(() => toast.success('Voto registrado! +1 Fast Pass, +5 EXP'), 100)
        addTransaction(1, 'fast_pass', 'Recompensa de Voto')
      } else {
        setTimeout(() => toast.success('Voto registrado! +5 EXP'), 100)
      }

      setVotes((prev) => [{ novel_id: novelId, voted_at: Date.now() }, ...prev])
      addTransaction(5, 'exp', 'Voto com Power Stone')

      pb.send('/backend/v1/vote', {
        method: 'POST',
        body: JSON.stringify({ novel_id: novelId }),
      }).catch(console.error)

      return true
    } catch (e) {
      console.error(e)
      toast.error('Erro ao registrar voto.')
      return false
    }
  }

  /**
   * Unlock a premium chapter using either Coins or Fast Passes.
   *
   * This is handled entirely on the frontend via direct PocketBase SDK calls
   * (no custom backend hook required). The unlocked_chapters collection has a
   * UNIQUE index on (user, chapter) so duplicate unlocks are safe.
   */
  const unlockChapter = async (chapterId: string, method: 'coin' | 'fast_pass', cost: number) => {
    if (!user) return false

    try {
      // ── 1. Check if already unlocked (idempotent) ──────────────────────────
      try {
        await pb
          .collection('unlocked_chapters')
          .getFirstListItem(`user = "${user.id}" && chapter = "${chapterId}"`)
        // Already unlocked – add to local state if missing and succeed
        setUnlockedChapters((prev) =>
          prev.some((c) => c.chapter_id === chapterId)
            ? prev
            : [...prev, { chapter_id: chapterId, unlocked_at: Date.now(), method }],
        )
        return true
      } catch (_) {
        // Not yet unlocked – continue
      }

      // ── 2. Deduct cost from wallet ──────────────────────────────────────────
      if (method === 'fast_pass') {
        const activeFps = normaliseFastPasses(wallet.fast_passes).filter(
          (fp) => fp.expires_at > Date.now(),
        )
        const total = activeFps.reduce((a, b) => a + b.amount, 0)

        if (total < 1) {
          toast.error('Fast Passes insuficientes.')
          return false
        }

        // Deduct 1 from the earliest-expiring batch
        activeFps.sort((a, b) => a.expires_at - b.expires_at)
        const updatedFps = activeFps.map((fp, i) =>
          i === 0 ? { ...fp, amount: fp.amount - 1 } : fp,
        ).filter((fp) => fp.amount > 0)

        await pb.collection('users').update(user.id, { fast_passes: updatedFps })
        addTransaction(-1, 'fast_pass', `Desbloqueio: Cap ${chapterId}`)
      } else {
        // coin
        if (wallet.coins < cost) {
          toast.error('Coins insuficientes.')
          return false
        }

        const { newExp, newLevel, newFps, newStones, levelled } = applyLevelUp(
          wallet.exp,
          3,
          wallet.fast_passes,
          wallet.power_stones,
        )
        if (levelled) setTimeout(() => toast.success(`Parabéns! Você subiu para o Nível ${newLevel}!`), 500)

        const updates: Record<string, unknown> = {
          coins: wallet.coins - cost,
          exp: newExp,
          level: newLevel,
        }
        if (levelled) {
          updates.fast_passes = newFps
          updates.power_stones = newStones
        }

        await pb.collection('users').update(user.id, updates)
        addTransaction(-cost, 'coin', `Desbloqueio: Cap ${chapterId}`)
        addTransaction(3, 'exp', 'Desbloqueio com Coins')
      }

      // ── 3. Register unlock in PocketBase ───────────────────────────────────
      await pb.collection('unlocked_chapters').create({
        user: user.id,
        chapter: chapterId,
      })

      // ── 4. Update local state and sync user ────────────────────────────────
      setUnlockedChapters((prev) => [
        ...prev,
        { chapter_id: chapterId, unlocked_at: Date.now(), method },
      ])

      await pb.collection('users').authRefresh()
      return true
    } catch (err: any) {
      console.error('[unlockChapter]', err)
      return false
    }
  }

  const isChapterUnlocked = (chapterId: string) => {
    return unlockedChapters.some((c) => c.chapter_id === chapterId)
  }

  const totalFastPasses = normaliseFastPasses(wallet.fast_passes)
    .filter((fp) => fp.expires_at > Date.now())
    .reduce((a, b) => a + b.amount, 0)

  return (
    <WalletContext.Provider
      value={{
        wallet,
        transactions,
        unlockedChapters,
        votes,
        buyCoins,
        addExp,
        voteNovel,
        unlockChapter,
        isChapterUnlocked,
        totalFastPasses,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) throw new Error('useWallet must be used within a WalletProvider')
  return context
}
