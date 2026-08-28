import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  X,
  Loader2,
  Wand2,
  Sparkles,
  BookOpen,
  Target,
  TrendingUp,
  MessageCircle,
  Key as KeyIcon,
  Settings as SettingsIcon,
  Zap,
  AlertCircle,
  Camera,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { callAI, classifyAIError } from '../utils/aiClient'
import { getApiKey } from '../utils/apiKey'
import { trackEvent, trackOnboardingStepEnter } from '../utils/tracker'
import AIErrorBanner from '../components/AIErrorBanner'
import { smartRecognize } from '../utils/visionOCR'

const ACCOUNT_TYPES = [
  { id: 'xiaohongshu', name: '小红书个人IP', emoji: '📕', desc: '图文笔记 + 种草' },
  { id: 'douyin', name: '抖音短视频', emoji: '🎬', desc: '短视频 + 口播脚本' },
  { id: 'shipinhao', name: '视频号', emoji: '📺', desc: '微信视频号内容' },
  { id: 'gongzhonghao', name: '公众号', emoji: '📝', desc: '长文 + 深度内容' },
  { id: 'tiktok', name: 'TikTok海外', emoji: '🌍', desc: '海外短视频内容' },
  { id: 'enterprise', name: '企业账号', emoji: '🏢', desc: '品牌官方账号' },
]

const CATEGORIES = [
  '生活方式', '美妆', '穿搭', '家居', '美食', '旅行',
  '健身', '育儿', '职场', '科技', '教育', '其他',
]

const GOALS = ['涨粉', '互动', '转化', '品牌建设']

const SAMPLE_TEMPLATES = {
  xiaohongshu: [
    { id: 'tpl-1', text: '姐妹们！我真的要哭了！试了10种方法终于找到能让我不失眠的妙招…前一天晚上还在翻来覆去到3点，用了这个方法之后倒头就睡到天亮！链接放评论区了，需要的姐妹自取。' },
    { id: 'tpl-2', text: '真的别再盲目买护肤品了！作为一个花了5w踩坑的过来人，掏心窝分享3件真正让皮肤变好的事…第2件我猜你一件都没做过。点赞收藏慢慢看！' },
    { id: 'tpl-3', text: '月薪6k存钱日记｜第21天终于摸到了5w！分享我的无痛存钱法：\n1. 工资到账立刻转30%到另一张卡\n2. 每天只花50块，花不完的转存\n3. 把奶茶钱换成余额宝\n坚持6个月，你会回来感谢我。' },
  ],
  douyin: [
    { id: 'tpl-1', text: '你是不是也有过这种经历？明明很努力却没人看。今天我把做了100条视频总结的3个完播密码讲给你听，尤其是第3个，90%的人都不知道。先收藏保存，免得刷着刷着找不到了。' },
    { id: 'tpl-2', text: '30岁还没存款的人，这条视频请你看10遍。第一，停止无效社交，那些只会拉你喝酒的朋友该断就断。第二，工资到手的第一件事不是消费，是…' },
    { id: 'tpl-3', text: '99%的人做账号第一步就错了！别乱发内容了。看完这条视频，你就知道自己应该做什么方向。评论区打"真相"，我把整理的资料发你。' },
  ],
  enterprise: [
    { id: 'tpl-1', text: '很多老板以为在小红书做品牌就是投广告，结果花了20w连水花都没有。真正做得好的品牌，都在做这件事——用户证言内容矩阵。今天拆解3个成功案例，看完你就知道差距在哪了。' },
    { id: 'tpl-2', text: '为什么你的产品明明很好，就是卖不动？答案在内容结构：开头不要讲产品，讲用户的痛点场景；中间不要讲参数，讲对比；结尾不要硬推，讲案例。套进去试试？' },
  ],
  tiktok: [
    { id: 'tpl-1', text: '3 things I wish I knew before I started my content creator journey. Number 1: your first 100 posts are practice. Stop overthinking. Number 2: consistency beats quality in the first 6 months. Number 3: nobody cares about your gear.' },
    { id: 'tpl-2', text: 'I tried every productivity hack and this is the ONLY one that worked. Before: 4 hours to write 1 video script. Now: 25 minutes. Save this video so you don\'t lose it.' },
  ],
}

const DEFAULT_TEMPLATE = [
  { id: 'tpl-1', text: '你是不是也有这种感觉？明明很努力做内容，但数据就是上不去。今天我把我做了半年总结的3个经验告诉你，尤其是第3个，真的很重要。记得点赞收藏，免得刷着刷着找不到了。' },
  { id: 'tpl-2', text: '普通人做账号，千万别做这3件事。第一，不要追热点追得没有自己的方向；第二，不要一条没火就立刻换内容；第三，不要在评论区和抬杠的人争论。先做到了，你会感谢我的。' },
  { id: 'tpl-3', text: '我坚持每天发内容坚持了30天，得到的不是百万播放，而是这3个比播放量还重要的认知…' },
]

