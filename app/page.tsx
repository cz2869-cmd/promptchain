import GoogleButton from '@/app/components/google-button'
import SignOutButton from '@/app/components/sign-out-button'
import ThemeToggle from '@/app/components/theme-toggle'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const access = await requireAdmin()
  if (access.ok) {
    redirect('/chains')
  }
  if (access.reason === 'denied') {
    redirect('/denied')
  }

  return (
    <main className="gate">
      <div className="gateTop">
        <ThemeToggle />
      </div>
      <section className="gateCard stack">
        <p className="eyebrow">Morningside Nook</p>
        <h1>Prompt Chain</h1>
        <p className="lede">
          Build the steps behind a generated cafe. Google sign-in is required, and the studio
          opens only when <code>profiles.is_superadmin</code> is true.
        </p>
        {access.reason === 'setup' ? (
          <>
            <p className="error">
              The superadmin column is not on profiles yet. Run the Nook Desk admin SQL, then sign in again.
            </p>
            <SignOutButton />
          </>
        ) : access.reason === 'config' ? (
          <p className="error">
            This server has no Supabase URL yet. Copy <code>.env.example</code> to <code>.env.local</code>.
          </p>
        ) : (
          <GoogleButton />
        )}
        {params.error === 'auth' ? (
          <p className="error">Google sign-in did not finish. Try again.</p>
        ) : null}
      </section>
    </main>
  )
}
