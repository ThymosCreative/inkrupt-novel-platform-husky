import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="text-6xl font-black text-lime-400">!</div>
            <h1 className="text-2xl font-black text-white">Algo deu errado</h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Ocorreu um erro inesperado no aplicativo.
              {this.state.error?.message && (
                <span className="block mt-2 font-mono text-xs text-zinc-600 bg-zinc-900 p-2 rounded">
                  {this.state.error.message}
                </span>
              )}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-lime-400 text-black font-bold px-8 py-3 rounded-xl hover:bg-lime-500 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
