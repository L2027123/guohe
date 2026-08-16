import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Brain,
  TrendingUp,
  Stethoscope,
  ArrowRight,
  Check,
  Zap,
  Heart,
  Users,
} from 'lucide-react'
import { useStore } from '../store/useStore'

/* ============ 价值卡片 ============ */
function ValueCard({ icon: Icon, title, desc, color }) {
  const colorMap = {
    purple: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
        <Icon size={24} />
      </div>
      <h3 className="font-semibold text-gray-900 text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  )
}

/* ============ 流程步骤 ============ */
function FlowStep({ num, title, desc, isLast }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center text-sm shrink-0">
          {num}
        </div>
        {!isLast && <div className="w-px h-12 bg-gray-200 mt-2" />}
      </div>
      <div className="pt-1.5 pb-8">
        <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

/* ============ 主页面 ============ */
export default function Welcome() {
  const navigate = useNavigate()
  const onboardingCompleted = useStore((s) => s.onboardingCompleted)
  const projects = useStore((s) => s.projects)

  const handleStart = () => {
    if (onboardingCompleted && projects.length > 0) {
      navigate('/dashboard')
    } else {
      navigate('/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/40 via-white to-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* ── Hero 区域 ── */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-medium mb-6">
            <Sparkles size={12} />
            AI 内容运营员工
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            果核
          </h1>
          <p className="text-xl text-gray-600 mb-3">
            你的 AI 内容运营员工
          </p>
          <p className="text-base text-gray-400 max-w-md mx-auto leading-relaxed">
            不是工具，是同事。训练它懂你的风格，它会帮你选题、写文、复盘、优化——24小时不停。
          </p>

          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-sm"
            >
              免费开始
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('how-it-works')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="px-6 py-3 bg-white text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors border border-gray-200"
            >
              看看怎么用
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            无需信用卡 · 15分钟感受价值
          </p>
        </div>

        {/* ── 三个核心价值 ── */}
        <div className="grid md:grid-cols-3 gap-4 mb-20">
          <ValueCard
            icon={Brain}
            title="它会学习"
            color="purple"
            desc="上传3篇你的爆款内容，AI 自动提取你的内容DNA。下一次生成就是你的风格，不是通用模板。"
          />
          <ValueCard
            icon={TrendingUp}
            title="它会复盘"
            color="blue"
            desc="告诉它每篇的浏览点赞，AI 分析什么有效什么没用，自动沉淀为账号规则，越用越懂你。"
          />
          <ValueCard
            icon={Stethoscope}
            title="它会诊断"
            color="green"
            desc="一键体检账号健康度，输出优势、问题、下一步策略，像有个运营总监帮你看着。"
          />
        </div>

        {/* ── 使用流程 ── */}
        <div id="how-it-works" className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">4步开始你的内容自动化</h2>
            <p className="text-sm text-gray-500">从训练到优化，形成闭环</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <FlowStep
              num={1}
              title="训练账号模型"
              desc="上传历史内容 → AI 学习你的内容风格，提取人设、标题套路、内容结构"
            />
            <FlowStep
              num={2}
              title="发现内容机会"
              desc="AI 根据你的方向和风格，推荐高潜选题，一键采纳进入生产"
            />
            <FlowStep
              num={3}
              title="自动生产内容"
              desc="选题 + 风格模型 → 生成你的风格正文，不是通用模板，是你独有语气"
            />
            <FlowStep
              num={4}
              title="数据反馈优化"
              desc="记录每篇表现 → AI学习什么有效 → 越用越懂你，形成飞轮"
              isLast
            />
          </div>
        </div>

        {/* ── 免费vs付费 ── */}
        <div className="grid md:grid-cols-2 gap-4 mb-20">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={18} className="text-amber-500" />
              <h3 className="font-semibold text-gray-900">免费体验</h3>
            </div>
            <ul className="space-y-2">
              {['AI生成 3 次', '账号诊断 1 次', '1个项目', '5条表现记录'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-gray-600">
                  <Check size={14} className="text-emerald-500 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              推荐
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Heart size={18} />
              <h3 className="font-semibold">Pro 计划</h3>
            </div>
            <ul className="space-y-2 mb-6">
              {['无限 AI 生成', '无限账号诊断', '10个项目', '无限表现记录', '内容导出', '优先客服'].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm">
                  <Check size={14} className="shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="text-2xl font-bold">
              ¥39<span className="text-sm font-normal opacity-80">/月</span>
            </div>
          </div>
        </div>

        {/* ── 底部 CTA ── */}
        <div className="text-center py-12 border-t border-gray-100">
          <div className="inline-flex items-center gap-1 text-xs text-gray-400 mb-4">
            <Users size={12} />
            已有 1,000+ 创作者开始使用
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            免费体验 AI 内容运营员工
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            训练一次，它会越来越懂你的内容风格
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-8 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors shadow-sm"
          >
            立即开始
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
