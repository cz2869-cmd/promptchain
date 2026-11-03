'use client'

import {
  deleteChain,
  deleteStep,
  createStep,
  generateFromChain,
  moveStep,
  updateChain,
  updateStep,
} from '@/app/actions'
import MediaBoard, { MediaCard } from '@/app/components/media-board'
import { inputNeeds, moved, tokensIn, VIBES } from '@/lib/prompt'
import type { CafeOption, Chain, Run, Step, StepRole, Suggestion } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Draft = { role: StepRole; content: string }

export default function ChainEditor({
  chain,
  initialSteps,
  cafes,
  runs,
  suggestions,
  suggestionError,
}: {
  chain: Chain
  initialSteps: Step[]
  cafes: CafeOption[]
  runs: Run[]
  suggestions: Suggestion[] | null
  suggestionError: string | null
}) {
  const router = useRouter()
  const [name, setName] = useState(chain.name)
  const [description, setDescription] = useState(chain.description)
  const [steps, setSteps] = useState(initialSteps)
  const [drafts, setDrafts] = useState<Record<number, Draft>>({})
  const [newRole, setNewRole] = useState<StepRole>('user')
  const [newContent, setNewContent] = useState('')
  const [vibes, setVibes] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [cafeId, setCafeId] = useState<number>(cafes[0]?.id ?? 0)
  const [latest, setLatest] = useState<Run | null>(null)
  const [generating, setGenerating] = useState(false)
  const [notice, setNotice] = useState('')
  const [noticeError, setNoticeError] = useState(false)
  const [pending, startTransition] = useTransition()

  const found = tokensIn(steps.map((step) => step.content))
  const needs = inputNeeds(found)
  const unsaved = steps.some((step) => {
    const draft = drafts[step.id]
    return Boolean(draft && (draft.role !== step.role || draft.content !== step.content))
  })
  const savedLatest = latest && runs.some((run) => run.id === latest.id) ? null : latest

  function report(error: string | undefined, success: string) {
    if (error) {
      setNotice(error)
      setNoticeError(true)
      return false
    }
    setNotice(success)
    setNoticeError(false)
    return true
  }

  function draftFor(step: Step): Draft {
    return drafts[step.id] ?? { role: step.role, content: step.content }
  }

  function run(task: () => Promise<void>) {
    setNotice('')
    startTransition(task)
  }

  return (
    <div className="stack">
      {notice ? (
        <p className={noticeError ? 'error' : 'ok'} role="status">
          {notice}
        </p>
      ) : null}
      <form
        className="panel stack"
        onSubmit={(event) => {
          event.preventDefault()
          run(async () => {
            const result = await updateChain(chain.id, name, description)
            report(result.error, 'Chain updated.')
            router.refresh()
          })
        }}
      >
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Prompt chain</p>
            <h1>Edit this chain</h1>
          </div>
          <button
            className="danger"
            type="button"
            disabled={pending}
            onClick={() => {
              if (!window.confirm('Delete this prompt chain and its steps?')) {
                return
              }
              run(async () => {
                const result = await deleteChain(chain.id)
                if (!report(result.error, 'Chain deleted.')) {
                  return
                }
                router.push('/chains')
                router.refresh()
              })
            }}
          >
            Delete chain
          </button>
        </div>
        <label htmlFor="edit-name">Name</label>
        <input id="edit-name" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="edit-description">Description</label>
        <textarea
          id="edit-description"
          value={description}
          maxLength={500}
          onChange={(event) => setDescription(event.target.value)}
        />
        <div className="row">
          <button className="primary" type="submit" disabled={pending}>
            Update chain
          </button>
        </div>
      </form>

      <section className="stack">
        <header className="sectionHead">
          <div>
            <p className="eyebrow">Steps</p>
            <h2>Order is the order they run</h2>
          </div>
        </header>
        <p className="muted">
          Move a step up or down to change what happens first. Tokens in the text decide the
          generator: <code>{'{{vibes}}'}</code> and <code>{'{{note}}'}</code> ask for a mood,{' '}
          <code>{'{{catalog}}'}</code> inserts the cafe list, <code>{'{{cafe}}'}</code> asks you
          to pick one cafe, and <code>{'{{previous}}'}</code> is the text from the step before.
        </p>
        {steps.length === 0 ? (
          <p className="empty">No steps yet. Add the system rules, then the user request.</p>
        ) : null}
        {steps.map((step, index) => {
          const draft = draftFor(step)
          const dirty = draft.role !== step.role || draft.content !== step.content
          return (
            <form
              className="panel stepCard"
              key={step.id}
              onSubmit={(event) => {
                event.preventDefault()
                run(async () => {
                  const result = await updateStep(step.id, draft.role, draft.content)
                  if (!report(result.error, `Step ${index + 1} updated.`)) {
                    return
                  }
                  setSteps((current) =>
                    current.map((item) =>
                      item.id === step.id ? { ...item, role: draft.role, content: draft.content } : item
                    )
                  )
                  setDrafts((current) => {
                    const next = { ...current }
                    delete next[step.id]
                    return next
                  })
                  router.refresh()
                })
              }}
            >
              <div className="stepHead">
                <p className="stepIndex">Step {index + 1}</p>
                <div className="row tight">
                  <button
                    className="ghost"
                    type="button"
                    disabled={pending || index === 0}
                    onClick={() => {
                      const next = moved(steps, index, 'up')
                      if (!next) {
                        return
                      }
                      const previous = steps
                      setSteps(next.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })))
                      run(async () => {
                        const result = await moveStep(step.id, 'up')
                        if (!report(result.error, `Moved step ${index + 1} up.`)) {
                          setSteps(previous)
                          return
                        }
                        router.refresh()
                      })
                    }}
                  >
                    Move up
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    disabled={pending || index === steps.length - 1}
                    onClick={() => {
                      const next = moved(steps, index, 'down')
                      if (!next) {
                        return
                      }
                      const previous = steps
                      setSteps(next.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })))
                      run(async () => {
                        const result = await moveStep(step.id, 'down')
                        if (!report(result.error, `Moved step ${index + 1} down.`)) {
                          setSteps(previous)
                          return
                        }
                        router.refresh()
                      })
                    }}
                  >
                    Move down
                  </button>
                  <button
                    className="danger"
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Delete step ${index + 1}?`)) {
                        return
                      }
                      run(async () => {
                        const result = await deleteStep(step.id)
                        if (!report(result.error, `Step ${index + 1} deleted.`)) {
                          return
                        }
                        setSteps((current) =>
                          current
                            .filter((item) => item.id !== step.id)
                            .map((item, itemIndex) => ({ ...item, position: itemIndex + 1 }))
                        )
                        router.refresh()
                      })
                    }}
                  >
                    Delete step
                  </button>
                </div>
              </div>
              <label htmlFor={`role-${step.id}`}>Role</label>
              <select
                id={`role-${step.id}`}
                value={draft.role}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [step.id]: { ...draft, role: event.target.value as StepRole },
                  }))
                }
              >
                <option value="system">System — rules for the model</option>
                <option value="user">User — the request</option>
              </select>
              <label htmlFor={`content-${step.id}`}>Content</label>
              <textarea
                id={`content-${step.id}`}
                value={draft.content}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [step.id]: { ...draft, content: event.target.value },
                  }))
                }
              />
              <div className="row">
                <button className="primary" type="submit" disabled={pending || !dirty}>
                  Update step
                </button>
                {dirty ? <span className="muted">Unsaved changes</span> : null}
              </div>
            </form>
          )
        })}
        <form
          className="panel stack"
          onSubmit={(event) => {
            event.preventDefault()
            run(async () => {
              const result = await createStep(chain.id, newRole, newContent)
              if (result.error || !result.step) {
                report(result.error ?? 'The step was not created.', '')
                return
              }
              report(undefined, 'Step created.')
              setSteps((current) => [...current, result.step as Step])
              setNewRole('user')
              setNewContent('')
              router.refresh()
            })
          }}
        >
          <h3>Add a step</h3>
          <label htmlFor="new-role">Role</label>
          <select
            id="new-role"
            value={newRole}
            onChange={(event) => setNewRole(event.target.value as StepRole)}
          >
            <option value="system">System — rules for the model</option>
            <option value="user">User — the request</option>
          </select>
          <label htmlFor="new-content">Content</label>
          <textarea
            id="new-content"
            value={newContent}
            placeholder="Take {{previous}} and write five short captions."
            onChange={(event) => setNewContent(event.target.value)}
          />
          <div className="row">
            <button className="primary" type="submit" disabled={pending}>
              Create step
            </button>
          </div>
        </form>
      </section>

      <section className="panel stack">
        <div>
          <p className="eyebrow">Generate</p>
          <h2>Run this chain</h2>
        </div>
        <p className="muted">
          The boxes follow the saved steps. Suggest a cafe asks for vibes and a note. Read a cafe
          asks you to choose the cafe, then returns the vibes and a short description.
        </p>
        {unsaved ? (
          <p className="muted">Update the unsaved steps before generating. The run uses the saved text.</p>
        ) : null}
        {needs.vibes ? (
          <>
            <p className="label">Vibes</p>
            <div className="chips">
              {VIBES.map((vibe) => {
                const active = vibes.includes(vibe)
                return (
                  <button
                    key={vibe}
                    type="button"
                    className={active ? 'chip chipOn' : 'chip'}
                    aria-pressed={active}
                    onClick={() =>
                      setVibes((current) =>
                        current.includes(vibe)
                          ? current.filter((item) => item !== vibe)
                          : [...current, vibe]
                      )
                    }
                  >
                    {vibe}
                  </button>
                )
              })}
            </div>
          </>
        ) : null}
        {needs.vibes || needs.freeform ? (
          <>
            <label htmlFor="run-note">{needs.vibes ? 'What they wrote' : 'Prompt'}</label>
            <textarea
              id="run-note"
              value={note}
              maxLength={500}
              placeholder={
                needs.vibes
                  ? 'Somewhere I can stay for two hours...'
                  : 'The text this chain should start from.'
              }
              onChange={(event) => setNote(event.target.value)}
            />
          </>
        ) : null}
        {needs.cafe ? (
          <>
            <label htmlFor="run-cafe">Cafe</label>
            <select
              id="run-cafe"
              value={cafeId}
              onChange={(event) => setCafeId(Number(event.target.value))}
            >
              {cafes.map((cafe) => (
                <option key={cafe.id} value={cafe.id}>
                  {cafe.name} — {cafe.vibe}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <div className="row">
          <button
            className="primary"
            type="button"
            disabled={pending || steps.length === 0 || unsaved}
            onClick={() => {
              setGenerating(true)
              run(async () => {
                try {
                  const result = await generateFromChain(chain.id, {
                    vibes,
                    note,
                    cafeId: needs.cafe ? cafeId : null,
                  })
                  if (result.error || !result.run) {
                    report(result.error ?? 'Nothing came back.', '')
                    return
                  }
                  setLatest(result.run)
                  if (result.warning) {
                    setNotice(`Generated. ${result.warning}`)
                    setNoticeError(true)
                  } else {
                    report(undefined, 'Generated.')
                  }
                  router.refresh()
                } finally {
                  setGenerating(false)
                }
              })
            }}
          >
            {unsaved ? 'Save steps to generate' : generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </section>

      {savedLatest ? (
        <MediaCard
          title="Latest media"
          meta={savedLatest.modelName ?? 'Just now'}
          text={savedLatest.content}
          prompt={savedLatest.prompt}
          cafes={cafes}
        />
      ) : null}
      <MediaBoard
        runs={runs}
        suggestions={suggestions}
        cafes={cafes}
        suggestionError={suggestionError}
      />
    </div>
  )
}
