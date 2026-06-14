import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AgentForge - Build, Test, and Improve AI Agents.',
  description: 'Create domain AI agents, run real tasks, evaluate responses, and improve prompts with measurable scores.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.className} bg-forge-bg text-forge-text antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
