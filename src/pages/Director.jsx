import { useNavigate } from 'react-router-dom'
import { Clapperboard, Wand2, ArrowRight } from 'lucide-react'
import { trackModuleClick } from '../utils/tracker'

export default function Director() {
  const navigate = useNavigate()

  const directors = [
    {
      id: 'create',
      icon: Clapperboard,
      title: '创作导演',
      desc: '没有素材，从0生成爆款视频。',
      btn: '开始创作',
      path: '/workbench/video-director',
      gradient: 'from-brand-500 to-brand-700',
    },
    {
      id: 'optimize',
      icon: Wand2,
      title: '爆改导演',
      desc: '已有视频素材，AI优化成爆款结构。',
      btn: '开始优化',
      path: '/workbench/optimization-director',
      gradient: 'from-purple-500 to-purple-700',
    },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="px-6 py-4 bg-white border-b border-gray-100 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">AI 内容导演</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {directors.map((d) => {
              const Icon = d.icon
              return (
                <div
                  key={d.id}
                  className="bg-white rounded-2xl border border-gray-100 p-8 flex flex-col"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${d.gradient} flex items-center justify-center mb-5`}>
                    <Icon size={28} className="text-white" strokeWidth={1.8} />
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{d.title}</h2>
                  <p className="text-sm text-gray-500 mb-8 flex-1">{d.desc}</p>

                  <button
                    onClick={() => {
                      trackModuleClick(d.path)
                      navigate(d.path)
                    }}
                    className={`w-full py-3 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 bg-gradient-to-r ${d.gradient} hover:opacity-90 transition-opacity`}
                  >
                    {d.btn}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
