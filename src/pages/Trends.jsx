import { TrendingUp } from 'lucide-react'

export default function Trends() {
  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">机会雷达</h1>
        <p className="text-sm text-gray-500 mt-1">全网热点趋势分析</p>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={28} className="text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-medium mb-1">机会雷达</h3>
          <p className="text-sm text-gray-500">功能正在开发中，预计 8 月底上线</p>
        </div>
      </div>
    </div>
  )
}
