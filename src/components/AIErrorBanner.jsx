import { useNavigate, useLocation } from 'react-router-dom'
import { X, RefreshCw, Settings as SettingsIcon } from 'lucide-react'

/**
 * AI 错误展示组件
 * @param {{ error: string, onRetry: () => void }} props
 */
export default function AIErrorBanner({ error, onRetry }) {
  const navigate = useNavigate()
  const location = useLocation()

  const goSettings = () => {
    navigate('/settings', {
      state: {
        from: location.pathname,
        fromState: location.state,
        returnLabel: '返回继续配置',
      },
    })
  }

  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
        <X size={26} className="text-red-500" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-1.5">AI 分析失败</h3>
      <p className="text-sm text-red-500 mb-5">{error}</p>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <RefreshCw size={14} />
          重新尝试
        </button>
        <button
          onClick={goSettings}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <SettingsIcon size={14} />
          前往设置配置 API Key
        </button>
      </div>
    </div>
  )
}
