'use client'

import { supabaseEnv } from '@/lib/env'
import { createClient } from '@/lib/client'
import { useState } from 'react'

export default function GoogleButton() {
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const configured = Boolean(supabaseEnv())

  async function signIn() {
    setMessage('')
    setPending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setPending(false)
      setMessage(error.message)
    }
  }

  if (!configured) {
    return (
      <p className="error">
        Add the Supabase URL and publishable key in <code>.env.local</code> before signing in.
      </p>
    )
  }

  return (
    <>
      <button className="primary" type="button" onClick={signIn} disabled={pending}>
        {pending ? 'Opening Google...' : 'Sign in with Google'}
      </button>
      {message ? <p className="error">{message}</p> : null}
    </>
  )
}
