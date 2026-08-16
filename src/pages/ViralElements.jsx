import { Flame } from 'lucide-react'

export default function ViralElements() {
  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100">
        <h1 className="text-xl font-semibold text-gray-900">爆款元素库</h1>
        <p className="text-sm text-gray-500 mt-1">已归档的爆款内容元素</p>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Flame size={28} className="text-gray-400" />
          </div>
          <h3 className="text-gray-900 font-medium mb-1">爆款元素库</h3>
          <p className="text-sm text-gray-500">支持按标题套路、钩子、CTA 等类型筛选</p>
        </div>
      </div>
    </div>
  )
}
