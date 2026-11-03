'use client'

import { createClient } from '@/lib/client'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button className="ghost" type="button" onClick={signOut}>
      Sign out
    </button>
  )
}
