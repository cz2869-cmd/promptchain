'use server'

import { requireAdmin } from '@/lib/auth'
import { loadCafes } from '@/lib/data'
import { runSteps } from '@/lib/generate'
import {
  fill,
  formatCafe,
  formatCatalog,
  isStepRole,
  moved,
  parseOutput,
  summarizeRun,
  tokensIn,
  validateRun,
  VIBES,
} from '@/lib/prompt'
import { explainQuery } from '@/lib/query'
import { createClient } from '@/lib/server'
import type { Run, RunInput, Step, StepRole } from '@/lib/types'
import { revalidatePath } from 'next/cache'

type Writer =
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; error?: undefined }
  | { supabase?: undefined; userId?: undefined; error: string }

async function writer(): Promise<Writer> {
  const access = await requireAdmin()
  if (!access.ok) {
    return { error: 'Only a superadmin can change prompt chains.' }
  }
  return { supabase: await createClient(), userId: access.userId }
}

function cleanName(value: string) {
  const name = value.trim()
  if (!name) {
    return { error: 'A chain needs a name.' }
  }
  if (name.length > 80) {
    return { error: 'Keep the chain name under 80 characters.' }
  }
  return { name }
}

function cleanDescription(value: string) {
  const description = value.trim()
  if (description.length > 500) {
    return { error: 'Keep the description under 500 characters.' }
  }
  return { description }
}

function cleanStep(role: string, content: string) {
  if (!isStepRole(role)) {
    return { error: 'A step is either system or user.' }
  }
  const text = content.trim()
  if (!text) {
    return { error: 'Write the step before saving it.' }
  }
  if (text.length > 8000) {
    return { error: 'That step is too long to save.' }
  }
  return { role, content: text }
}

async function writePositions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderedIds: number[]
) {
  for (const id of orderedIds) {
    const { error } = await supabase
      .from('prompt_chain_steps')
      .update({ position: -id })
      .eq('id', id)
    if (error) {
      return explainQuery(error.message)
    }
  }
  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from('prompt_chain_steps')
      .update({ position: index + 1 })
      .eq('id', orderedIds[index])
    if (error) {
      return explainQuery(error.message)
    }
  }
  return null
}

function refreshChain(chainId: number) {
  revalidatePath('/chains')
  revalidatePath(`/chains/${chainId}`)
}

export async function createChain(name: string, description: string) {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }
  const cleanedName = cleanName(name)
  if ('error' in cleanedName) {
    return { error: cleanedName.error }
  }
  const cleanedDescription = cleanDescription(description)
  if ('error' in cleanedDescription) {
    return { error: cleanedDescription.error }
  }

  const { data, error } = await client.supabase
    .from('prompt_chains')
    .insert({ name: cleanedName.name, description: cleanedDescription.description })
    .select('id')
    .single()

  if (error || !data) {
    return { error: explainQuery(error?.message ?? 'The chain was not created.') }
  }
  revalidatePath('/chains')
  return { id: data.id as number }
}

export async function updateChain(id: number, name: string, description: string) {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }
  const cleanedName = cleanName(name)
  if ('error' in cleanedName) {
    return { error: cleanedName.error }
  }
  const cleanedDescription = cleanDescription(description)
  if ('error' in cleanedDescription) {
    return { error: cleanedDescription.error }
  }

  const { data, error } = await client.supabase
    .from('prompt_chains')
    .update({ name: cleanedName.name, description: cleanedDescription.description })
    .eq('id', id)
    .select('id')

  if (error) {
    return { error: explainQuery(error.message) }
  }
  if (!data?.length) {
    return { error: 'That chain was not updated.' }
  }
  refreshChain(id)
  return {}
}

export async function deleteChain(id: number) {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }
  const { data, error } = await client.supabase
    .from('prompt_chains')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) {
    return { error: explainQuery(error.message) }
  }
  if (!data?.length) {
    return { error: 'That chain was not deleted.' }
  }
  revalidatePath('/chains')
  return {}
}

