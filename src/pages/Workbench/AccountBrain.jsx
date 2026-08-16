import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  Lightbulb,
  XCircle,
  FileText,
  TrendingUp,
  LineChart,
} from 'lucide-react'

/* ============ Header 统计卡片 ============ */
function StatsHeader({ contentCount, patternCount, winningCount, failedCount }) {
  const stats = [
    { label: '学习内容', value: contentCount, icon: FileText, color: 'bg-blue-50 text-blue-600' },
    { label: '爆款模式', value: patternCount, icon: Sparkles, color: 'bg-purple-50 text-brand-600' },
    { label: '成功规律', value: winningCount, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
    { label: '避坑规则', value: failedCount, icon: XCircle, color: 'bg-amber-50 text-amber-600' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ============ 通用区块头 ============ */
function SectionHeader({ title, subtitle, icon: Icon, color }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  )
}

/* ============ 标签 Chip ============ */
function Chip({ children, type = 'default' }) {
  const styles = {
    default: 'bg-gray-50 text-gray-700 border-gray-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    danger: 'bg-red-50 text-red-700 border-red-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${styles[type]}`}
    >
      {children}
    </span>
  )
}

/* ============ 子分组（选题/Hook/结构/表达） ============ */
function SubGroup({ label, items, type = 'default', icon: Icon }) {
  if (!items || items.length === 0) return null
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-1.5 mb-2">
        {Icon && <Icon size={13} className="text-gray-400" />}
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <span className="text-[11px] text-gray-400">· {items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <Chip key={i} type={type}>
            {item}
          </Chip>
        ))}
      </div>
    </div>
  )
}

/* ============ 学习历史卡片 ============ */
function HistoryItem({ record }) {
  const perf = record.performance || {}
  const views = perf.views || 0
  const engage = views > 0
    ? (((perf.likes || 0) + (perf.comments || 0) + (perf.saves || 0)) / views * 100).toFixed(1)
    : 0
  const isHigh = Number(engage) >= 10
  const isLow = Number(engage) < 5
  const rateColor = isHigh ? 'text-emerald-600' : isLow ? 'text-red-500' : 'text-amber-600'

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-3 last:mb-0">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-gray-900 truncate mb-1">
            {record.topic || record.title || '未命名作品'}
          </h4>
          {record.hook && (
            <p className="text-xs text-gray-500 truncate">「{record.hook.substring(0, 40)}…」</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-bold ${rateColor}`}>{engage}%</div>
          <div className="text-[11px] text-gray-400">互动率</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 mb-3">
        <span className="flex items-center gap-1"><LineChart size={11} />{views.toLocaleString()}播放</span>
        <span>👍{(perf.likes||0).toLocaleString()}</span>
        <span>💬{(perf.comments||0).toLocaleString()}</span>
        <span>⭐{(perf.saves||0).toLocaleString()}</span>
      </div>
      {record.aiAnalysis?.lessons?.length > 0 && (
        <div className="p-3 rounded-lg bg-brand-50/50 border border-brand-100/50">
          <div className="flex items-center gap-1.5 text-xs font-medium text-brand-700 mb-1.5">
            <Lightbulb size={12} /> AI 总结经验
          </div>
          <ul className="space-y-0.5">
            {record.aiAnalysis.lessons.slice(0, 2).map((l, i) => (
              <li key={i} className="text-xs text-brand-900/80 leading-relaxed pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-brand-500">
                {l}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ============ 空状态 ============ */
function EmptyState({ navigate }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-purple-50 flex items-center justify-center mx-auto mb-4">
        <Brain size={32} className="text-brand-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">你的账号还没有形成记忆</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed mb-6">
        完成一次「爆款拆解」或「作品复盘」后，<br />
        果核 的 AI 会自动分析数据，沉淀专属于你账号的成功规律。
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => navigate('/workbench/competitor-analyzer')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/10"
        >
          <Sparkles size={15} /> 去拆解爆款
        </button>
        <button
          onClick={() => navigate('/workbench/performance-review')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <TrendingUp size={15} /> 去作品复盘
        </button>
      </div>
    </div>
  )
}

/* ============ 主页面 ============ */
export default function AccountBrain() {
  const navigate = useNavigate()
  const currentProjectId = useStore((s) => s.currentProjectId)
  const allAccountMemory = useStore((s) => s.accountMemory)
  const allContentPatterns = useStore((s) => s.contentPatterns)

  const memory = useMemo(
    () => allAccountMemory.find((m) => m.projectId === currentProjectId),
    [allAccountMemory, currentProjectId]
  )
  const projectPatterns = useMemo(
    () => allContentPatterns.filter((p) => p.projectId === currentProjectId),
    [allContentPatterns, currentProjectId]
  )

  const wp = memory?.winningPatterns || {}
  const fp = memory?.failedPatterns || {}
  const history = memory?.contentHistory || []

  const winningCount =
    (wp.topics?.length || 0) +
    (wp.hooks?.length || 0) +
    (wp.structures?.length || 0) +
    (wp.expressions?.length || 0)
  const failedCount =
    (fp.topics?.length || 0) + (fp.hooks?.length || 0) + (fp.reasons?.length || 0)

  const hasAnything = winningCount > 0 || failedCount > 0 || history.length > 0 || projectPatterns.length > 0

  return (
    <div className="p-4 md:p-6 min-h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        {/* 标题区 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Brain size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">你的账号大脑</h1>
              <p className="text-xs text-gray-500">
                果核 自动学习你的账号表现，形成可复用的专属创作规律
              </p>
            </div>
          </div>
        </div>

        {!hasAnything ? (
          <EmptyState navigate={navigate} />
        ) : (
          <>
            {/* 统计 */}
            <StatsHeader
              contentCount={history.length}
              patternCount={projectPatterns.length}
              winningCount={winningCount}
              failedCount={failedCount}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 模块1：成功模式 */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <SectionHeader
                  title="成功模式"
                  subtitle="已被验证有效的创作元素，请优先复用"
                  icon={CheckCircle2}
                  color="bg-emerald-50 text-emerald-600"
                />
                {winningCount === 0 ? (
                  <p className="text-xs text-gray-400 py-4">暂无成功规律，复盘高表现作品后自动提取</p>
                ) : (
                  <>
                    <SubGroup label="选题规律" items={wp.topics} type="success" icon={Sparkles} />
                    <SubGroup label="Hook 规律" items={wp.hooks} type="success" icon={Lightbulb} />
                    <SubGroup label="结构规律" items={wp.structures} type="success" icon={FileText} />
                    <SubGroup label="表达规律" items={wp.expressions} type="success" icon={TrendingUp} />
                  </>
                )}
              </div>

              {/* 模块2：失败模式 */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <SectionHeader
                  title="失败模式"
                  subtitle="已被验证无效的元素，下次生成自动规避"
                  icon={AlertTriangle}
                  color="bg-amber-50 text-amber-600"
                />
                {failedCount === 0 ? (
                  <p className="text-xs text-gray-400 py-4">暂无避坑规则，复盘低表现作品后自动提取</p>
                ) : (
                  <div className="space-y-2">
                    {(fp.topics || []).map((t, i) => (
                      <div key={`t-${i}`} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50/60 border border-red-100">
                        <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-red-700 leading-relaxed">选题：{t}</span>
                      </div>
                    ))}
                    {(fp.hooks || []).map((h, i) => (
                      <div key={`h-${i}`} className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50/60 border border-red-100">
                        <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-red-700 leading-relaxed">Hook：{h}</span>
                      </div>
                    ))}
                    {(fp.reasons || []).map((r, i) => (
                      <div key={`r-${i}`} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/60 border border-amber-100">
                        <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-xs text-amber-800 leading-relaxed">{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 模块3：学习历史 */}
            <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5">
              <SectionHeader
                title="最近学习"
                subtitle="数据复盘作品，AI 总结经验并沉淀规律"
                icon={Clock}
                color="bg-blue-50 text-blue-600"
              />
              {history.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">暂无学习记录</p>
                  <button
                    onClick={() => navigate('/workbench/performance-review')}
                    className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    立即录入作品数据 <ArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <>
                  {history.slice(0, 5).map((record) => (
                    <HistoryItem key={record.id} record={record} />
                  ))}
                  {history.length > 5 && (
                    <div className="text-center mt-3">
                      <p className="text-xs text-gray-400">仅显示最近 5 条，共 {history.length} 条记录</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
