import SignOutButton from '@/app/components/sign-out-button'
import ThemeToggle from '@/app/components/theme-toggle'
import Link from 'next/link'

export default function Shell({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  return (
    <div className="app">
      <header className="topbar">
        <Link className="brand" href="/chains">
          <span className="brandMark" aria-hidden="true" />
          <span>
            <strong>Prompt Chain</strong>
            <small>Morningside Nook</small>
          </span>
        </Link>
        <div className="topActions">
          <ThemeToggle />
          <span className="who">{name}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="page">{children}</main>
    </div>
  )
}
