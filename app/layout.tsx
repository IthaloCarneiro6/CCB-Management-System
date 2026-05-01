import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CCB — Gestão Logística',
  description: 'Dashboard interno de gestão de rodadas de basquete da CCB',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full`}>
      <body className="bg-[#050505] text-neutral-200 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
