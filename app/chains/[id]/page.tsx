import ChainEditor from '@/app/components/chain-editor'
import { loadCafes, loadChain, loadRuns, loadSteps, loadSuggestions } from '@/lib/data'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ChainPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const chainId = Number(id)
  if (!Number.isInteger(chainId)) {
    notFound()
  }

  const chainResult = await loadChain(chainId)
  if (chainResult.error) {
    return <p className="error">{chainResult.error}</p>
  }
  if (!chainResult.chain) {
    notFound()
  }

  const [stepsResult, cafeResult, runResult] = await Promise.all([
    loadSteps(chainId),
    loadCafes(),
    loadRuns(chainId),
  ])
  const suggestionResult = await loadSuggestions(chainResult.chain.name, cafeResult.cafes)
  const error = stepsResult.error ?? cafeResult.error ?? runResult.error

  return (
    <div className="stack">
      <Link className="back" href="/chains">
        All chains
      </Link>
      {error ? <p className="error">{error}</p> : null}
      <ChainEditor
        key={chainResult.chain.id}
        chain={chainResult.chain}
        initialSteps={stepsResult.steps}
        cafes={cafeResult.cafes}
        runs={runResult.runs}
        suggestions={suggestionResult.suggestions}
        suggestionError={suggestionResult.error}
      />
    </div>
  )
}