export async function createStep(chainId: number, role: string, content: string) {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }
  const cleaned = cleanStep(role, content)
  if ('error' in cleaned) {
    return { error: cleaned.error }
  }

  const existing = await client.supabase
    .from('prompt_chain_steps')
    .select('position')
    .eq('chain_id', chainId)
    .order('position', { ascending: false })
    .limit(1)

  if (existing.error) {
    return { error: explainQuery(existing.error.message) }
  }

  const position = ((existing.data?.[0]?.position as number | undefined) ?? 0) + 1
  const { data, error } = await client.supabase
    .from('prompt_chain_steps')
    .insert({
      chain_id: chainId,
      position,
      role: cleaned.role,
      content: cleaned.content,
    })
    .select('id, chain_id, position, role, content')
    .single()

  if (error || !data) {
    return { error: explainQuery(error?.message ?? 'The step was not created.') }
  }
  refreshChain(chainId)
  return { step: data as Step }
}

export async function updateStep(id: number, role: string, content: string) {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }
  const cleaned = cleanStep(role, content)
  if ('error' in cleaned) {
    return { error: cleaned.error }
  }

  const { data, error } = await client.supabase
    .from('prompt_chain_steps')
    .update({ role: cleaned.role, content: cleaned.content })
    .eq('id', id)
    .select('id, chain_id')

  if (error) {
    return { error: explainQuery(error.message) }
  }
  if (!data?.length) {
    return { error: 'That step was not updated.' }
  }
  refreshChain(data[0].chain_id as number)
  return {}
}

export async function deleteStep(id: number) {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }

  const current = await client.supabase
    .from('prompt_chain_steps')
    .select('id, chain_id')
    .eq('id', id)
    .maybeSingle()

  if (current.error || !current.data) {
    return { error: explainQuery(current.error?.message ?? 'That step was not found.') }
  }

  const chainId = current.data.chain_id as number
  const { error } = await client.supabase.from('prompt_chain_steps').delete().eq('id', id)
  if (error) {
    return { error: explainQuery(error.message) }
  }

  const remaining = await client.supabase
    .from('prompt_chain_steps')
    .select('id')
    .eq('chain_id', chainId)
    .order('position')

  if (remaining.error) {
    return { error: explainQuery(remaining.error.message) }
  }

  const positionError = await writePositions(
    client.supabase,
    (remaining.data ?? []).map((step) => step.id as number)
  )
  if (positionError) {
    return { error: positionError }
  }
  refreshChain(chainId)
  return {}
}

export async function moveStep(id: number, direction: 'up' | 'down') {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }

  const current = await client.supabase
    .from('prompt_chain_steps')
    .select('id, chain_id')
    .eq('id', id)
    .maybeSingle()

  if (current.error || !current.data) {
    return { error: explainQuery(current.error?.message ?? 'That step was not found.') }
  }

  const chainId = current.data.chain_id as number
  const steps = await client.supabase
    .from('prompt_chain_steps')
    .select('id')
    .eq('chain_id', chainId)
    .order('position')

  if (steps.error) {
    return { error: explainQuery(steps.error.message) }
  }

  const ids = (steps.data ?? []).map((step) => step.id as number)
  const next = moved(ids, ids.indexOf(id), direction)
  if (!next) {
    return { error: direction === 'up' ? 'That step is already first.' : 'That step is already last.' }
  }

  const positionError = await writePositions(client.supabase, next)
  if (positionError) {
    return { error: positionError }
  }
  refreshChain(chainId)
  return {}
}

async function modelsFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chainId: number
) {
  const mix = await supabase
    .from('prompt_chain_mix')
    .select('model_id, weight')
    .eq('chain_id', chainId)
    .eq('is_active', true)

  if (mix.error || !mix.data?.length) {
    return []
  }

  const ids = mix.data.map((row) => row.model_id as number)
  const models = await supabase.from('llm_models').select('id, model_key').in('id', ids)
  if (models.error) {
    return []
  }
  const keys = new Map(
    (models.data ?? []).map((model) => [model.id as number, model.model_key as string])
  )
  return mix.data
    .slice()
    .sort((a, b) => Number(b.weight) - Number(a.weight))
    .map((row) => keys.get(row.model_id as number))
    .filter((key): key is string => Boolean(key))
}

