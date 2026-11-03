import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="gate">
      <section className="gateCard stack">
        <p className="eyebrow">Missing</p>
        <h1>That chain is not here</h1>
        <Link className="back" href="/chains">
          Back to chains
        </Link>
      </section>
    </main>
  )
}
