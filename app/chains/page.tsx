import NewChainForm from '@/app/components/new-chain-form'
import { loadChains } from '@/lib/data'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ChainsPage() {
  const result = await loadChains()

  return (
    <div className="stack">
      <header>
        <p className="eyebrow">Studio</p>
        <h1>Prompt chains</h1>
        <p className="lede">
          A chain is an ordered list of steps. Suggest a cafe turns a mood into one cafe.
          Read a cafe goes the other way: pick Joe&apos;s Coffee and the model returns the vibes
          and a short description.
        </p>
      </header>
      {result.error ? <p className="error">{result.error}</p> : null}
      <div className="chainGrid">
        <div className="stack">
          {result.chains.length === 0 ? (
            <p className="empty">No chains yet. Create one, or run supabase/prompt-chains.sql to seed the cafe chains.</p>
          ) : (
            result.chains.map((chain) => {
              const count = result.counts.get(chain.id) ?? 0
              return (
                <Link className="panel chainCard" key={chain.id} href={`/chains/${chain.id}`}>
                  <p className="eyebrow">{count === 1 ? '1 step' : `${count} steps`}</p>
                  <h2>{chain.name}</h2>
                  <p className="muted">{chain.description || 'No description yet.'}</p>
                </Link>
              )
            })
          )}
        </div>
        <NewChainForm />
      </div>
    </div>
  )
}