export async function generateFromChain(chainId: number, input: RunInput) {
  const client = await writer()
  if (!client.supabase) {
    return { error: client.error }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { error: 'The Gemini key is missing on this server, so this chain cannot run yet.' }
  }

  const chain = await client.supabase
    .from('prompt_chains')
    .select('id, name')
    .eq('id', chainId)
    .maybeSingle()
  if (chain.error || !chain.data) {
    return { error: explainQuery(chain.error?.message ?? 'That chain was not found.') }
  }

  const stepsResult = await client.supabase
    .from('prompt_chain_steps')
    .select('id, chain_id, position, role, content')
    .eq('chain_id', chainId)
    .order('position')

  if (stepsResult.error) {
    return { error: explainQuery(stepsResult.error.message) }
  }
  const steps = (stepsResult.data ?? []) as Step[]
  if (steps.length === 0) {
    return { error: 'Add a step before generating.' }
  }

  const cafeResult = await loadCafes()
  const cafes = cafeResult.cafes
  const chosenVibes = VIBES.filter((vibe) => input.vibes.includes(vibe))
  const note = input.note.trim().slice(0, 500)
  const cafe = cafes.find((item) => item.id === input.cafeId) ?? null
  const found = tokensIn(steps.map((step) => step.content))
  const invalid = validateRun(found, { vibes: [...chosenVibes], note, cafeId: cafe?.id ?? null })
  if (invalid) {
    return { error: invalid }
  }

  const catalog = formatCatalog(cafes)
  const cafeBlock = cafe ? formatCafe(cafe) : ''
  const run = await runSteps(apiKey, await modelsFor(client.supabase, chainId), steps, (content, previous) =>
    fill(content, {
      vibes: chosenVibes.length > 0 ? chosenVibes.join(', ') : 'none',
      note: note || 'nothing extra',
      catalog,
      cafe: cafeBlock,
      previous,
      input: note,
    })
  )

  if ('error' in run && run.error) {
    return { error: run.error }
  }

  const finalText = run.outputs.at(-1)?.text ?? ''
  if (!finalText) {
    return { error: 'The chain did not return any media.' }
  }

  const prompt = summarizeRun(
    { vibes: [...chosenVibes], note, cafeId: cafe?.id ?? null },
    cafe?.name ?? null,
    run.filled,
    run.outputs.slice(0, -1)
  )
  const modelKey = run.model ?? run.outputs.at(-1)?.model ?? ''
  const modelRow = modelKey
    ? await client.supabase
        .from('llm_models')
        .select('id, name')
        .eq('model_key', modelKey)
        .maybeSingle()
    : { data: null, error: null }

  const saved = await client.supabase
    .from('generation_requests')
    .insert({
      user_id: client.userId,
      chain_id: chainId,
      prompt,
    })
    .select('id, created_at')
    .single()

  let warning: string | undefined
  if (saved.error || !saved.data) {
    warning = explainQuery(saved.error?.message ?? 'The answer was not saved.')
  } else {
    const response = await client.supabase.from('llm_responses').insert({
      request_id: saved.data.id,
      model_id: (modelRow.data?.id as number | undefined) ?? null,
      content: finalText.slice(0, 8000),
    })
    if (response.error) {
      warning = explainQuery(response.error.message)
    }
  }

  const parsed = parseOutput(finalText, cafes)
  if (parsed.pick) {
    const suggestion = await client.supabase.rpc('save_cafe_suggestion', {
      chosen_vibes: [...chosenVibes],
      written_note: note,
      chosen_cafe: parsed.pick.id,
      ai_reason: parsed.pick.reason,
    })
    if (suggestion.error && !warning) {
      warning = explainQuery(suggestion.error.message)
    }
  }

  const media: Run = {
    id: (saved.data?.id as number | undefined) ?? 0,
    prompt,
    content: finalText,
    modelName: (modelRow.data?.name as string | undefined) ?? (modelKey || null),
    createdAt: (saved.data?.created_at as string | undefined) ?? new Date().toISOString(),
  }

  refreshChain(chainId)
  return { run: media, warning }
}

export type { StepRole }
