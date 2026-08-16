import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  TrendingUp,
  Sparkles,
  Eye,
  Zap,
  Target,
  Lightbulb,
  Copy,
  CheckCheck,
  Home,
  Users,
  Heart,
  Bookmark,
} from 'lucide-react'

// ===== 案例数据 =====
const ACCOUNT_INPUT = {
  platform: '小红书',
  category: '家居改造 / 租房生活',
  followers: '1.2万',
  samples: [
    { title: '3000元改造出租屋', likes: 3200, desc: '图文笔记，9张改造前后对比图' },
    { title: '小户型收纳技巧', likes: 1800, desc: '干货合集，收纳神器推荐' },
    { title: '我的卧室改造前后', likes: 5100, desc: 'vlog形式，记录改造全过程' },
  ],
}

const AI_ANALYSIS = {
  style: '温暖型生活记录',
  persona: '一个在外租房、用心生活的年轻人',
  audience: '20-28岁租房女性，向往品质生活但预算有限',
  strengths: [
    '擅长用真实经历建立信任，不装不端',
    '前后对比制造视觉冲击，天然有传播力',
    '情绪共鸣强，让用户觉得"我也可以"',
  ],
}

const VIRAL_PATTERNS = [
  {
    name: '强场景开头',
    icon: Zap,
    bad: '分享我的装修经验',
    good: '一个人在外租房，我花3000块把它变成了家',
    insight: '用户刷到的是"一个人""3000块""变成家"三个信息点，立刻知道这是给谁看的、能解决什么问题。',
  },
  {
    name: '前后对比钩子',
    icon: Eye,
    bad: '今天来聊聊收纳',
    good: '改造前：杂物堆满地的10㎡卧室 → 改造后：我能躺在上面发呆',
    insight: '对比产生好奇，用户会划动看"到底变成了什么样"，自然提高完读率。',
  },
  {
    name: '情绪价值收尾',
    icon: Heart,
    bad: '以上就是我用的收纳神器',
    good: '不是房子大了才幸福，是用心了才像家',
    insight: '干货容易被收藏，但情绪才会被转发。结尾给用户一个"替我说出来"的句子。',
  },
]

const GENERATED_TOPICS = [
  {
    title: '出租屋不用搬家，也能拥有高级感的5个改变',
    hook: '租房党别急着搬，这5个地方改一下，房东看了都想加价',
    angle: '低成本改造 + 具体清单',
    reason: '命中"不想搬家"痛点 + "高级感"欲望',
  },
  {
    title: '一个女生住出租屋后，我最庆幸买的7件东西',
    hook: '住了3年出租屋，这7件东西我换了3个城市都带着走',
    angle: '个人经历 + 真实推荐',
    reason: '"3个城市都带着走"制造信任感和好奇',
  },
  {
    title: '预算1000元，我重新布置了我的小房间',
    hook: '1000块能改变什么？我把10㎡的出租屋改成了ins风',
    angle: '预算限定 + 改造对比',
    reason: '具体数字 + 限定条件 = 高点击率公式',
  },
  {
    title: '出租屋改造避坑指南：我花冤枉钱的5个东西',
    hook: '别再买了！这5个网红收纳神器我用过，全是智商税',
    angle: '避坑反向 + 真实测评',
    reason: '反向选题 + "智商税"触发情绪共鸣',
  },
  {
    title: '一个人住出租屋的第100天，我的生活发生了这些变化',
    hook: '从搬进来到现在100天，不只是房间变了',
    angle: '情绪叙事 + 成长记录',
    reason: '时间线 + 情绪转折 = 高转发内容',
  },
]

const BEFORE_AFTER = {
  before: {
    title: '用 AI 之前',
    items: [
      '每条内容互动量忽高忽低',
      '不知道哪条会火，靠运气',
      '选题靠刷同行，写出来没自己的味道',
      '花了2小时想选题，还是写不出爆款',
    ],
  },
  after: {
    title: '用 AI 之后',
    items: [
      '知道了3个固定爆款公式，每条都套用',
      '5个选题直接可用，不用从零开始想',
      'AI 找到了"温暖生活记录"这个定位',
      '知道了用户真正想看什么',
    ],
  },
}

