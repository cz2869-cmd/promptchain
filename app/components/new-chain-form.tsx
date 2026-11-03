'use client'

import { createChain } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export default function NewChainForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="panel stack"
      onSubmit={(event) => {
        event.preventDefault()
        setError('')
        startTransition(async () => {
          const result = await createChain(name, description)
          if (result.error || !result.id) {
            setError(result.error ?? 'The chain was not created.')
            return
          }
          setName('')
          setDescription('')
          router.push(`/chains/${result.id}`)
          router.refresh()
        })
      }}
    >
      <div>
        <p className="eyebrow">New chain</p>
        <h2>Create a prompt chain</h2>
      </div>
      <label htmlFor="chain-name">Name</label>
      <input
        id="chain-name"
        value={name}
        maxLength={80}
        placeholder="Suggest a cafe"
        onChange={(event) => setName(event.target.value)}
        required
      />
      <label htmlFor="chain-description">Description</label>
      <textarea
        id="chain-description"
        value={description}
        maxLength={500}
        placeholder="What this chain is for."
        onChange={(event) => setDescription(event.target.value)}
      />
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button className="primary" type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create chain'}
        </button>
      </div>
    </form>
  )
}
