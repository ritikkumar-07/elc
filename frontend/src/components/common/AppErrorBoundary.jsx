import { Component } from 'react'

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('The ELC interface encountered an unexpected error.', {
      name: error?.name,
      message: error?.message,
      componentStack: info?.componentStack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-5 py-16">
          <section
            role="alert"
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-800">
              ELC portal
            </p>
            <h1 className="mt-4 font-serif text-3xl font-bold text-[#102d59]">
              Something went wrong
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              The page could not be displayed. Your account has not been changed.
              Reload the page or return to the public homepage.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 min-[420px]:flex-row">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#19366e] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#122951] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
              >
                Reload page
              </button>
              <a
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#19366e] focus-visible:ring-offset-2"
              >
                Return home
              </a>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
