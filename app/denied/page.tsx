import SignOutButton from '@/app/components/sign-out-button'
import ThemeToggle from '@/app/components/theme-toggle'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DeniedPage() {
  const access = await requireAdmin()
  if (access.ok) {
    redirect('/chains')
  }
  if (access.reason === 'signin' || access.reason === 'setup' || access.reason === 'config') {
    redirect('/')
  }

  return (
    <main className="gate">
      <div className="gateTop">
        <ThemeToggle />
      </div>
      <section className="gateCard stack">
        <p className="eyebrow">Signed in</p>
        <h1>This studio is closed</h1>
        <p className="lede">
          Your Google account is signed in, but <code>profiles.is_superadmin</code> is not true.
          Set that field for your profile in the Supabase SQL editor, then sign in again.
        </p>
        <SignOutButton />
      </section>
    </main>
  )
}
