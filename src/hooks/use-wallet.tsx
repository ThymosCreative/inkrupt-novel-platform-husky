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
  id?: string
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

  // ── Transactions — backed by PocketBase, no more localStorage ─────────────
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    if (!user?.id) {
      setTransactions([])
      return
    }
    pb.collection('transactions')
      .getFullList({
        filter: `user = "${user.id}"`,
        sort: '-created',
        perPage: 100,
      })
      .then((records) => {
        setTransactions(
          records.map((r) => ({
            id: r.id,
            amount: r.amount,
            type: r.type as Transaction['type'],
            description: r.description,
            created_at: new Date(r.created).getTime(),
          })),
        )
      })
      .catch(console.error)
  }, [user?.id])

  const addTransaction = async (amount: number, type: Transaction['type'], description: string) => {
    if (!user?.id) return
    const optimistic: Transaction = { amount, type, description, created_at: Date.now() }
    setTransactions((prev) => [optimistic, ...prev])
    try {
      const record = await pb.collection('transactions').create({
        user: user.id,
        amount,
        type,
        description,
      })
      // Replace optimistic entry with real record id
      setTransactions((prev) =>
        prev.map((t) =>
          t === optimistic ? { ...optimistic, id: record.id } : t,
        ),
      )
    } catch (e) {
      console.error('[addTransaction]', e)
    }
  }

  // ── Unlocked chapters — already in PocketBase ──────────────────────────────
  const [unlockedChapters, setUnlockedChapters] = useState<UnlockedChapter[]>([])

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

  // ── Votes — backed by PocketBase novel_votes collection ───────────────────
  const [votes, setVotes] = useState<Vote[]>([])

  useEffect(() => {
    if (!user?.id) {
      setVotes([])
      return
    }
    // Only load votes from today — that's all the frontend needs for the
    // "already voted today?" check. Keeps the query light.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    pb.collection('novel_votes')
      .getFullList({
        filter: `user = "${user.id}" && voted_at >= ${today.getTime()}`,
      })
      .then((records) => {
        setVotes(
          records.map((r) => ({
            novel_id: r.novel,
            voted_at: r.voted_at,
          })),
        )
      })
      .catch(console.error)
  }, [user?.id])

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
      await addTransaction(amount, 'exp', reason)
    } catch (e) {
      console.error(e)
    }
  }

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
      .then(async () => {
        await addTransaction(1, 'fast_pass', 'Check-in Diário')
        await addTransaction(10, 'exp', 'Check-in Diário')
        toast.success('Check-in Diário! +1 Fast Pass, +10 EXP')
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
      await addTransaction(amount, 'coin', `Compra de Pacote (R$ ${price.toFixed(2)})`)
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

      const nowTs = Date.now()

      // Record the vote in PocketBase (novel_votes collection)
      await pb.collection('novel_votes').create({
        user: user.id,
        novel: novelId,
        voted_at: nowTs,
      })

      if (grantedFp) {
        setTimeout(() => toast.success('Voto registrado! +1 Fast Pass, +5 EXP'), 100)
        await addTransaction(1, 'fast_pass', 'Recompensa de Voto')
      } else {
        setTimeout(() => toast.success('Voto registrado! +5 EXP'), 100)
      }

      setVotes((prev) => [{ novel_id: novelId, voted_at: nowTs }, ...prev])
      await addTransaction(5, 'exp', 'Voto com Power Stone')

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

  const unlockChapter = async (chapterId: string, method: 'coin' | 'fast_pass', cost: number) => {
    if (!user) return false

    try {
      try {
        await pb
          .collection('unlocked_chapters')
          .getFirstListItem(`user = "${user.id}" && chapter = "${chapterId}"`)
        setUnlockedChapters((prev) =>
          prev.some((c) => c.chapter_id === chapterId)
            ? prev
            : [...prev, { chapter_id: chapterId, unlocked_at: Date.now(), method }],
        )
        return true
      } catch (_) {}

      if (method === 'fast_pass') {
        const activeFps = normaliseFastPasses(wallet.fast_passes).filter(
          (fp) => fp.expires_at > Date.now(),
        )
        const total = activeFps.reduce((a, b) => a + b.amount, 0)

        if (total < 1) {
          toast.error('Fast Passes insuficientes.')
          return false
        }

        activeFps.sort((a, b) => a.expires_at - b.expires_at)
        const updatedFps = activeFps
          .map((fp, i) => (i === 0 ? { ...fp, amount: fp.amount - 1 } : fp))
          .filter((fp) => fp.amount > 0)

        await pb.collection('users').update(user.id, { fast_passes: updatedFps })
        await addTransaction(-1, 'fast_pass', `Desbloqueio: Cap ${chapterId}`)
      } else {
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
        await addTransaction(-cost, 'coin', `Desbloqueio: Cap ${chapterId}`)
        await addTransaction(3, 'exp', 'Desbloqueio com Coins')
      }

      await pb.collection('unlocked_chapters').create({
        user: user.id,
        chapter: chapterId,
      })

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