// ===== 组件 =====
function StepBadge({ num, label }) {
  return (
    <div className="inline-flex items-center gap-2 mb-4">
      <span className="w-7 h-7 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center">
        {num}
      </span>
      <span className="text-sm font-medium text-gray-600">{label}</span>
    </div>
  )
}

function CopyableText({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 hover:bg-white text-gray-400 hover:text-brand-600 transition-colors"
      title="复制"
    >
      {copied ? <CheckCheck size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

export default function CaseStudy() {
  const navigate = useNavigate()

  const handleStart = () => {
    navigate('/onboarding')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
              C
            </div>
            <span className="font-semibold text-[15px] text-gray-900">果核</span>
          </button>
          <button
            onClick={handleStart}
            className="px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors"
          >
            试试分析我的账号
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5">
        {/* ===== Hero ===== */}
        <section className="pt-12 pb-10 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium mb-5">
            <Sparkles size={13} />
            Beta 真实案例
          </div>
          <h1 className="text-[26px] md:text-3xl font-bold text-gray-900 leading-tight mb-4">
            AI 是怎么帮一个家居博主<br />找到爆款规律的
          </h1>
          <p className="text-[15px] text-gray-500 leading-relaxed max-w-md mx-auto">
            不是帮你随机写内容。先让 AI 读懂你的账号，发现你的爆款规律，再生成下一批内容。
          </p>
          <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Home size={13} /> 小红书</span>
            <span className="flex items-center gap-1"><Users size={13} /> 1.2万粉</span>
            <span className="flex items-center gap-1"><Heart size={13} /> 家居改造</span>
          </div>
        </section>

        {/* ===== Step 1: 输入了什么 ===== */}
        <section className="py-8 border-t border-gray-100">
          <StepBadge num={1} label="博主给了 AI 什么" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">3 条历史内容</h2>
          <p className="text-sm text-gray-500 mb-6">不需要写长文，把发过的标题和数据给 AI 就行</p>

          <div className="space-y-3">
            {ACCOUNT_INPUT.samples.map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span className="text-sm font-medium text-gray-900">{s.title}</span>
                  <span className="flex items-center gap-1 text-xs text-red-500 shrink-0">
                    <Heart size={12} className="fill-red-500" />
                    {s.likes}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Step 2: AI 分析结果 ===== */}
        <section className="py-8 border-t border-gray-100">
          <StepBadge num={2} label="AI 看到了什么" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">账号风格分析</h2>
          <p className="text-sm text-gray-500 mb-6">AI 从 3 条内容里提取出的结论</p>

          {/* 风格卡片 */}
          <div className="p-5 rounded-xl bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-100 mb-4">
            <div className="text-xs text-gray-500 mb-1">账号风格</div>
            <div className="text-lg font-bold text-gray-900 mb-3">{AI_ANALYSIS.style}</div>
            <div className="text-xs text-gray-500 mb-1">人设定位</div>
            <div className="text-sm text-gray-700 mb-3">{AI_ANALYSIS.persona}</div>
            <div className="text-xs text-gray-500 mb-1">用户画像</div>
            <div className="text-sm text-gray-700">{AI_ANALYSIS.audience}</div>
          </div>

          {/* 内容优势 */}
          <div>
            <div className="text-xs font-medium text-gray-400 mb-3">AI 发现的内容优势：</div>
            <ul className="space-y-2.5">
              {AI_ANALYSIS.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                  <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== Step 3: 爆款规律 ===== */}
        <section className="py-8 border-t border-gray-100">
          <StepBadge num={3} label="AI 发现的爆款规律" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">3 个可复制的公式</h2>
          <p className="text-sm text-gray-500 mb-6">不是泛泛的"要抓好内容"，是具体的句式和结构</p>

          <div className="space-y-5">
            {VIRAL_PATTERNS.map((p, i) => {
              const Icon = p.icon
              return (
                <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* 规律头 */}
                  <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Icon size={17} />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      公式 {i + 1}：{p.name}
                    </span>
                  </div>

                  {/* 对比 */}
                  <div className="p-4 space-y-3">
                    <div className="p-3 rounded-lg bg-red-50/50 border border-red-100">
                      <div className="text-[11px] text-red-400 font-medium mb-1">❌ 普通写法</div>
                      <div className="text-sm text-gray-600 line-through decoration-red-200">
                        {p.bad}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50/50 border border-green-100 relative">
                      <div className="text-[11px] text-green-500 font-medium mb-1">✅ 爆款写法</div>
                      <div className="text-sm text-gray-900 font-medium pr-8">{p.good}</div>
                      <CopyableText text={p.good} />
                    </div>
                    <div className="flex items-start gap-2 pt-1">
                      <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-500 leading-relaxed">{p.insight}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ===== Step 4: 生成下一批内容 ===== */}
        <section className="py-8 border-t border-gray-100">
          <StepBadge num={4} label="AI 生成的下一批内容" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">5 个可以直接用的选题</h2>
          <p className="text-sm text-gray-500 mb-6">每个选题都带 Hook 开头和切入角度，复制就能写</p>

          <div className="space-y-3">
            {GENERATED_TOPICS.map((t, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-gray-200 hover:border-brand-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 leading-snug">{t.title}</h3>
                  </div>
                </div>
                <div className="ml-9 space-y-2">
                  <div className="p-2.5 rounded-lg bg-gray-50 relative">
                    <div className="text-[11px] text-brand-500 font-medium mb-0.5">Hook 开头</div>
                    <div className="text-xs text-gray-700 pr-7">{t.hook}</div>
                    <CopyableText text={t.hook} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Target size={11} /> {t.angle}
                    </span>
                  </div>
                  <div className="flex items-start gap-1 text-[11px] text-gray-400">
                    <TrendingUp size={11} className="shrink-0 mt-0.5" />
                    <span>{t.reason}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== 用前 vs 用后 ===== */}
        <section className="py-8 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">用 AI 前后的区别</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-red-50/40 border border-red-100">
              <div className="text-xs font-semibold text-red-400 mb-3">{BEFORE_AFTER.before.title}</div>
              <ul className="space-y-2">
                {BEFORE_AFTER.before.items.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500 leading-relaxed">
                    <span className="text-red-300 shrink-0 mt-0.5">✕</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-green-50/40 border border-green-100">
              <div className="text-xs font-semibold text-green-500 mb-3">{BEFORE_AFTER.after.title}</div>
              <ul className="space-y-2">
                {BEFORE_AFTER.after.items.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed">
                    <Check size={13} className="text-green-500 shrink-0 mt-0.5" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="py-10 border-t border-gray-100">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-600 to-purple-600 text-center">
            <h2 className="text-lg font-bold text-white mb-2">你的账号，也可以这样被分析</h2>
            <p className="text-sm text-white/80 mb-5 leading-relaxed">
              给 AI 3 条你发过的内容<br />看看它能发现什么规律
            </p>
            <button
              onClick={handleStart}
              className="px-7 py-3 rounded-xl bg-white text-brand-600 font-semibold text-[15px] transition-all inline-flex items-center gap-2 hover:bg-gray-50 shadow-lg"
            >
              免费分析我的账号
              <ArrowRight size={18} />
            </button>
            <p className="mt-3 text-xs text-white/60">不需要注册 · 数据存在你的浏览器</p>
          </div>
        </section>

        {/* ===== Footer ===== */}
        <footer className="py-8 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400">果核 · 让 AI 先读懂你的账号，再帮你持续创作</p>
        </footer>
      </main>
    </div>
  )
}
