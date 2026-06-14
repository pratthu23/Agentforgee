import Link from 'next/link'
import { AuthForm } from '@/components/AuthForm'

export default function SignupPage() {
  return (
    <main className="flex min-h-[calc(100vh-93px)] items-center px-4 py-12">
      <section className="mx-auto w-full">
        <AuthForm mode="signup" />
        <p className="mt-5 text-center text-sm text-forge-muted">
          Already have an account? <Link href="/login" className="text-purple-200 hover:text-white">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
