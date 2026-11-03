import type { RunInput, Step, StepRole } from '@/lib/types'

export const VIBES = [
  'Cozy',
  'Studying',
  'Friend hangout',
  'Quick coffee',
  'A treat',
  'Quiet corner',
] as const

const TOKENS = ['vibes', 'note', 'catalog', 'cafe', 'previous', 'input'] as const

export type PromptToken = (typeof TOKENS)[number]

export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z]+)\s*\}\}/gi, (whole, name: string) => {
    const key = name.toLowerCase()
    return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : whole
  })
}

export function tokensIn(templates: string[]) {
  const found = new Set<PromptToken>()
  const pattern = /\{\{\s*([a-z]+)\s*\}\}/gi
  for (const template of templates) {
    for (const match of template.matchAll(pattern)) {
      const token = match[1].toLowerCase()
      if ((TOKENS as readonly string[]).includes(token)) {
        found.add(token as PromptToken)
      }
    }
  }
  return found
}

export function inputNeeds(found: Set<PromptToken>) {
  const hasKnown = found.size > 0
  return {
    vibes: found.has('vibes') || found.has('note'),
    cafe: found.has('cafe'),
    freeform: found.has('input') || !hasKnown,
  }
}

export function validateRun(found: Set<PromptToken>, input: RunInput) {
  const needs = inputNeeds(found)
  const wrote = input.note.trim().length > 0
  const picked = input.vibes.length > 0

  if (needs.cafe && !input.cafeId) {
    return 'Choose a cafe.'
  }
  if (needs.vibes && !picked && !wrote) {
    return 'Pick a vibe, or write what you are looking for.'
  }
  if (needs.freeform && !needs.vibes && !wrote) {
    return 'Write a prompt for this chain.'
  }
  return null
}

export function moved<T>(items: T[], index: number, direction: 'up' | 'down') {
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= items.length) {
    return null
  }
  const next = items.slice()
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

export function formatCatalog(
  cafes: { id: number; name: string; vibe: string; address: string; description: string }[]
) {
  if (cafes.length === 0) {
    return 'No cafes are in the database yet.'
  }
  return cafes
    .map(
      (cafe) =>
        `${cafe.id} | ${cafe.name} | ${cafe.vibe} | ${cafe.address} | ${cafe.description}`
    )
    .join('\n')
}

export function formatCafe(cafe: {
  name: string
  vibe: string
  address: string
  neighborhood: string
  description: string
}) {
  return [
    cafe.name,
    `Vibe on file: ${cafe.vibe}`,
    `Address: ${cafe.address}`,
    `Neighborhood: ${cafe.neighborhood}`,
    `Description on file: ${cafe.description}`,
  ].join('\n')
}

export type CafePick = {
  id: number
  name: string
  reason: string
}

export type CafeRead = {
  vibes: string[]
  description: string
}

export type ParsedMedia = {
  pick: CafePick | null
  read: CafeRead | null
  lines: string[] | null
}

function asText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asVibes(value: unknown) {
  const source = Array.isArray(value)
    ? value.map((item) => String(item))
    : typeof value === 'string'
      ? value.split(/[,|/]/)
      : []
  return source
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function parseJsonBlock(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end <= start) {
    return null
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

export function parseOutput(
  text: string,
  cafes: { id: number; name: string }[]
): ParsedMedia {
  const parsed = parseJsonBlock(text)
  let pick: CafePick | null = null
  let read: CafeRead | null = null

  if (parsed) {
    const rawId = parsed.id ?? parsed.cafeId
    const named = asText(parsed.name).toLowerCase()
    const cafe =
      cafes.find((item) => item.id === Number(rawId)) ??
      cafes.find((item) => item.name.toLowerCase() === named)
    const reason = asText(parsed.reason)
    if (cafe && reason) {
      pick = { id: cafe.id, name: cafe.name, reason }
    }

    const vibes = asVibes(parsed.vibes)
    const description = asText(parsed.description) || asText(parsed.summary)
    if (vibes.length > 0 && description) {
      read = { vibes, description }
    }
  }

  let lines: string[] | null = null
  if (!pick && !read) {
    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start !== -1 && end > start) {
      try {
        const value = JSON.parse(text.slice(start, end + 1)) as unknown
        if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
          const captions = value.map((item) => item.trim()).filter(Boolean)
          lines = captions.length > 0 ? captions : null
        }
      } catch {
        lines = null
      }
    }
  }

  return { pick, read, lines }
}

export function isStepRole(value: string): value is StepRole {
  return value === 'system' || value === 'user'
}

export function summarizeRun(
  input: RunInput,
  cafeName: string | null,
  steps: Pick<Step, 'position' | 'role' | 'content'>[],
  earlier: { position: number; text: string }[]
) {
  const lines: string[] = []
  if (input.vibes.length > 0) {
    lines.push(`Vibes: ${input.vibes.join(', ')}`)
  }
  if (input.note.trim()) {
    lines.push(`Note: ${input.note.trim()}`)
  }
  if (cafeName) {
    lines.push(`Cafe: ${cafeName}`)
  }
  lines.push('')
  for (const step of steps) {
    lines.push(`Step ${step.position} (${step.role})`)
    lines.push(step.content)
    lines.push('')
  }
  if (earlier.length > 0) {
    lines.push('Earlier outputs:')
    for (const output of earlier) {
      lines.push(`Step ${output.position}`)
      lines.push(output.text)
      lines.push('')
    }
  }
  return lines.join('\n').slice(0, 8000)
}
