import { Component } from 'react'
import { trackError } from '../utils/tracker'

/**
 * 全局错误边界：捕获子组件渲染期间的 JS 错误，防止整页白屏。
 * 不拦截异步错误（fetch 失败等），那些由各页面自行处理。
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    trackError(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">🎬</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">页面出错了</h1>
            <p className="text-sm text-gray-500 mb-6">
              果核 遇到了一个意外错误。你的数据不会丢失，刷新页面即可继续使用。
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                重试
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors"
              >
                刷新页面
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  查看错误详情
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-[11px] text-gray-600 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
