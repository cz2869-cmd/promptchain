'use client'

import { useEffect } from 'react'

const choices = ['light', 'dark', 'system'] as const
type ThemeChoice = (typeof choices)[number]

const storageKey = 'promptchain-theme'

function resolved(choice: ThemeChoice) {
  if (choice === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return choice
}

function mark(choice: ThemeChoice) {
  document.querySelectorAll<HTMLButtonElement>('.themeOption').forEach((button) => {
    button.setAttribute('aria-pressed', button.dataset.choice === choice ? 'true' : 'false')
  })
}

function apply(choice: ThemeChoice) {
  document.documentElement.dataset.themeChoice = choice
  document.documentElement.dataset.theme = resolved(choice)
  localStorage.setItem(storageKey, choice)
  mark(choice)
}

export default function ThemeToggle() {
  useEffect(() => {
    const saved = document.documentElement.dataset.themeChoice
    const choice: ThemeChoice =
      saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
    mark(choice)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const current = localStorage.getItem(storageKey)
      if (current === 'light' || current === 'dark') {
        return
      }
      apply('system')
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="themeSwitch" role="group" aria-label="Color theme">
      {choices.map((option) => (
        <button
          key={option}
          type="button"
          data-choice={option}
          className="themeOption"
          aria-pressed={false}
          onClick={() => apply(option)}
        >
          {option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'}
        </button>
      ))}
    </div>
  )
}
