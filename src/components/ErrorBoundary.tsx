import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <section className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-lg">
          <h1 className="font-heading text-2xl font-bold text-slate-900">Something went wrong</h1>
          <p className="mt-3 text-slate-600">
            The quote form hit an unexpected issue. Please reload the page and try again.
          </p>
          {this.state.error?.message ? (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {this.state.error.message}
            </p>
          ) : null}
          <button
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload page
          </button>
        </section>
      </main>
    )
  }
}
