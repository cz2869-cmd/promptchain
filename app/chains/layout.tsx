import Shell from '@/app/components/shell'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ChainsLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAdmin()
  if (!access.ok) {
    redirect(access.reason === 'denied' ? '/denied' : '/')
  }

  return <Shell name={access.name}>{children}</Shell>
}
