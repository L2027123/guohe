import { useState } from 'react'
import { X, Check, Crown, Users, Loader2, KeyRound, ExternalLink } from 'lucide-react'
import { activateWithOrder, getStoredLicense, MIANBAODUO_BUY_URL } from '../utils/license'
import { useStore } from '../store/useStore'

const PLANS = [
  {
    id: 'free',
    name: '免费版',
    price: '¥0',
    period: '',
    icon: null,
    features: [
      '爆款拆解 2 次',
      'AI 生成 5 次',
      '数据复盘 2 次',
      '1 个项目',
    ],
    cta: '当前方案',
    disabled: true,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro 版',
    price: '¥29',
    period: '/月',
    icon: Crown,
    badge: '最受欢迎',
    features: [
      '无限爆款拆解',
      '无限 AI 生成',
      '无限数据复盘',
      '10 个项目',
      '分镜脚本导出',
      'BGM 推荐',
    ],
    cta: '升级 Pro',
    disabled: false,
    highlight: true,
  },
  {
    id: 'lifetime',
    name: '终身版',
    price: '¥199',
    period: '一次买断',
    icon: Users,
    badge: '最划算',
    features: [
      'Pro 全部功能',
      '永久使用',
      '优先体验新功能',
      '专属反馈通道',
    ],
    cta: '买断终身',
    disabled: false,
    highlight: false,
  },
]

export default function PricingModal({ isOpen, onClose }) {
  const [activating, setActivating] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [activateError, setActivateError] = useState('')
  const [showActivate, setShowActivate] = useState(false)
  const [activateSuccess, setActivateSuccess] = useState(false)
  const upgradeToPro = useStore((s) => s.upgradeToPro)
  const plan = useStore((s) => s.plan)

  if (!isOpen) return null

  const existingLicense = getStoredLicense()

  const handleBuy = (tier) => {
    window.open(MIANBAODUO_BUY_URL, '_blank')
    setShowActivate(true)
  }

  const handleActivate = async () => {
    if (!orderId.trim()) {
      setActivateError('请输入面包多订单号')
      return
    }
    setActivating(true)
    setActivateError('')
    try {
      const result = await activateWithOrder(orderId.trim())
      if (result.success) {
        upgradeToPro(result.license.tier === 'lifetime' ? 'lifetime' : 'pro')
        setActivateSuccess(true)
        setTimeout(() => {
          onClose()
          setActivateSuccess(false)
          setOrderId('')
          setShowActivate(false)
        }, 2000)
      } else {
        setActivateError(result.error || '验证失败，请检查订单号')
      }
    } catch (err) {
      setActivateError('网络错误，请稍后重试')
    } finally {
      setActivating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a2e] rounded-3xl max-w-4xl w-full mx-auto p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white">选择适合你的方案</h2>
          <p className="text-gray-400 text-sm mt-2">解锁更强大的拆解能力，让你的内容创作更高效</p>
        </div>

        {existingLicense ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-900/30 border border-emerald-700">
              <Crown size={18} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">
                {existingLicense.tier === 'lifetime' ? '终身版' : 'Pro 版'} 已激活
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              {existingLicense.expiresAt
                ? `到期时间：${new Date(existingLicense.expiresAt).toLocaleDateString('zh-CN')}`
                : '永久有效'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PLANS.map((planItem) => {
                const Icon = planItem.icon
                return (
                  <div
                    key={planItem.id}
                    className={`relative bg-[#0a0a0f] rounded-2xl p-6 border transition-all ${
                      planItem.highlight
                        ? 'border-[#7C3AED] ring-2 ring-brand-500/20 scale-[1.02]'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {planItem.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-600 text-white text-xs font-medium">
                        {planItem.badge}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      {Icon && <Icon size={18} className="text-brand-400" />}
                      <h3 className="text-white font-semibold text-lg">{planItem.name}</h3>
                    </div>
                    <div className="mb-5">
                      <span className="text-3xl font-bold text-white">{planItem.price}</span>
                      <span className="text-gray-500 text-sm">{planItem.period}</span>
                    </div>
                    <ul className="space-y-2.5 mb-6">
                      {planItem.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <Check size={16} className="text-brand-400 mt-0.5 shrink-0" />
                          {feat}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => {
                        if (!planItem.disabled) handleBuy(planItem.id)
                      }}
                      disabled={planItem.disabled}
                      className={`w-full py-2.5 rounded-full text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                        planItem.highlight
                          ? 'bg-brand-600 text-white hover:bg-brand-700'
                          : planItem.disabled
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                    >
                      {!planItem.disabled && <ExternalLink size={14} />}
                      {planItem.cta}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* 订单号激活区 */}
            {showActivate && (
              <div className="mt-6 rounded-2xl border border-brand-700 bg-[#0a0a0f] p-5">
                {activateSuccess ? (
                  <div className="text-center py-4">
                    <Check size={32} className="text-emerald-400 mx-auto mb-2" />
                    <p className="text-emerald-400 font-medium">激活成功！正在刷新...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <KeyRound size={16} className="text-brand-400" />
                      <span className="text-sm font-medium text-white">输入面包多订单号激活</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      在面包多完成支付后，你会收到一个订单号。把它粘贴到下面，点击激活即可解锁 Pro 功能。
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
                        placeholder="粘贴面包多订单号"
                        className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700 text-white text-sm placeholder-gray-600 focus:border-brand-500 focus:outline-none"
                      />
                      <button
                        onClick={handleActivate}
                        disabled={activating}
                        className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {activating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {activating ? '验证中' : '激活'}
                      </button>
                    </div>
                    {activateError && (
                      <p className="text-xs text-red-400 mt-2">{activateError}</p>
                    )}
                  </>
                )}
              </div>
            )}

            {!showActivate && (
              <button
                onClick={() => setShowActivate(true)}
                className="mt-4 text-xs text-gray-500 hover:text-brand-400 transition-colors w-full text-center"
              >
                已购买？输入订单号激活 →
              </button>
            )}
          </>
        )}

        <p className="text-center text-gray-500 text-xs mt-6">
          支持微信/支付宝 · 面包多安全交易 · 购买后自动激活
        </p>
      </div>
    </div>
  )
}
