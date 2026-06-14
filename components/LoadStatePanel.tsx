import Link from 'next/link'

type LoadStatePanelProps = {
  title: string
  message: string
  onRetry?: () => void
  showSignIn?: boolean
}

export function LoadStatePanel({ title, message, onRetry, showSignIn = true }: LoadStatePanelProps) {
  return (
    <section className="rounded-xl border border-forge-red/40 bg-forge-red/10 p-6 text-red-100">
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-red-100/90">{message}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {showSignIn ? (
          <Link href="/login" className="rounded-lg bg-forge-purple px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-500">
            Sign in
          </Link>
        ) : null}
        {onRetry ? (
          <button onClick={onRetry} className="rounded-lg border border-forge-border px-4 py-2 text-sm font-semibold text-forge-text transition-all duration-200 hover:bg-white/5">
            Try again
          </button>
        ) : null}
      </div>
    </section>
  )
}
