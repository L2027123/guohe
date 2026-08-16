import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Trash2, Flame, Search as SearchIcon } from 'lucide-react'
import { useStore } from '../../store/useStore'
import PricingModal from '../../components/PricingModal.jsx'

export default function CaseLibrary() {
  const currentProjectId = useStore((s) => s.currentProjectId)
  // 修复：selector 里禁止返回新数组引用（否则触发 Maximum update depth exceeded）
  const allContentPatterns = useStore((s) => s.contentPatterns)
  const accountMemory = useStore((s) => s.accountMemory)
  const deleteContentPattern = useStore((s) => s.deleteContentPattern)
  const deleteCompetitorAnalysis = useStore((s) => s.deleteCompetitorAnalysis)

  const [showPricing, setShowPricing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // 用 useMemo 派生过滤结果，避免 selector 返回新引用
  const contentPatterns = useMemo(
    () => allContentPatterns.filter((cp) => cp.projectId === currentProjectId),
    [allContentPatterns, currentProjectId]
  )
  const competitorAnalyses = useMemo(() => {
    const am = accountMemory.find((m) => m.projectId === currentProjectId)
    return am?.competitorAnalyses || []
  }, [accountMemory, currentProjectId])

  // 合并列表
  const mergedList = useMemo(() => {
    const patterns = contentPatterns.map((p) => ({
      id: p.id,
      type: 'pattern',
      title: p.pattern || p.description || '未命名',
      platform: p.deconstruction?.platform || '未分类',
      killerMove: p.pattern || '',
      fireScore: p.fireScore || 0,
      savedAt: p.createdAt || Date.now(),
      raw: p,
    }))
    const analyses = competitorAnalyses.map((a) => ({
      id: a.id,
      type: 'analysis',
      title: a.title || '未命名',
      platform: '未分类',
      killerMove: a.killerMove || '',
      fireScore: a.fireScore || 0,
      savedAt: a.analyzedAt || Date.now(),
      raw: a,
    }))
    return [...patterns, ...analyses].sort((a, b) => b.savedAt - a.savedAt)
  }, [contentPatterns, competitorAnalyses])

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return mergedList
    return mergedList.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.killerMove.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [mergedList, searchQuery])

  const handleDelete = (item) => {
    if (item.type === 'pattern') {
      deleteContentPattern(item.id)
    } else {
      deleteCompetitorAnalysis(currentProjectId, item.id)
    }
  }

  const isFull = contentPatterns.length >= 3

  return (
    <div className="min-h-full overflow-y-auto p-4 md:p-6">
      {/* 页头 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen size={24} className="text-brand-400" />
          爆款研究库
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          所有拆解过的爆款案例，随时回顾和复用
        </p>
      </div>

      {/* 升级横幅 */}
      {isFull && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-brand-600/20 to-purple-600/20 border border-brand-500/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <div className="text-white font-medium">研究库已满（{contentPatterns.length}/3）</div>
              <div className="text-gray-400 text-sm">升级 Pro 无限保存爆款案例</div>
            </div>
          </div>
          <button
            onClick={() => setShowPricing(true)}
            className="px-4 py-2 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            升级 Pro →
          </button>
        </div>
      )}

      {/* 搜索栏 */}
      {mergedList.length > 0 && (
        <div className="mb-6 relative">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标题或杀手锏..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      )}

      {/* 空状态 */}
      {mergedList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <BookOpen size={28} className="text-gray-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">📚 研究库为空</h3>
          <p className="text-gray-500 text-sm mb-6">拆解你的第一个爆款，开始积累案例</p>
          <Link
            to="/workbench/competitor-analyzer"
            className="px-6 py-2.5 rounded-full bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            去拆解第一个爆款 →
          </Link>
        </div>
      ) : (
        <>
          {/* 统计 */}
          <div className="mb-4 flex items-center gap-4 text-sm text-gray-400">
            <span>共 {mergedList.length} 条案例</span>
            <span>·</span>
            <span>研究库 {contentPatterns.length}/{isFull ? 3 : '∞'}</span>
          </div>

          {/* 卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="rounded-3xl bg-[#1a1a2e] shadow-soft p-6 relative group hover:ring-1 hover:ring-brand-500/30 transition-all"
              >
                {/* 删除按钮 */}
                <button
                  onClick={() => handleDelete(item)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>

                {/* 类型标签 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    item.type === 'pattern' ? 'bg-brand-600/20 text-brand-400' : 'bg-blue-600/20 text-blue-400'
                  }`}>
                    {item.type === 'pattern' ? '已保存' : '拆解记录'}
                  </span>
                  <span className="text-[11px] text-gray-500">{item.platform}</span>
                </div>

                {/* 标题 */}
                <h3 className="text-white text-lg font-bold pr-8 mb-2 line-clamp-2">
                  {item.title}
                </h3>

                {/* killerMove */}
                {item.killerMove && (
                  <p className="text-gray-300 text-sm mt-2 line-clamp-3">
                    <span className="text-brand-400">💡 </span>
                    {item.killerMove}
                  </p>
                )}

                {/* 底部：火指数 + 时间 */}
                <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                  {item.fireScore > 0 ? (
                    <span className="flex items-center gap-1">
                      <Flame size={12} className="text-orange-400" />
                      火指数 {item.fireScore}/5
                    </span>
                  ) : (
                    <span />
                  )}
                  <span>{new Date(item.savedAt).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))}
          </div>

          {filteredList.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              没有找到匹配「{searchQuery}」的案例
            </div>
          )}
        </>
      )}

      {/* Pricing Modal */}
      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  )
}
