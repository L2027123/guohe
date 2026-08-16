import { useState, useMemo } from 'react'
import { Package, Search, Eye, Trash2, Calendar, Copy, Check, X, BarChart3, Link2, TrendingUp } from 'lucide-react'
import { useStore } from '../store/useStore'

const TYPE_LABELS = {
  note: { label: '笔记', color: 'bg-blue-50 text-blue-600' },
  article: { label: '文章', color: 'bg-purple-50 text-purple-600' },
  video: { label: '视频脚本', color: 'bg-emerald-50 text-emerald-600' },
}

function formatDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '昨天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function Assets() {
  const currentProjectId = useStore((s) => s.currentProjectId)
  const projects = useStore((s) => s.projects)
  const allAssets = useStore((s) => s.assets)
  const allPerformanceRecords = useStore((s) => s.performanceRecords)
  const deleteAsset = useStore((s) => s.deleteAsset)
  const addPerformanceRecord = useStore((s) => s.addPerformanceRecord)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === currentProjectId),
    [projects, currentProjectId]
  )
  const assets = useMemo(
    () => allAssets.filter((a) => a.projectId === currentProjectId),
    [allAssets, currentProjectId]
  )

  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState(null)
  const [copied, setCopied] = useState(false)
  const [recording, setRecording] = useState(null)
  const [perfForm, setPerfForm] = useState({
    platformUrl: '',
    publishedAt: '',
    views: '',
    likes: '',
    saves: '',
    comments: '',
    shares: '',
  })

  const filtered = assets.filter(
    (a) => !search || a.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const handleDelete = (assetId) => {
    if (confirm('确定删除此资产？此操作不可恢复。')) {
      deleteAsset(assetId)
      if (viewing?.id === assetId) setViewing(null)
    }
  }

  // 已有表现记录的 assetId 集合
  const recordedAssetIds = useMemo(
    () => new Set(allPerformanceRecords.filter((r) => r.assetId).map((r) => r.assetId)),
    [allPerformanceRecords]
  )

  const handleStartRecord = (asset) => {
    setRecording(asset)
    setPerfForm({
      platformUrl: '',
      publishedAt: '',
      views: '',
      likes: '',
      saves: '',
      comments: '',
      shares: '',
    })
  }

  const handleSaveRecord = () => {
    if (!recording) return
    addPerformanceRecord(currentProjectId, {
      assetId: recording.id,
      title: recording.title,
      body: recording.body,
      hook: recording.hook,
      structure: recording.structure,
      cta: recording.cta,
      platformUrl: perfForm.platformUrl,
      publishedAt: perfForm.publishedAt ? new Date(perfForm.publishedAt).getTime() : null,
      metrics: {
        views: Number(perfForm.views) || 0,
        likes: Number(perfForm.likes) || 0,
        saves: Number(perfForm.saves) || 0,
        comments: Number(perfForm.comments) || 0,
        shares: Number(perfForm.shares) || 0,
      },
    })
    setRecording(null)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">内容资产库</h1>
            <p className="text-sm text-gray-500 mt-1">
              {currentProject ? `项目「${currentProject.name}」已生产 ${assets.length} 篇内容` : '沉淀和管理已生产的内容'}
            </p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索资产..."
              className="pl-8 pr-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white w-56"
            />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Package size={28} className="text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">暂无内容资产</h3>
              <p className="text-sm text-gray-500">
                完成内容生成的最后一步，生成的内容会自动归档到这里
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-2xl font-semibold text-gray-900 tabular">{assets.length}</div>
                <div className="text-xs text-gray-500 mt-0.5">总资产数</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-2xl font-semibold text-gray-900 tabular">
                  {assets.filter((a) => a.type === 'note').length}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">笔记</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-2xl font-semibold text-gray-900 tabular">
                  {assets.filter((a) => a.type === 'article').length}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">文章</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="text-2xl font-semibold text-gray-900 tabular">
                  {assets.filter((a) => a.type === 'video').length}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">视频脚本</div>
              </div>
            </div>

            {/* 资产表格 */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider px-4 py-3">标题</th>
                    <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider px-4 py-3">类型</th>
                    <th className="text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider px-4 py-3">创建时间</th>
                    <th className="text-right text-[11px] font-medium text-gray-500 uppercase tracking-wider px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((asset) => {
                    const typeInfo = TYPE_LABELS[asset.type] || TYPE_LABELS.note
                    return (
                      <tr key={asset.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-md">{asset.title}</div>
                          {asset.hook && (
                            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-md line-clamp-1">
                              {asset.hook}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar size={12} />
                            {formatDate(asset.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleStartRecord(asset)}
                              className={`p-1.5 rounded-md hover:bg-gray-100 ${
                                recordedAssetIds.has(asset.id)
                                  ? 'text-emerald-500'
                                  : 'text-gray-500 hover:text-brand-600'
                              }`}
                              title={recordedAssetIds.has(asset.id) ? '已记录表现（可继续追加）' : '复盘表现'}
                            >
                              <BarChart3 size={14} />
                            </button>
                            <button
                              onClick={() => setViewing(asset)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              title="查看"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleCopy(asset.body)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              title="复制全文"
                            >
                              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => handleDelete(asset.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600"
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 查看详情弹窗 */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setViewing(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 truncate flex-1">{viewing.title}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(viewing.body)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs hover:bg-gray-200"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? '已复制' : '复制'}
                </button>
                <button
                  onClick={() => setViewing(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {viewing.hook && (
                <div className="mb-4">
                  <div className="text-[11px] font-medium text-gray-500 uppercase mb-1">钩子</div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800">{viewing.hook}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] font-medium text-gray-500 uppercase mb-1">正文</div>
                <pre className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {viewing.body}
                </pre>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center">
              <div className="text-xs text-gray-400">
                创建于 {new Date(viewing.createdAt).toLocaleString()}
              </div>
              <button
                onClick={() => handleDelete(viewing.id)}
                className="text-xs text-red-500 hover:text-red-600"
              >
                删除此资产
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 复盘表现录入弹窗 */}
      {recording && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-6" onClick={() => setRecording(null)}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-600" />
                <h3 className="font-semibold text-gray-900">复盘表现</h3>
              </div>
              <button
                onClick={() => setRecording(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 这篇内容 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-[11px] text-gray-500 mb-1">这篇内容</div>
                <div className="text-sm font-medium text-gray-900 truncate">{recording.title}</div>
                {recording.hook && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{recording.hook}</div>
                )}
              </div>

              {/* 发布链接 */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">发布链接（可选）</label>
                <div className="relative">
                  <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={perfForm.platformUrl}
                    onChange={(e) => setPerfForm({ ...perfForm, platformUrl: e.target.value })}
                    placeholder="小红书笔记链接"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
                  />
                </div>
              </div>

              {/* 发布时间 */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">发布时间（可选）</label>
                <input
                  type="date"
                  value={perfForm.publishedAt}
                  onChange={(e) => setPerfForm({ ...perfForm, publishedAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
                />
              </div>

              {/* 表现数据 */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">表现数据</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'views', label: '浏览', placeholder: '0' },
                    { key: 'likes', label: '点赞', placeholder: '0' },
                    { key: 'saves', label: '收藏', placeholder: '0' },
                    { key: 'comments', label: '评论', placeholder: '0' },
                    { key: 'shares', label: '分享', placeholder: '0' },
                  ].map((field) => (
                    <div key={field.key}>
                      <div className="text-[11px] text-gray-500 mb-1">{field.label}</div>
                      <input
                        type="number"
                        min="0"
                        value={perfForm[field.key]}
                        onChange={(e) => setPerfForm({ ...perfForm, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm tabular focus:outline-none focus:border-brand-400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setRecording(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveRecord}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
              >
                保存表现记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}