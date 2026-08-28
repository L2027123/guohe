import { useState } from 'react'
import { useStore } from '../store/useStore'
import { Sparkles, Crown, X } from 'lucide-react'
import PricingModal from './PricingModal'

export default function UpgradePrompt({ scenario = 'generate', onClose }) {
  const plan = useStore((s) => s.plan)
  const getRemainingCredits = useStore((s) => s.getRemainingCredits)
  const [showPricing, setShowPricing] = useState(false)

  if (plan.tier !== 'free') return null

  const remaining = {
    competitor: getRemainingCredits('competitorAnalyze'),
    review: getRemainingCredits('performanceReview'),
    generate: getRemainingCredits('aiGenerate'),
  }

  const copy = {
    competitor: {
      title: '爆款拆解完成',
      desc: '你的账号大脑已记录这个爆款模式，下次生成会自动复用。',
    },
    review: {
      title: '账号规律已入库',
      desc: 'AI 已从本次复盘中提取成功/失败模式，下次生成会自动规避。',
    },
    generate: {
      title: '内容已生成',
      desc: '本次生成已读取账号大脑的记忆，越用越懂你的风格。',
    },
  }

  const c = copy[scenario] || copy.generate
  const totalUsed = (2 - remaining.competitor) + (2 - remaining.review) + (5 - remaining.generate)
  const isLow = remaining.generate <= 2

  return (
    <>
      <div className="mt-4 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-purple-50 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-gray-900">{c.title}</span>
              {isLow && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">
                  额度即将用完
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mb-3">{c.desc}</p>

            <div className="flex flex-wrap gap-3 mb-4">
              <CreditBadge label="爆款拆解" remaining={remaining.competitor} total={2} />
              <CreditBadge label="内容生成" remaining={remaining.generate} total={5} />
              <CreditBadge label="数据复盘" remaining={remaining.review} total={2} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowPricing(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
              >
                <Crown size={14} />
                升级 Pro · ¥29/月 不限次数
              </button>
              <span className="inline-flex items-center text-xs text-gray-400 self-center">
                已用 {totalUsed} / 9 次免费体验
              </span>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </>
  )
}

function CreditBadge({ label, remaining, total }) {
  const isOut = remaining === 0
  return (
    <div className={`px-2.5 py-1 rounded-lg text-xs ${isOut ? 'bg-red-50 text-red-600' : 'bg-white text-gray-600 border border-gray-100'}`}>
      {label}：<span className="font-semibold">{remaining}/{total}</span>
      {isOut && ' 已用完'}
    </div>
  )
}
