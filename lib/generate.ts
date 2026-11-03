import type { StepRole } from '@/lib/types'

const FALLBACK_MODELS = ['gemini-3-flash-preview', 'gemini-3.8-flash']

export type RunnableStep = {
  position: number
  role: StepRole
  content: string
}

export type StepOutput = {
  position: number
  text: string
  model: string
}

function readText(payload: {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
}) {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim() ?? ''
  )
}

async function callModel(apiKey: string, model: string, system: string, user: string) {
  const configs = [
    { maxOutputTokens: 800, thinkingConfig: { thinkingBudget: 0 } },
    { maxOutputTokens: 800 },
  ]

  let sawTimeout = false
  let lastStatus = 0

  for (const generationConfig of configs) {
    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig,
    }
    if (system.trim()) {
      body.systemInstruction = { parts: [{ text: system }] }
    }

    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(25_000),
          body: JSON.stringify(body),
        }
      )
    } catch {
      sawTimeout = true
      break
    }

    if (response.status === 400) {
      continue
    }
    if (!response.ok) {
      lastStatus = response.status
      break
    }

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = readText(payload)
    if (text) {
      return { text, model }
    }
    return { error: 'The model returned an empty answer.' }
  }

  if (sawTimeout || lastStatus === 503) {
    return { error: 'Gemini took too long to answer. Try again in a moment.' }
  }
  if (lastStatus === 401 || lastStatus === 403) {
    return { error: 'Gemini refused the API key.' }
  }
  if (lastStatus === 404) {
    return { error: `The model ${model} is not available.` }
  }
  return { error: 'Gemini did not answer. Try again.' }
}

async function once(apiKey: string, models: string[], system: string, user: string) {
  let lastError = 'Gemini did not answer. Try again.'
  for (const model of models) {
    const result = await callModel(apiKey, model, system, user)
    if ('text' in result) {
      return result
    }
    lastError = result.error
    if (/too long|empty/i.test(result.error)) {
      return result
    }
  }
  return { error: lastError }
}

export async function runSteps(
  apiKey: string,
  models: string[],
  steps: RunnableStep[],
  fillStep: (content: string, previous: string) => string
) {
  const order = models.length > 0 ? models : FALLBACK_MODELS
  const filled: RunnableStep[] = []
  const outputs: StepOutput[] = []
  let system = ''
  let previous = ''
  const userSteps = steps.filter((step) => step.role === 'user')

  if (steps.length === 0) {
    return { error: 'Add a step before generating.', filled, outputs }
  }

  if (userSteps.length === 0) {
    const content = steps
      .map((step) => {
        const text = fillStep(step.content, '').trim()
        filled.push({ ...step, content: text })
        return text
      })
      .filter(Boolean)
      .join('\n\n')
    const result = await once(apiKey, order, '', content || 'Follow the instructions.')
    if ('error' in result) {
      return { error: result.error, filled, outputs }
    }
    outputs.push({
      position: steps[0]?.position ?? 1,
      text: result.text,
      model: result.model,
    })
    return { filled, outputs, model: result.model }
  }

  for (const step of steps) {
    const content = fillStep(step.content, previous).trim()
    filled.push({ ...step, content })
    if (step.role === 'system') {
      system = [system, content].filter(Boolean).join('\n\n')
      continue
    }
    if (!content) {
      return { error: `Step ${step.position} is empty.`, filled, outputs }
    }
    const result = await once(apiKey, order, system, content)
    if ('error' in result) {
      return { error: result.error, filled, outputs }
    }
    previous = result.text
    outputs.push({ position: step.position, text: result.text, model: result.model })
  }

  return { filled, outputs, model: outputs.at(-1)?.model ?? order[0] }
}