// 通用截图上传 + AI 解析组件（上传即分析，体验类似 Kimi）
function ScreenshotAnalyzer({ onAnalyzed, hint }) {
  const [status, setStatus] = useState('idle') // idle | analyzing | done | error
  const [preview, setPreview] = useState('')
  const [progress, setProgress] = useState('')
  const [ocrPhase, setOcrPhase] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [error, setError] = useState('')

  // 上传即分析：选完图自动启动 OCR → AI 理解，无需额外点按钮
  const handleFile = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('图片不能超过 20MB')
      return
    }

    setError('')
    setStatus('analyzing')
    setProgress('正在读取图片...')
    setOcrPhase('vision')
    setOcrProgress(0)

    // 显示预览
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target.result)
    reader.readAsDataURL(file)

    try {
      // 使用 glm-4v-flash 视觉模型识别（统一视觉 OCR 体验）
      const { text: ocrText } = await smartRecognize(file, (phase, pct) => {
        setOcrPhase(phase)
        setOcrProgress(pct)
        setProgress(`AI 视觉识别中... ${pct}%`)
      })

      if (!ocrText || ocrText.trim().length < 5) {
        setError('未能从截图中识别到文字，请确保截图清晰或手动输入')
        setStatus('error')
        return
      }

      // 第二步：AI 理解 OCR 文字（需要 API Key）
      const apiKey = getApiKey()
      if (!apiKey) {
        // OCR 成功但没 API Key：直接用 OCR 文本填入，跳过 AI 分析
        onAnalyzed({
          name: '',
          category: '',
          content: ocrText,
          summary: '已识别文字（配置 API Key 后可获得 AI 深度分析）',
        })
        setStatus('done')
        return
      }

      setProgress('AI 正在理解内容...')
      const prompt = `以下是用户上传截图中识别到的文字。请分析这些文字，提取关键信息。

【识别到的文字】
${ocrText}

请返回 JSON 格式（只输出 JSON，不要其他文字）：
{
  "summary": "一句话概括这篇内容讲的是什么",
  "accountName": "账号名称（如有，没有则填空字符串）",
  "category": "内容领域（从以下选一个：生活方式/美妆/穿搭/家居/美食/旅行/健身/育儿/职场/科技/教育/其他，无法判断填空字符串）",
  "content": "提取最完整的一段正文内容，保留原文语气和风格"
}`

      const result = await callAI(apiKey, prompt, {
        temperature: 0.1,
        max_tokens: 1500,
      })

      let parsed
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result)
      } catch {
        parsed = { summary: '', accountName: '', category: '', content: ocrText }
      }

      // 回调填入表单
      onAnalyzed({
        name: parsed.accountName || '',
        category: parsed.category || '',
        content: parsed.content || ocrText,
        summary: parsed.summary || '',
      })
      setStatus('done')
    } catch (err) {
      const msg = err.message || ''
      if (msg === 'NO_ZHIPU_KEY') {
        setError('截图识别需要智谱 API Key，请到「设置」配置（免费），或手动输入文字')
      } else if (msg.includes('timeout') || msg.includes('超时')) {
        setError('网络超时，请检查网络后重试，或手动输入')
      } else if (msg.includes('NetworkError') || msg.includes('Failed to fetch')) {
        setError('网络连接失败，请检查网络后重试')
      } else {
        setError('图片解析失败：' + (msg || '请重试或手动输入'))
      }
      setStatus('error')
    } finally {
      setOcrPhase(null)
      setOcrProgress(0)
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setPreview('')
    setError('')
    setProgress('')
    setOcrPhase(null)
    setOcrProgress(0)
  }

  return (
    <div className="border-2 border-dashed border-brand-200 rounded-xl p-4 bg-brand-50/30">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
          <Camera size={20} className="text-brand-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 mb-1">
            截图分析（上传即识别）
          </div>
          <div className="text-xs text-gray-500 mb-3">
            {hint || '上传一张截图，AI 自动识别文字并填入表单'}
          </div>

          {/* 空闲状态：上传入口 */}
          {status === 'idle' && (
            <label className="block">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-brand-200 text-brand-700 text-xs font-medium hover:bg-brand-50 cursor-pointer transition-colors">
                  <Upload size={14} />
                  选择截图
                </span>
                <span className="text-[11px] text-gray-400 self-center">
                  支持 JPG/PNG，上传后自动分析
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </label>
          )}

          {/* 分析中 */}
          {status === 'analyzing' && (
            <div className="space-y-3">
              {preview && (
                <div className="flex items-center gap-2">
                  <img src={preview} alt="预览" className="h-16 rounded-lg border border-gray-200 object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${ocrPhase === 'init' ? 'text-amber-700' : 'text-brand-700'}`}>
                      <Loader2 size={12} className="animate-spin" />
                      {progress}
                    </div>
                    {(ocrPhase === 'init' || ocrPhase === 'ocr') && (
                      <div className="mt-1.5 w-full h-1 rounded-full overflow-hidden bg-white">
                        <div
                          className={`h-full transition-all duration-200 ${ocrPhase === 'init' ? 'bg-amber-500' : 'bg-brand-500'}`}
                          style={{ width: `${Math.max(ocrProgress, 3)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 分析完成 */}
          {status === 'done' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src={preview} alt="预览" className="h-16 rounded-lg border border-gray-200 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                    <Check size={12} />
                    识别完成，已自动填入
                  </div>
                  <button
                    onClick={handleReset}
                    className="text-[11px] text-gray-400 hover:text-brand-600 mt-0.5"
                  >
                    再上传一张
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 出错 */}
          {status === 'error' && (
            <div className="space-y-2">
              {preview && (
                <img src={preview} alt="预览" className="h-16 rounded-lg border border-gray-200 object-cover" />
              )}
              <div className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} />
                {error}
              </div>
              <button
                onClick={handleReset}
                className="text-[11px] text-brand-600 hover:text-brand-700"
              >
                重新上传
              </button>
            </div>
          )}

          {/* 空闲状态的错误提示 */}
          {status === 'idle' && error && (
            <div className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle size={12} />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// 按内容领域匹配的样本模板（用户在 Step 2 选择的 category）
const CATEGORY_TEMPLATES = {
  家居: [
    { id: 'tpl-home-1', text: '租了3年房子终于下定决心改造了！花3000块把10㎡的出租屋从"能住"变成"想一直住下去"。改造前后对比放在最后一张图，看完你们觉得值吗？' },
    { id: 'tpl-home-2', text: '小户型收纳｜我那8㎡的小卧室居然能塞下这么多东西！分享5个我用了1年都没换掉的收纳神器，尤其是第3个，10块钱搞定衣柜混乱。' },
    { id: 'tpl-home-3', text: '我家最不后悔的5个改造决定，最后一条真的改变了我的生活！①入户做鞋柜 ②厨房装拉篮 ③卧室装氛围灯 ④沙发选可拆洗 ⑤窗帘装双层。新房装修的姐妹抄作业吧。' },
  ],
  美妆: [
    { id: 'tpl-beauty-1', text: '烂脸3年终于养回健康皮！花了5w踩坑总结的3件护肤真相：①不是越贵越好 ②敷面膜不能天天敷 ③皮肤不好先看生活习惯。姐妹们护肤别走弯路了。' },
    { id: 'tpl-beauty-2', text: '黄黑皮日常妆｜这个伪素颜妆容我可以画100遍！手法超简单，新手也能学会，5分钟出门，直男看不出你化了妆那种。附产品清单和手法。' },
    { id: 'tpl-beauty-3', text: '平价口红合集｜这几支不到50块但我用到空管！每一支的颜色和适合肤色都标在图上了，学生党闭眼入，上班通勤上学一支搞定。' },
  ],
  健身: [
    { id: 'tpl-fitness-1', text: '从120斤到98斤我用了3个月，没有节食也没有疯狂运动。这3个方法真的有用：①三餐8分饱 ②每天走8000步 ③一周2次力量训练。分享给所有想瘦又怕吃苦的姐妹。' },
    { id: 'tpl-fitness-2', text: '新手去健身房不要乱练了！按这个顺序来，效率翻倍：①热身5分钟 ②器械30分钟 ③有氧20分钟 ④拉伸10分钟。收藏下次去健身房照做。' },
    { id: 'tpl-fitness-3', text: '在家练出马甲线我只做了这3个动作，每天10分钟坚持30天就看到变化！不用器械不用跑，躺着就能练。视频里有动作分解，跟练版在主页。' },
  ],
  美食: [
    { id: 'tpl-food-1', text: '月薪5k打工人带饭日记｜这顿成本不到10块，同事都问我要食谱！有肉有菜还有蛋，营养均衡又好吃，减脂期也能吃。评论区说说你们一顿外卖花多少？' },
    { id: 'tpl-food-2', text: '不会做饭的新手也能学会的3道硬菜，朋友来我家必点名！步骤都写在图里了，年夜饭聚餐露一手绝对有面。学会了记得来交作业！' },
    { id: 'tpl-food-3', text: '早餐店老板不会告诉你的秘密：自己在家做早餐5分钟搞定，比外面便宜还健康！分享我这学期每天吃的5个懒人早餐食谱，学生党上班族快收藏。' },
  ],
}

// 根据领域 + 账号类型获取模板（领域优先匹配，其次账号类型，最后默认通用）
function getSamplesTemplate(category, accountType) {
  if (category && CATEGORY_TEMPLATES[category]) {
    return CATEGORY_TEMPLATES[category]
  }
  if (accountType && SAMPLE_TEMPLATES[accountType]) {
    return SAMPLE_TEMPLATES[accountType]
  }
  return DEFAULT_TEMPLATE
}

/* ============ 进度条 ============ */
function ProgressBar({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-1.5 rounded-full transition-colors ${
            i <= current ? 'bg-brand-600' : 'bg-gray-200'
          }`}
        />
      ))}
      <span className="text-xs text-gray-400 ml-2 shrink-0">
        {current + 1}/{total}
      </span>
    </div>
  )
}

/* ============ Step 1: 账号类型 ============ */
function StepAccountType({ data, update }) {
  const navigate = useNavigate()
  const location = useLocation()
  const hasApiKey = !!getApiKey()

  const goSettings = () => {
    navigate('/settings', {
      state: {
        from: '/onboarding',
        fromState: location.state,
        returnLabel: '返回继续设置账号',
      },
    })
  }

  return (
    <div>
      {/* API Key 提示前置：不阻塞流程，醒目告知 */}
      {!hasApiKey && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/60 border border-amber-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <KeyIcon size={16} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-900 mb-1">
                生成内容需要 DeepSeek API Key
              </div>
              <div className="text-xs text-amber-700 leading-relaxed mb-2.5">
                配置后才能使用 AI 风格分析和内容生成。
                <br />
                新用户有免费额度，30 秒即可完成配置。
              </div>
              <button
                onClick={goSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
              >
                <SettingsIcon size={12} />
                去配置 API Key
              </button>
              <span className="ml-3 text-[11px] text-amber-600/80">
                也可以先跳过，之后再配置
              </span>
            </div>
          </div>
        </div>
      )}

      {hasApiKey && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-2">
          <Check size={16} className="text-emerald-600 shrink-0" />
          <span className="text-xs text-emerald-700">
            API Key 已配置完成，可以直接开始 AI 分析
          </span>
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-900 mb-1">你在运营什么账号？</h2>
      <p className="text-xs text-brand-600 mb-4">为什么需要：不同平台的爆款逻辑不同，AI 需要知道你在哪作战</p>

      <div className="grid grid-cols-2 gap-3">
        {ACCOUNT_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => update({ accountType: type.id, accountTypeName: type.name })}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              data.accountType === type.id
                ? 'border-brand-500 bg-brand-50/50'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}
          >
            <div className="text-2xl mb-2">{type.emoji}</div>
            <div className="font-semibold text-gray-900 text-sm">{type.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{type.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============ Step 2: 账号方向 ============ */
function StepDirection({ data, update }) {
  const handleScreenshotAnalyzed = (result) => {
    const updates = {}
    if (result.name) updates.name = result.name
    if (result.category) updates.category = result.category
    if (Object.keys(updates).length > 0) update(updates)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">你的账号方向是什么？</h2>
      <p className="text-xs text-brand-600 mb-4">为什么需要：AI 需要理解你的定位，才能生成符合你方向的内容</p>

      {/* 截图分析入口 */}
      <div className="mb-5">
        <ScreenshotAnalyzer
          onAnalyzed={handleScreenshotAnalyzed}
          hint="截一张你的账号主页或任意内容页，AI 自动识别账号名称和领域，省去打字"
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">账号名称</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="给你的账号起个名字"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">内容领域</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => update({ category: cat })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  data.category === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            目标受众 <span className="text-[11px] text-gray-400 font-normal">（选填）</span>
          </label>
          <input
            type="text"
            value={data.targetAudience}
            onChange={(e) => update({ targetAudience: e.target.value })}
            placeholder="例如：25-35岁都市女性"
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-brand-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            运营目标 <span className="text-[11px] text-gray-400 font-normal">（选填）</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((goal) => (
              <button
                key={goal}
                onClick={() => update({ goal })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  data.goal === goal
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============ Step 3: 上传历史内容 ============ */
function StepUploadSamples({ data, update, accountType }) {
  const [input, setInput] = useState('')

  const handleAdd = () => {
    if (!input.trim() || input.trim().length < 20) return
    update({ samples: [...data.samples, { id: Date.now(), text: input.trim() }] })
    setInput('')
  }

  const handleRemove = (id) => {
    update({ samples: data.samples.filter((s) => s.id !== id) })
  }

  const handleUseTemplate = () => {
    const tpl = getSamplesTemplate(data.category, accountType).map((t) => ({
      ...t,
      id: `tpl-${Date.now()}-${t.id}`,
      isTemplate: true,
    }))
    update({ samples: [...data.samples, ...tpl] })
  }

  const handleSkipEmpty = () => {
    const tpl = getSamplesTemplate(data.category, accountType).slice(0, 1).map((t) => ({
      ...t,
      id: `tpl-${Date.now()}-${t.id}`,
      isTemplate: true,
    }))
    update({ samples: tpl, usedTemplate: true })
  }

  const handleScreenshotAnalyzed = (result) => {
    if (result.content && result.content.length >= 10) {
      update({
        samples: [
          ...data.samples,
          { id: Date.now(), text: result.content, isScreenshot: true },
        ],
      })
    }
  }

  const canAnalyze = data.samples.length >= 1
  const hasAny = data.samples.length >= 1

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">上传你的代表内容</h2>
      <p className="text-xs text-brand-600 mb-2">为什么需要：AI 从你写过的内容中学习风格，而不是凭空生成</p>
      <p className="text-[11px] text-gray-400 mb-4">建议上传 1-3 篇代表内容，3 篇以上效果最佳</p>

      {/* 截图分析入口 */}
      <div className="mb-5">
        <ScreenshotAnalyzer
          onAnalyzed={handleScreenshotAnalyzed}
          hint="截一篇你发布过的内容（笔记、视频文案页），AI 自动识别文字并添加为样本，完全不用打字"
        />
      </div>

      {data.samples.length === 0 && (
        <div className="mb-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
              <Zap size={16} className="text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 mb-1">
                暂时没有内容？没关系
              </div>
              <div className="text-xs text-gray-500 leading-relaxed">
                使用同领域模板体验完整流程，之后可以随时在账号大脑中上传真实内容
                替换模板，重新训练。
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleUseTemplate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors"
            >
              <Sparkles size={12} />
              用模板体验（自动填入 3 条样本）
            </button>
            <button
              onClick={handleSkipEmpty}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors"
            >
              先填入 1 条，之后再补
            </button>
          </div>
        </div>
      )}

      {data.samples.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.samples.map((s, i) => (
            <div key={s.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <FileText size={14} className={`shrink-0 mt-0.5 ${s.isTemplate ? 'text-brand-400' : s.isScreenshot ? 'text-emerald-400' : 'text-gray-400'}`} />
              <p className="text-xs text-gray-600 flex-1 line-clamp-2">{s.text}</p>
              {s.isTemplate && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-600 font-medium shrink-0">模板</span>
              )}
              {s.isScreenshot && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium shrink-0">截图识别</span>
              )}
              <button
                onClick={() => handleRemove(s.id)}
                className="p-0.5 text-gray-400 hover:text-red-500 shrink-0"
              >
                <X size={12} />
              </button>
              <span className="text-[10px] text-gray-400 shrink-0">样本 {i + 1}</span>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="粘贴一篇你的历史内容正文...（至少 20 字）"
        rows={5}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:border-brand-400 resize-none mb-3"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          已上传 {data.samples.length} 篇 · {canAnalyze ? '可以开始分析' : '填入后即可分析'}
        </span>
        <button
          onClick={handleAdd}
          disabled={!input.trim() || input.trim().length < 20}
          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 disabled:opacity-40"
        >
          添加样本
        </button>
      </div>
    </div>
  )
}

/* ============ Step 4: AI 生成 DNA 报告 ============ */
function StepDNAReport({ data, update, onComplete }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle') // idle | analyzing | done | error
  const [error, setError] = useState('')

  const handleAnalyze = async () => {
    setStatus('analyzing')
    setError('')
    try {
      const apiKey = getApiKey()
      if (!apiKey) {
        setError('请先连接 AI 服务，再开始分析')
        setStatus('error')
        return
      }

      const samplesText = data.samples.map((s, i) => `【样本${i + 1}】\n${s.text}`).join('\n\n')

      const prompt = `你是一名内容风格分析专家。分析以下用户的历史内容样本，提取TA的内容DNA。

【账号类型】${data.accountTypeName}
【内容领域】${data.category}
【目标受众】${data.targetAudience}

【历史内容样本】
${samplesText}

输出严格JSON格式（不要markdown包裹），简洁输出，每个字段不超过30字：
{
  "personality": "内容人格描述",
  "titleFormula": "标题套路特征",
  "structure": "结构习惯描述",
  "visualStyle": "视觉风格描述",
  "audience": "用户画像推断",
  "frequentExpressions": ["高频词1", "高频词2", "高频词3"],
  "rules": [
    {"category":"内容人格","rule":"具体规则","confidence":0.9},
    {"category":"标题套路","rule":"具体规则","confidence":0.85},
    {"category":"结构习惯","rule":"具体规则","confidence":0.85},
    {"category":"视觉风格","rule":"具体规则","confidence":0.8},
    {"category":"用户偏好","rule":"具体规则","confidence":0.75}
  ]
}`

      // 30秒超时保护：防止网络挂起导致无限 loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI 请求超时（30秒），请检查网络后重试')), 30000)
      )

      const content = await Promise.race([
        callAI(apiKey, prompt, { temperature: 0.4, max_tokens: 1000 }),
        timeoutPromise,
      ])

      // 提取 JSON
      let dna
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        dna = JSON.parse(jsonMatch ? jsonMatch[0] : content)
      } catch (e) {
        throw new Error('AI 返回格式错误，请重试')
      }

      update({ dna })
      setStatus('done')
    } catch (err) {
      const classified = classifyAIError(err)
      setError(classified.message)
      setStatus('error')
    } finally {
      // 安全兜底：确保任何情况下 loading 状态都会结束
      setStatus((prev) => (prev === 'analyzing' ? 'error' : prev))
    }
  }

  const handleComplete = () => {
    // v3.1：不直接写 store，将 AI 分析结果传给主组件，由主组件在 createProject 后绑定真实 projectId
    onComplete({ dna: data.dna || null })
  }

  // ── 分析中 ──
  if (status === 'analyzing') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto mb-6">
          <Loader2 size={28} className="text-brand-600 animate-spin" />
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">AI 正在学习你的风格...</h3>
        <p className="text-sm text-gray-500">分析你的表达风格、标题套路、内容结构</p>
        <p className="text-xs text-gray-400 mt-4">预计 10-15 秒</p>
      </div>
    )
  }

  // ── 分析失败 ──
  if (status === 'error') {
    return <AIErrorBanner error={error} onRetry={handleAnalyze} />
  }

  // ── 分析成功：三模块结果页 ──
  if (status === 'done' && data.dna) {
    const dna = data.dna
    const rules = dna.rules || []
    // 示例体验模式：用户未上传真实内容，全部使用模板样本
    const isDemoMode = data.samples.length > 0 && data.samples.every(s => s.isTemplate)
    // 模块2 机会：高置信度为优势，低置信度为优化方向
    const strengths = rules.filter(r => (r.confidence || 0) >= 0.8).slice(0, 2)
    const improvements = rules.filter(r => (r.confidence || 0) < 0.8).slice(0, 2)
    // 模块3 模板：从 DNA 字段映射
    const titleFormula = dna.titleFormula || '—'
    const openingStructure = dna.structure || '—'
    const contentFramework = (dna.frequentExpressions || []).length > 0
      ? dna.frequentExpressions.join(' / ')
      : '—'

    return (
      <div>
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">AI 读懂了你的账号</h2>
          <p className="text-sm text-gray-500">确认下面这些是否准确，准确就可以开始用了</p>
        </div>

        {/* 示例体验模式提示：基于模板样本，结果仅供参考 */}
        {isDemoMode && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5">
            <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-amber-900 mb-0.5">示例体验模式</div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                以下结果基于示例样本生成，仅供参考。上传你的真实内容，可获得专属你的内容模型。
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 mb-6">
          {/* 模块1：我的内容模型 */}
          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={14} className="text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-900">我的内容模型</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <div className="text-[11px] text-gray-400 mb-0.5">账号定位</div>
                <div className="text-xs text-gray-800 leading-relaxed">
                  {data.accountTypeName || '—'} · {data.category || '—'}
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <div className="text-[11px] text-gray-400 mb-0.5">用户画像</div>
                <div className="text-xs text-gray-800 leading-relaxed">
                  {dna.audience || data.targetAudience || '—'}
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <div className="text-[11px] text-gray-400 mb-0.5">内容风格</div>
                <div className="text-xs text-gray-800 leading-relaxed">
                  {dna.personality || '—'}
                </div>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-lg">
                <div className="text-[11px] text-gray-400 mb-0.5">常用结构</div>
                <div className="text-xs text-gray-800 leading-relaxed">
                  {dna.structure || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* 模块2：我的内容机会 */}
          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <Target size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">我的内容机会</h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] text-gray-400 mb-1.5">当前优势</div>
                {strengths.length > 0 ? (
                  <ul className="space-y-1">
                    {strengths.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed">
                        <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                        {r.rule}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">AI 正在识别你的优势</p>
                )}
              </div>
              <div>
                <div className="text-[11px] text-gray-400 mb-1.5">优化方向</div>
                {improvements.length > 0 ? (
                  <ul className="space-y-1">
                    {improvements.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700 leading-relaxed">
                        <ArrowRight size={12} className="text-brand-500 shrink-0 mt-0.5" />
                        {r.rule}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400">继续保持现有节奏</p>
                )}
              </div>
            </div>
          </div>

          {/* 模块3：我的 AI 创作模板 */}
          <div className="p-4 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-1.5 mb-3">
              <BookOpen size={14} className="text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-900">我的 AI 创作模板</h3>
            </div>
            <div className="space-y-2">
              <div className="p-2.5 bg-brand-50/40 rounded-lg">
                <div className="text-[11px] text-gray-400 mb-0.5">标题公式</div>
                <div className="text-xs text-gray-800 leading-relaxed">{titleFormula}</div>
              </div>
              <div className="p-2.5 bg-brand-50/40 rounded-lg">
                <div className="text-[11px] text-gray-400 mb-0.5">开头结构</div>
                <div className="text-xs text-gray-800 leading-relaxed">{openingStructure}</div>
              </div>
              <div className="p-2.5 bg-brand-50/40 rounded-lg">
                <div className="text-[11px] text-gray-400 mb-0.5">内容框架</div>
                <div className="text-xs text-gray-800 leading-relaxed">{contentFramework}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 主按钮：使用内容模型生成下一篇 */}
        <button
          onClick={() => handleComplete({ generateNext: true })}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
        >
          使用我的内容模型生成下一篇
          <ArrowRight size={18} />
        </button>
        <button
          onClick={() => handleComplete({ generateNext: false })}
          className="w-full py-2.5 mt-2 text-gray-500 text-xs hover:text-gray-700 transition-colors"
        >
          先保存，稍后再生成
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          保存后可在「账号大脑」查看完整 6 维度报告
        </p>
      </div>
    )
  }

  // ── 待分析：提前检测 API Key，避免点完才失败 ──
  const hasApiKey = !!getApiKey()

  if (!hasApiKey) {
    return (
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">开启 AI 分析，需要连接 AI 服务</h2>
        <p className="text-xs text-brand-600 mb-4">为什么需要：AI 要调用大模型分析你的内容风格，需先连接一次</p>

        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <KeyIcon size={16} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-amber-900 mb-1">
                连接 AI 服务后即可开始分析
              </div>
              <div className="text-xs text-amber-700 leading-relaxed mb-3">
                新用户有免费额度，30 秒即可完成配置。配置后内容只保存在你的浏览器本地。
              </div>
              <button
                onClick={() => navigate('/settings', { state: { from: '/onboarding', returnLabel: '返回继续分析' } })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors"
              >
                <SettingsIcon size={12} />
                去连接 AI 服务
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/settings', { state: { from: '/onboarding', returnLabel: '返回继续分析' } })}
          className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
        >
          <KeyIcon size={18} />
          连接 AI 服务
        </button>
        <p className="text-xs text-gray-400 text-center mt-3">配置完成后会自动返回这里继续</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">AI 分析你的内容风格</h2>
      <p className="text-xs text-brand-600 mb-4">为什么需要：AI 从你的样本中提取风格，生成的每条内容都是你的语气</p>

      <div className="bg-brand-50/50 rounded-xl p-4 mb-6">
        <p className="text-sm text-gray-600 leading-relaxed">
          AI 会从 {data.samples.length} 篇样本中提取你的内容风格，生成你的专属模型
        </p>
      </div>

      <button
        onClick={handleAnalyze}
        className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
      >
        <Wand2 size={18} />
        AI 分析我的风格
      </button>
      <p className="text-xs text-gray-400 text-center mt-3">分析约需 10-15 秒</p>
    </div>
  )
}

/* ============ 主页面 ============ */
export default function Onboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const createProject = useStore((s) => s.createProject)
  const saveStyleDNA = useStore((s) => s.saveStyleDNA)
  const addStyleRules = useStore((s) => s.addStyleRules)
  const ensureAccountMemory = useStore((s) => s.ensureAccountMemory)
  const onboardingCompleted = useStore((s) => s.onboardingCompleted)
  const projects = useStore((s) => s.projects)

  const [step, setStep] = useState(0)
  useEffect(() => {
    trackOnboardingStepEnter(step)
  }, [step])

  // 已完成 onboarding 且有项目时，直接跳转 Dashboard（防止重复进入）
  useEffect(() => {
    if (onboardingCompleted && projects.length > 0) {
      navigate('/dashboard', { replace: true })
    }
  }, [onboardingCompleted, projects.length, navigate])

  const [data, setData] = useState(() => {
    // 接收 Landing 传入的平台预选：自动选中并跳过第一步
    const presetPlatform = location.state?.platform
    if (presetPlatform) {
      const matched = ACCOUNT_TYPES.find((t) => t.id === presetPlatform)
      if (matched) {
        return {
          accountType: matched.id,
          accountTypeName: matched.name,
          name: '',
          category: '',
          targetAudience: '',
          goal: '涨粉',
          samples: [],
          dna: null,
          platformPreset: true,
        }
      }
    }
    return {
      accountType: '',
      accountTypeName: '',
      name: '',
      category: '',
      targetAudience: '',
      goal: '涨粉',
      samples: [],
      dna: null,
    }
  })

  // 若来自首页平台预选，首次进入直接跳到 Step 1（账号方向）
  useEffect(() => {
    if (data.platformPreset && step === 0) {
      setStep(1)
      trackEvent('onboarding_platform_preset', { platform: data.accountType })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (updates) => setData({ ...data, ...updates })

  const canProceed = () => {
    if (step === 0) return !!data.accountType
    if (step === 1) return !!data.name && !!data.category
    // Step 2：允许 samples 为空（用户可以直接用模板继续）
    // 但建议至少 1 篇，所以按钮显示提示文字但不阻塞
    if (step === 2) return true
    return true
  }

  const handleComplete = (receivedData) => {
    // v3.1：先创建项目，获取真实 projectId
    const projectId = createProject({
      name: data.name,
      platform: data.accountTypeName,
      category: data.category,
      targetAudience: data.targetAudience,
      goal: data.goal,
    })
    // 初始化账号大脑记忆
    ensureAccountMemory(projectId)
    // 用真实 projectId 保存 StyleDNA 四维度
    const dnaData = receivedData?.dna || data.dna
    if (dnaData) {
      const dna = {
        contentPersona: dnaData.personality || '',
        writingStructure: dnaData.structure || '',
        visualStyle: dnaData.visualStyle || '',
        frequentExpressions: dnaData.frequentExpressions || [],
        audience: dnaData.audience || '',
        titleFormula: dnaData.titleFormula || '',
        source: 'ai_analyze',
      }
      saveStyleDNA(projectId, dna)
    }
    // 用真实 projectId 保存规则
    if (dnaData?.rules?.length > 0) {
      addStyleRules(projectId, dnaData.rules.map(r => ({
        category: r.category,
        rule: r.rule,
        source: 'AI分析样本',
        confidence: r.confidence || 0.8,
        confirmed: true,
      })))
    }
    // 标记 onboarding 完成
    completeOnboarding({ name: data.name })
    trackEvent('onboarding_complete')
    
    // 自动带着预置爆款内容跳转到爆款拆解，让用户一键体验
    const templates = getSamplesTemplate(data.category, data.accountType)
    const firstTemplate = templates[0]
    if (firstTemplate) {
      trackEvent('onboarding_quick_experience')
      navigate('/workbench/competitor-analyzer', {
        state: {
          presetTitle: `【体验】${data.category}领域爆款拆解`,
          presetContent: firstTemplate.text,
          isQuickExperience: true,
        }
      })
    } else {
      navigate('/dashboard')
    }
  }

  // 跳过 Onboarding：自动创建体验项目并进入 Dashboard
  const handleSkip = () => {
    const projectId = createProject({
      name: '我的第一个账号',
      platform: '小红书',
      category: '内容创作',
      positioning: '待完善',
      goal: '涨粉 + 互动',
    })
    ensureAccountMemory(projectId)
    completeOnboarding({ name: '我的第一个账号' })
    trackEvent('onboarding_skip')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-6 py-12">
        {/* 顶部 Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 text-brand-600 font-semibold">
            <Sparkles size={16} />
            果核
          </div>
        </div>

        {/* 进度条 */}
        <ProgressBar current={step} total={4} />

        {/* 步骤内容 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          {step === 0 && <StepAccountType data={data} update={update} />}
          {step === 1 && <StepDirection data={data} update={update} />}
          {step === 2 && (
            <StepUploadSamples
              data={data}
              update={update}
              accountType={data.accountType}
            />
          )}
          {step === 3 && (
            <StepDNAReport
              data={data}
              update={update}
              onComplete={handleComplete}
            />
          )}

          {/* 导航按钮（Step 4 由组件内部控制） */}
          {step < 3 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
              <button
                onClick={() => step > 0 && setStep(step - 1)}
                disabled={step === 0}
                className={`inline-flex items-center gap-1 text-sm ${
                  step === 0 ? 'text-gray-300' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowLeft size={16} />
                上一步
              </button>

              {/* Step 2 时根据 samples 状态显示不同文字/是否需要自动填入模板再进入 */}
              {step === 2 ? (
                <button
                  onClick={() => {
                    // 没有样本时自动填入 1 条模板再继续，保持分析流程可用
                    if (data.samples.length === 0) {
                      const tpl = getSamplesTemplate(data.category, data.accountType)
                        .slice(0, 1)
                        .map((t) => ({
                          ...t,
                          id: `tpl-${Date.now()}-${t.id}`,
                          isTemplate: true,
                        }))
                      setData((prev) => ({ ...prev, samples: tpl, usedTemplate: true }))
                    }
                    setStep(step + 1)
                  }}
                  className="inline-flex items-center gap-1 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors"
                >
                  {data.samples.length === 0 ? '用模板继续' : 'AI 分析风格'}
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="inline-flex items-center gap-1 px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-40 transition-colors"
                >
                  下一步
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 跳过链接 */}
        {step === 0 && (
          <div className="text-center mt-6">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              跳过，直接进入
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
