import { X, Check, Crown, Users } from 'lucide-react'

const PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    period: '',
    icon: null,
    features: [
      '基础拆解（3维度）',
      '保存 3 条爆款',
      '每月 2 次拆解',
    ],
    cta: '当前方案',
    disabled: true,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro 版',
    price: '¥39',
    period: '/月',
    icon: Crown,
    badge: '最受欢迎',
    features: [
      '深度拆解（10+维度）',
      '无限保存爆款案例',
      'AI 改写生成',
      '每天 5 次拆解',
    ],
    cta: '升级 Pro',
    disabled: false,
    highlight: true,
    onClick: () => console.log('subscribe:pro'),
  },
  {
    id: 'team',
    name: 'Team 版',
    price: '¥199',
    period: '/月',
    icon: Users,
    features: [
      '5 人团队协作',
      '批量拆解',
      '竞品监控',
      '优先客服支持',
    ],
    cta: '联系销售',
    disabled: false,
    highlight: false,
    onClick: () => console.log('subscribe:team'),
  },
]

export default function PricingModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] rounded-3xl max-w-4xl w-full mx-auto p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X size={20} />
        </button>

        {/* 标题 */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">选择适合你的方案</h2>
          <p className="text-gray-400 text-sm mt-2">解锁更强大的拆解能力，让你的内容创作更高效</p>
        </div>

        {/* 定价卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`relative bg-[#0a0a0f] rounded-2xl p-6 border transition-all ${
                  plan.highlight
                    ? 'border-[#7C3AED] ring-2 ring-brand-500/20 scale-[1.02]'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
              >
                {/* 角标 */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-600 text-white text-xs font-medium">
                    {plan.badge}
                  </div>
                )}

                {/* 方案名 */}
                <div className="flex items-center gap-2 mb-1">
                  {Icon && <Icon size={18} className="text-brand-400" />}
                  <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
                </div>

                {/* 价格 */}
                <div className="mb-5">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>

                {/* 功能列表 */}
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <Check size={16} className="text-brand-400 mt-0.5 shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* 按钮 */}
                <button
                  onClick={() => {
                    plan.onClick?.()
                    if (!plan.disabled) onClose()
                  }}
                  disabled={plan.disabled}
                  className={`w-full py-2.5 rounded-full text-sm font-medium transition-colors ${
                    plan.highlight
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : plan.disabled
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            )
          })}
        </div>

        {/* 底部说明 */}
        <p className="text-center text-gray-500 text-xs mt-6">
          所有方案均包含 7 天无理由退款保障 · 支持微信/支付宝
        </p>
      </div>
    </div>
  )
}
