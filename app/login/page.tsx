import Link from 'next/link'
import { AuthForm } from '@/components/AuthForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-[calc(100vh-93px)] items-center px-4 py-12">
      <section className="mx-auto w-full">
        <AuthForm mode="login" />
        <p className="mt-5 text-center text-sm text-forge-muted">
          Need an account? <Link href="/signup" className="text-purple-200 hover:text-white">Sign up</Link>
        </p>
      </section>
    </main>
  )
}
