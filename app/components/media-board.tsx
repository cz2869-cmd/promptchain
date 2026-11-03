import { when } from '@/lib/cafes'
import { parseOutput } from '@/lib/prompt'
import type { CafeOption, Run, Suggestion } from '@/lib/types'
import Image from 'next/image'

const outcomeLabel = {
  pending: 'No choice yet',
  accepted: 'Bring me there',
  rejected: 'Another suggestion',
} as const

export function MediaCard({
  title,
  meta,
  text,
  prompt,
  cafes,
}: {
  title: string
  meta: string
  text: string
  prompt?: string
  cafes: CafeOption[]
}) {
  const parsed = parseOutput(text, cafes)
  const cafe = parsed.pick ? cafes.find((item) => item.id === parsed.pick?.id) : null

  return (
    <article className="panel mediaCard">
      <p className="eyebrow">{meta}</p>
      <h3>{title}</h3>
      {parsed.pick ? (
        <div className="resultBody">
          {cafe?.image ? (
            <Image
              className="cafePhoto"
              src={cafe.image}
              alt=""
              width={296}
              height={224}
            />
          ) : (
            <div className="photoFallback" />
          )}
          <div>
            <p className="resultKicker">Suggested cafe</p>
            <p className="resultTitle">{parsed.pick.name}</p>
            {cafe ? <p className="muted">{cafe.address}</p> : null}
            <p>{parsed.pick.reason}</p>
          </div>
        </div>
      ) : null}
      {parsed.read ? (
        <div>
          <p className="resultKicker">Vibes</p>
          <div className="chips">
            {parsed.read.vibes.map((vibe) => (
              <span className="chip chipOn" key={vibe}>
                {vibe}
              </span>
            ))}
          </div>
          <p>{parsed.read.description}</p>
        </div>
      ) : null}
      {parsed.lines ? (
        <ol className="captionList">
          {parsed.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      ) : null}
      {!parsed.pick && !parsed.read && !parsed.lines ? (
        <p className="pre">{text || 'No text was saved for this run.'}</p>
      ) : null}
      {prompt ? (
        <details>
          <summary>What was sent</summary>
          <p className="pre">{prompt}</p>
        </details>
      ) : null}
    </article>
  )
}

export default function MediaBoard({
  runs,
  suggestions,
  cafes,
  suggestionError,
}: {
  runs: Run[]
  suggestions: Suggestion[] | null
  cafes: CafeOption[]
  suggestionError: string | null
}) {
  return (
    <section className="stack" id="media">
      <header className="sectionHead">
        <div>
          <p className="eyebrow">Generated media</p>
          <h2>What this chain has produced</h2>
        </div>
      </header>
      {runs.length === 0 ? (
        <p className="empty">No runs yet. Generate from the steps above and the result stays with this chain.</p>
      ) : (
        runs.map((run) => (
          <MediaCard
            key={run.id}
            title={run.modelName ? `Run · ${run.modelName}` : 'Run'}
            meta={when(run.createdAt)}
            text={run.content}
            prompt={run.prompt}
            cafes={cafes}
          />
        ))
      )}
      {suggestions ? (
        <>
          <header className="sectionHead">
            <div>
              <p className="eyebrow">Morningside Nook</p>
              <h2>Suggestions students received</h2>
            </div>
          </header>
          {suggestionError ? <p className="error">{suggestionError}</p> : null}
          {suggestions.length === 0 ? (
            <p className="empty">
              Nothing here yet. On the public site, Can&apos;t decide which cafe to visit? saves each suggestion.
            </p>
          ) : (
            suggestions.map((suggestion) => (
              <article className="panel" key={suggestion.id}>
                <p className="eyebrow">{when(suggestion.createdAt)}</p>
                <h3>{suggestion.cafeName}</h3>
                <div className="chips">
                  {suggestion.vibes.length === 0 ? (
                    <span className="chip">No preset</span>
                  ) : (
                    suggestion.vibes.map((vibe) => (
                      <span className="chip" key={vibe}>
                        {vibe}
                      </span>
                    ))
                  )}
                </div>
                <p>
                  <strong>They wrote: </strong>
                  {suggestion.note || 'Nothing'}
                </p>
                <p className="muted">{suggestion.reason}</p>
                <p className={`outcome outcome-${suggestion.outcome}`}>
                  {outcomeLabel[suggestion.outcome]}
                </p>
              </article>
            ))
          )}
        </>
      ) : null}
    </section>
  )
}
