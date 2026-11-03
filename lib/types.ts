export type Chain = {
  id: number
  name: string
  description: string
  created_at: string
}

export type StepRole = 'system' | 'user'

export type Step = {
  id: number
  chain_id: number
  position: number
  role: StepRole
  content: string
}

export type CafeOption = {
  id: number
  name: string
  vibe: string
  address: string
  description: string
  neighborhood: string
  image?: string
}

export type Run = {
  id: number
  prompt: string
  content: string
  modelName: string | null
  createdAt: string
}

export type Suggestion = {
  id: number
  vibes: string[]
  note: string
  cafeId: number
  cafeName: string
  reason: string
  outcome: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

export type RunInput = {
  vibes: string[]
  note: string
  cafeId: number | null
}
