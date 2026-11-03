import { cafeCopy, displayName } from '@/lib/cafes'
import { explainQuery } from '@/lib/query'
import { createClient } from '@/lib/server'
import type { CafeOption, Chain, Run, Step, Suggestion } from '@/lib/types'

const SUGGEST_CHAIN = 'Suggest a cafe'

export async function loadChains() {
  const supabase = await createClient()
  const chains = await supabase
    .from('prompt_chains')
    .select('id, name, description, created_at')
    .order('name')
  if (chains.error) {
    return { chains: [] as Chain[], counts: new Map<number, number>(), error: explainQuery(chains.error.message) }
  }

  const steps = await supabase.from('prompt_chain_steps').select('chain_id')
  const counts = new Map<number, number>()
  if (!steps.error) {
    for (const step of steps.data ?? []) {
      const chainId = step.chain_id as number
      counts.set(chainId, (counts.get(chainId) ?? 0) + 1)
    }
  }

  return {
    chains: (chains.data ?? []) as Chain[],
    counts,
    error: steps.error ? explainQuery(steps.error.message) : null,
  }
}

export async function loadChain(id: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prompt_chains')
    .select('id, name, description, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { chain: null, error: explainQuery(error.message) }
  }
  return { chain: (data as Chain | null) ?? null, error: null }
}

export async function loadSteps(chainId: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('prompt_chain_steps')
    .select('id, chain_id, position, role, content')
    .eq('chain_id', chainId)
    .order('position')

  if (error) {
    return { steps: [] as Step[], error: explainQuery(error.message) }
  }
  return { steps: (data ?? []) as Step[], error: null }
}

export async function loadCafes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cafe')
    .select('id, name, description, neighborhood, vibe')
    .order('name')

  if (error) {
    return { cafes: [] as CafeOption[], error: explainQuery(error.message) }
  }

  const cafes = (data ?? []).map((cafe) => {
    const copy = cafeCopy(cafe.name as string, cafe)
    return {
      id: cafe.id as number,
      name: displayName(cafe.name as string),
      vibe: copy.vibe,
      address: copy.address,
      description: copy.description,
      neighborhood: copy.neighborhood,
      image: copy.image,
    }
  })

  return { cafes, error: null }
}

export async function loadRuns(chainId: number) {
  const supabase = await createClient()
  const requests = await supabase
    .from('generation_requests')
    .select('id, prompt, created_at')
    .eq('chain_id', chainId)
    .order('created_at', { ascending: false })
    .limit(40)

  if (requests.error) {
    return { runs: [] as Run[], error: explainQuery(requests.error.message) }
  }

  const ids = (requests.data ?? []).map((row) => row.id as number)
  const responses = ids.length
    ? await supabase
        .from('llm_responses')
        .select('request_id, content, model_id, created_at')
        .in('request_id', ids)
    : { data: [], error: null }

  if (responses.error) {
    return { runs: [] as Run[], error: explainQuery(responses.error.message) }
  }

  const modelIds = [
    ...new Set(
      (responses.data ?? [])
        .map((row) => row.model_id as number | null)
        .filter((id): id is number => typeof id === 'number')
    ),
  ]
  const models = modelIds.length
    ? await supabase.from('llm_models').select('id, name').in('id', modelIds)
    : { data: [], error: null }
  const modelNames = new Map(
    (models.data ?? []).map((model) => [model.id as number, model.name as string])
  )

  const latest = new Map<number, { content: string; modelName: string | null; createdAt: string }>()
  for (const response of responses.data ?? []) {
    const requestId = response.request_id as number
    const createdAt = response.created_at as string
    const current = latest.get(requestId)
    if (!current || createdAt > current.createdAt) {
      const modelId = response.model_id as number | null
      latest.set(requestId, {
        content: response.content as string,
        modelName: modelId ? modelNames.get(modelId) ?? null : null,
        createdAt,
      })
    }
  }

  const runs: Run[] = (requests.data ?? []).map((request) => {
    const response = latest.get(request.id as number)
    return {
      id: request.id as number,
      prompt: request.prompt as string,
      content: response?.content ?? '',
      modelName: response?.modelName ?? null,
      createdAt: request.created_at as string,
    }
  })

  return { runs, error: null }
}

export async function loadSuggestions(chainName: string, cafes: CafeOption[]) {
  if (chainName !== SUGGEST_CHAIN) {
    return { suggestions: null as Suggestion[] | null, error: null }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cafe_suggestions')
    .select('id, vibes, note, cafe_id, reason, outcome, created_at')
    .order('created_at', { ascending: false })
    .limit(40)

  if (error) {
    return { suggestions: [] as Suggestion[], error: explainQuery(error.message) }
  }

  const names = new Map(cafes.map((cafe) => [cafe.id, cafe.name]))
  const suggestions: Suggestion[] = (data ?? []).map((row) => ({
    id: row.id as number,
    vibes: (row.vibes as string[] | null) ?? [],
    note: (row.note as string) ?? '',
    cafeId: row.cafe_id as number,
    cafeName: names.get(row.cafe_id as number) ?? `Cafe ${row.cafe_id}`,
    reason: row.reason as string,
    outcome: row.outcome as Suggestion['outcome'],
    createdAt: row.created_at as string,
  }))

  return { suggestions, error: null }
}

export { SUGGEST_CHAIN }
