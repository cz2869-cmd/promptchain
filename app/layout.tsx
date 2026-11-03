import type { Metadata } from 'next'
import { Fraunces, Nunito } from 'next/font/google'
import './globals.css'

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
})

const body = Nunito({
  variable: '--font-body',
  subsets: ['latin'],
})

const themeBoot = `
try {
  var choice = localStorage.getItem('promptchain-theme') || 'system';
  if (choice !== 'light' && choice !== 'dark' && choice !== 'system') choice = 'system';
  var dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themeChoice = choice;
} catch (e) {}
`

export const metadata: Metadata = {
  title: 'Prompt Chain',
  description: 'Superadmin studio for Morningside Nook prompt chains.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        {children}
      </body>
    </html>
  )
}
