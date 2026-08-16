import{a as v,j as e,b as _,c as q}from"./index-DgdXw88Y.js";import{b as K,r as f}from"./react-vendor-DSYpD63Q.js";import{l as O,g as J,aa as H,L as U,k as L,T as M,N as Z,Z as W,A as G,R as Q}from"./lucide-NCvXOZx7.js";import"./zustand-DOacgZDb.js";function V(c){if(!c)return c;let t=c.trim();t.startsWith("```")&&(t=t.replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,""));const o=t.indexOf("{"),n=t.lastIndexOf("}");o>=0&&n>o&&(t=t.substring(o,n+1)),t=t.replace(/,(\s*[}\]])/g,"$1"),t=t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,"");let d=!1,r="",g="";for(let u=0;u<t.length;u++){const i=t[u],x=t[u-1];if(!d&&(i==='"'||i==="'")){d=!0,r=i,g+='"';continue}if(d&&i===r&&x!=="\\"){d=!1,g+='"';continue}if(d&&i===`
`&&x!=="\\"){g+="\\n";continue}d&&i==="\r"&&x!=="\\"||(g+=i)}return g}function X(c){try{const t=c.match(/\{[\s\S]*\}/),o=t?t[0]:c.trim();let n;try{n=JSON.parse(o)}catch(d){const r=V(c);n=JSON.parse(r)}if(!n.opportunities||!Array.isArray(n.opportunities)||n.opportunities.length===0)throw new Error("AI 返回数据不完整：缺少 opportunities");return n}catch(t){throw new Error("AI 返回格式错误："+(t.message||"解析失败"))}}function Y(c,t,o,n,d,r){var z,S,$,P,k,y,h,A,E,I,F,R;const g=c?`账号名称：${c.name}
平台：${c.platform||"小红书"}
领域：${c.category||"未指定"}
目标用户：${c.targetAudience||"未指定"}`:"账号信息未配置",u=t?`内容风格：${t.toneDescription||t.contentPersona||"未分析"}
常用表达：${(t.signaturePhrases||t.frequentExpressions||[]).join("、")||"无"}
内容人格：${t.contentPersona||"未分析"}
用户画像：${t.audience||"未指定"}`:"风格未分析",i=(o==null?void 0:o.length)>0?o.slice(-5).map(a=>`- ${a.title||a.topic||"无标题"}`).join(`
`):"暂无历史选题",x=(n==null?void 0:n.length)>0?n.slice(-5).map(a=>`- ${a.title||a.topic||"无标题"}`).join(`
`):"暂无历史内容";let w="";if(d&&d.length>0){const a=[...d].sort((l,b)=>{var B,C;const N=((B=l.derivedMetrics)==null?void 0:B.engagementRate)||0;return(((C=b.derivedMetrics)==null?void 0:C.engagementRate)||0)-N}),s=a.slice(0,3),m=a.slice(-3).reverse(),p=s.map(l=>{var N;const b=l.metrics||{};return`- 「${l.title||"无标题"}」播放${b.views||0} 点赞${b.likes||0} 收藏${b.saves||0} 互动率${(((N=l.derivedMetrics)==null?void 0:N.engagementRate)||0).toFixed(1)}%`}).join(`
`),j=m.map(l=>{var N;const b=l.metrics||{};return`- 「${l.title||"无标题"}」播放${b.views||0} 互动率${(((N=l.derivedMetrics)==null?void 0:N.engagementRate)||0).toFixed(1)}%`}).join(`
`),D=d.map(l=>l.title||"").filter(Boolean);w=`
## 内容表现数据
### 高表现内容（复制方向）
${p}

### 低表现内容（避免方向）
${j}

### 已验证有效方向
${D.slice(0,5).map(l=>`- ${l}`).join(`
`)||"暂无"}`}else w=`
## 内容表现数据
这是新账号，暂无表现数据。请基于账号定位和行业规律推荐选题。`;let T="";if(r){const a=[];((S=(z=r.winningPatterns)==null?void 0:z.topics)==null?void 0:S.length)>0&&a.push(`### 已验证有效的选题方向
${r.winningPatterns.topics.map(s=>`- ${s}`).join(`
`)}`),((P=($=r.winningPatterns)==null?void 0:$.hooks)==null?void 0:P.length)>0&&a.push(`### 已验证有效的 Hook
${r.winningPatterns.hooks.map(s=>`- "${s}"`).join(`
`)}`),((y=(k=r.failedPatterns)==null?void 0:k.topics)==null?void 0:y.length)>0&&a.push(`### 已验证失败的选题（必须避免）
${r.failedPatterns.topics.map(s=>`- ${s}`).join(`
`)}`),((A=(h=r.winningPatterns)==null?void 0:h.structures)==null?void 0:A.length)>0&&a.push(`### 已验证有效的视频结构
${r.winningPatterns.structures.map(s=>`- ${s}`).join(`
`)}`),((I=(E=r.winningPatterns)==null?void 0:E.expressions)==null?void 0:I.length)>0&&a.push(`### 已验证有效的表达方式
${r.winningPatterns.expressions.map(s=>`- ${s}`).join(`
`)}`),((R=(F=r.failedPatterns)==null?void 0:F.reasons)==null?void 0:R.length)>0&&a.push(`### 已验证的失败原因
${r.failedPatterns.reasons.map(s=>`- ${s}`).join(`
`)}`),T=a.length>0?`
## 账号复盘记忆（AI 复盘沉淀的规律）
${a.join(`

`)}`:""}return`你是短视频内容策略顾问。你的任务是：根据账号定位、StyleDNA、历史内容、内容表现数据和账号复盘记忆，发现适合该账号今天创作的内容机会。

【严格禁止】
- 不要生成泛泛选题（如"健康饮食""运动健身"这类大方向，没有具体切入点）
- 不要重复用户已做过的选题
- 不要生成与账号定位无关的选题
- 每个选题必须解释：为什么现在值得做？为什么适合这个账号？

【必须结合】
- 用户痛点（具体的、可感知的痛点场景）
- 内容趋势（当前短视频平台什么样的内容正在起量）
- 账号定位（领域、平台、目标用户）
- StyleDNA（内容风格、常用表达、用户画像）
- 历史内容表现数据（高表现方向复制、低表现方向避免）
- 可传播角度（有争议性、有反差感、有共鸣点）

## 账号信息
${g}

## 风格信息
${u}
${w}
${T}

## 最近已做选题（避免重复）
${i}

## 最近已发布内容（避免重复）
${x}

## 输出要求
直接输出严格 JSON，不要任何解释、markdown 或代码块标记。生成 5 个内容机会。每个机会必须包含完整分析和评分。JSON 结构如下：

{
  "opportunities": [
    {
      "title": "选题标题（10-20字，有吸引力）",
      "opportunity": "内容机会描述（1-2句话说明这是什么机会）",
      "audience": "目标受众（具体到人群+场景，如'25-35岁职场女性，加班后深夜刷手机时'）",
      "painPoint": "用户痛点（具体场景，如'每天睡8小时还是困，以为自己生病了'）",
      "emotionalTrigger": "情绪触发点（如'焦虑+好奇'、'共鸣+释然'）",
      "whyNow": "为什么现在适合做（趋势/季节/热点/平台算法）",
      "accountFit": "这个账号为什么适合做（与定位/风格/受众的匹配点）",
      "hook": "推荐开头Hook（3秒内抓住注意力的具体话术，不能是描述）",
      "structure": "推荐视频结构（如'Hook→痛点场景→反常识揭秘→解决方案→互动'）",
      "avoidPoints": "这个选题容易踩的坑（如'避免变成纯科普'、'避免过度承诺效果'）",
      "score": {
        "overall": 0-100,
        "painPoint": 0-100,
        "accountFit": 0-100,
        "trend": 0-100,
        "difficulty": 0-100
      }
    }
  ],
  "contentDirection": "今日整体内容方向建议（1-2句话）",
  "avoidTopics": ["建议避免的选题1", "建议避免的选题2"]
}

强制：
- opportunities 必须有 5 条
- 每条必须包含所有字段，score 必须有全部 5 个子字段
- hook 必须是具体可用的开头话术，不能是"用反常识开头"这种描述
- score.difficulty 越高表示越难执行（100=最难）
- 避免与"最近已做选题"和"最近已发布内容"重复
- 如果有表现数据，优先推荐与高表现内容同方向但有差异化的选题
- 如果有复盘记忆，必须避免「已验证失败的选题」，优先推荐与「已验证有效的选题方向」同类的机会
`}function ie(){var a;const c=K(),t=v(s=>s.currentProjectId),o=v(s=>s.projects),n=v(s=>s.styleDNA),d=v(s=>s.topics),r=v(s=>s.contents),g=v(s=>s.performanceRecords),u=v(s=>s.getAccountMemory),i=f.useMemo(()=>o.find(s=>s.id===t),[o,t]),x=f.useMemo(()=>n.find(s=>s.projectId===t&&s.status==="active"),[n,t]),w=f.useMemo(()=>d.filter(s=>s.projectId===t),[d,t]),T=f.useMemo(()=>r.filter(s=>s.projectId===t),[r,t]),z=f.useMemo(()=>g.filter(s=>s.projectId===t),[g,t]),S=f.useMemo(()=>t?u(t):null,[t,u]),[$,P]=f.useState(!1),[k,y]=f.useState(""),[h,A]=f.useState(null),E=()=>{const s=localStorage.getItem("contentos_api_key");return s||(y("请先在设置页面配置 DeepSeek API Key"),null)},I=async()=>{const s=E();if(s){P(!0),y(""),A(null);try{const m=Y(i,x,w,T,z,S),p=await _(s,m,{temperature:.8,max_tokens:2e3}),j=X(p);A(j)}catch(m){const p=q(m);y(p.message||"分析失败，请重试")}finally{P(!1)}}},F=s=>{c("/workbench/video-director",{state:{source:"topic-director",topicBrief:{title:s.title||"",audience:s.audience||"",painPoint:s.painPoint||"",emotionalTrigger:s.emotionalTrigger||"",hook:s.hook||"",structure:s.structure||"",accountFit:s.accountFit||"",avoidPoints:s.avoidPoints||"",score:s.score||{}}}})},R=s=>s>=80?"text-emerald-600":s>=60?"text-amber-600":"text-red-500";return e.jsxs("div",{className:"flex flex-col h-full",children:[e.jsx("header",{className:"px-6 py-4 bg-white border-b border-gray-100 shrink-0",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 text-white flex items-center justify-center",children:e.jsx(O,{size:20})}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-xl font-semibold text-gray-900",children:"爆款选题助手"}),e.jsx("p",{className:"text-sm text-gray-500 mt-0.5",children:"找到今天值得做的内容"})]})]}),i&&e.jsxs("div",{className:"text-right",children:[e.jsx("div",{className:"text-xs text-gray-400",children:"当前账号"}),e.jsxs("div",{className:"text-sm font-medium text-gray-700",children:[i.name," · ",i.platform]})]})]})}),e.jsx("div",{className:"flex-1 overflow-y-auto p-6",children:e.jsxs("div",{className:"max-w-4xl mx-auto",children:[e.jsxs("div",{className:"bg-gradient-to-br from-gray-900 via-purple-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden mb-6",children:[e.jsx("div",{className:"absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"}),e.jsxs("div",{className:"relative z-10",children:[e.jsxs("div",{className:"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] mb-3",children:[e.jsx(J,{size:12})," 爆款选题助手"]}),e.jsx("h2",{className:"text-2xl font-bold mb-2",children:"今天做什么内容？"}),e.jsx("p",{className:"text-sm text-gray-300 max-w-2xl leading-relaxed",children:"AI 根据你的账号定位、目标用户和内容方向，发现值得尝试的选题机会。"})]})]}),i&&e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-5 mb-6",children:[e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4",children:[e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center shrink-0",children:e.jsx(H,{size:18,className:"text-brand-600"})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("div",{className:"text-xs text-gray-400 mb-0.5",children:"账号 & 平台"}),e.jsx("div",{className:"text-sm font-medium text-gray-900",children:i.name}),e.jsx("div",{className:"text-xs text-gray-500",children:i.platform})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0",children:e.jsx(O,{size:18,className:"text-emerald-600"})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("div",{className:"text-xs text-gray-400 mb-0.5",children:"领域"}),e.jsx("div",{className:"text-sm font-medium text-gray-900",children:i.category||"未指定"})]})]}),e.jsxs("div",{className:"flex items-start gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0",children:e.jsx(H,{size:18,className:"text-amber-600"})}),e.jsxs("div",{className:"min-w-0",children:[e.jsx("div",{className:"text-xs text-gray-400 mb-0.5",children:"目标用户"}),e.jsx("div",{className:"text-sm font-medium text-gray-900",children:i.targetAudience||"未指定"})]})]})]}),x&&e.jsxs("div",{className:"mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap",children:[e.jsx("span",{className:"text-xs text-gray-400",children:"风格 DNA："}),e.jsx("span",{className:"text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600",children:x.toneDescription||x.contentPersona||"已分析"}),(x.signaturePhrases||x.frequentExpressions||[]).slice(0,3).map((s,m)=>e.jsx("span",{className:"text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600",children:s},m))]})]}),!h&&e.jsx("div",{className:"bg-white rounded-2xl border border-gray-100 p-8 text-center",children:$?e.jsxs("div",{className:"flex flex-col items-center gap-4",children:[e.jsx(U,{size:32,className:"animate-spin text-brand-600"}),e.jsx("div",{className:"text-sm text-gray-500",children:"AI 正在分析你的账号定位，发现选题机会..."})]}):e.jsxs("div",{className:"flex flex-col items-center gap-4",children:[e.jsx("div",{className:"w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center",children:e.jsx(O,{size:28,className:"text-white"})}),e.jsxs("div",{children:[e.jsx("div",{className:"text-base font-medium text-gray-900 mb-1",children:"发现今日选题机会"}),e.jsx("div",{className:"text-sm text-gray-500",children:"AI 将根据你的账号定位、风格和历史内容，生成 5 个值得尝试的选题"})]}),e.jsxs("button",{onClick:I,className:"inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-sm",children:[e.jsx(J,{size:16}),"发现今日选题机会"]})]})}),k&&e.jsxs("div",{className:"mt-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3",children:[e.jsx(L,{size:16}),k]}),h&&e.jsxs("div",{className:"space-y-4",children:[h.contentDirection&&e.jsxs("div",{className:"bg-gradient-to-r from-brand-50 to-purple-50 rounded-2xl border border-brand-100 p-5",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx(M,{size:16,className:"text-brand-600"}),e.jsx("span",{className:"text-sm font-medium text-brand-700",children:"今日内容方向"})]}),e.jsx("div",{className:"text-sm text-gray-800 leading-relaxed",children:h.contentDirection})]}),h.opportunities.map((s,m)=>{var p;return e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow",children:[e.jsxs("div",{className:"flex items-start justify-between gap-3 mb-4",children:[e.jsxs("div",{className:"flex items-start gap-3 flex-1 min-w-0",children:[e.jsx("span",{className:"w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center shrink-0",children:m+1}),e.jsxs("div",{className:"flex-1 min-w-0",children:[e.jsx("h3",{className:"text-base font-semibold text-gray-900 leading-snug",children:s.title}),s.opportunity&&e.jsx("p",{className:"text-sm text-gray-500 mt-1 leading-relaxed",children:s.opportunity}),e.jsxs("div",{className:"flex items-center gap-2 mt-1.5 flex-wrap",children:[s.emotionalTrigger&&e.jsx("span",{className:"text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-600",children:s.emotionalTrigger}),s.audience&&e.jsx("span",{className:"text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600",children:s.audience})]})]})]}),((p=s.score)==null?void 0:p.overall)!=null&&e.jsxs("div",{className:"text-center shrink-0",children:[e.jsx("div",{className:`text-2xl font-bold ${R(s.score.overall)}`,children:s.score.overall}),e.jsx("div",{className:"text-[10px] text-gray-400",children:"爆款潜力"})]})]}),s.score&&e.jsx("div",{className:"grid grid-cols-4 gap-2 mb-4",children:[{label:"痛点",value:s.score.painPoint,color:"text-red-500"},{label:"匹配",value:s.score.accountFit,color:"text-emerald-600"},{label:"趋势",value:s.score.trend,color:"text-brand-600"},{label:"难度",value:s.score.difficulty,color:s.score.difficulty>=70?"text-red-500":"text-amber-600"}].map((j,D)=>{var l;return e.jsxs("div",{className:"bg-gray-50 rounded-lg p-2 text-center",children:[e.jsx("div",{className:`text-sm font-bold ${j.color}`,children:(l=j.value)!=null?l:"-"}),e.jsx("div",{className:"text-[10px] text-gray-400",children:j.label})]},D)})}),e.jsxs("div",{className:"space-y-3 mb-4",children:[s.painPoint&&e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-xs font-medium text-red-500 shrink-0 w-16",children:"用户痛点"}),e.jsx("span",{className:"text-sm text-gray-700 flex-1",children:s.painPoint})]}),s.whyNow&&e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-xs font-medium text-brand-600 shrink-0 w-16",children:"为什么现在"}),e.jsx("span",{className:"text-sm text-gray-700 flex-1",children:s.whyNow})]}),s.accountFit&&e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-xs font-medium text-emerald-600 shrink-0 w-16",children:"推荐理由"}),e.jsx("span",{className:"text-sm text-gray-700 flex-1",children:s.accountFit})]}),s.structure&&e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-xs font-medium text-purple-600 shrink-0 w-16",children:"视频结构"}),e.jsx("span",{className:"text-sm text-gray-700 flex-1",children:s.structure})]}),s.avoidPoints&&e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-xs font-medium text-amber-600 shrink-0 w-16",children:"避免踩坑"}),e.jsx("span",{className:"text-sm text-gray-600 flex-1",children:s.avoidPoints})]})]}),s.hook&&e.jsxs("div",{className:"rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-3 mb-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(Z,{size:14,className:"text-amber-600"}),e.jsx("span",{className:"text-xs font-medium text-amber-700",children:"推荐开头 Hook"})]}),e.jsxs("div",{className:"text-sm font-medium text-gray-900 leading-snug",children:['"',s.hook,'"']})]}),e.jsx("div",{className:"flex items-center gap-2 pt-3 border-t border-gray-50",children:e.jsxs("button",{onClick:()=>F(s),className:"inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity",children:[e.jsx(W,{size:14}),"生成视频方案",e.jsx(G,{size:14})]})})]},m)}),((a=h.avoidTopics)==null?void 0:a.length)>0&&e.jsxs("div",{className:"bg-gray-50 rounded-2xl border border-gray-100 p-5",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-3",children:[e.jsx(L,{size:16,className:"text-gray-400"}),e.jsx("span",{className:"text-sm font-medium text-gray-600",children:"建议避免的选题"})]}),e.jsx("div",{className:"space-y-1.5",children:h.avoidTopics.map((s,m)=>e.jsxs("div",{className:"text-sm text-gray-500 flex items-start gap-2",children:[e.jsx("span",{className:"text-gray-300 mt-0.5",children:"·"}),e.jsx("span",{children:s})]},m))})]}),e.jsx("div",{className:"flex justify-center pt-2 pb-4",children:e.jsxs("button",{onClick:I,disabled:$,className:"text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50",children:[e.jsx(Q,{size:14}),"重新发现选题"]})})]})]})})]})}export{ie as default};
