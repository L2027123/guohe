import{a as $,j as e,b as be,c as je}from"./index-lLTTX94F.js";import{b as fe,u as Ne,r as v}from"./react-vendor-DSYpD63Q.js";import{j as ve,W as R,l as Z,U as T,A as M,L as ee,m as se,ao as te,n as ye,af as ke,s as we,H as $e,ak as Ae,ap as ze}from"./lucide-BI_aoc8b.js";import"./zustand-DOacgZDb.js";function Fe(){var W,K,U,G,q,X,Q,Y;const S=fe(),b=Ne(),y=$(s=>s.currentProjectId),re=$(s=>s.projects),ae=$(s=>s.styleDNA),ie=$(s=>s.ensureAccountMemory),le=$(s=>s.updateMemoryPatterns),ne=$(s=>s.performanceRecords),A=re.find(s=>s.id===y),F=ae[y],[j,E]=v.useState("video"),[r,ce]=v.useState(null);v.useEffect(()=>{var s;((s=b.state)==null?void 0:s.source)==="video-director-script"&&(E("script"),ce({hook:b.state.hook||null,script:b.state.script||"",structure:b.state.structure||null,title:b.state.title||"",cover:b.state.cover||null,shootingPlan:b.state.shootingPlan||null,projectId:b.state.projectId||null}))},[b.state]);const[d,O]=v.useState(null),[P,V]=v.useState(!1),[n,_]=v.useState(null),[D,N]=v.useState(""),oe=()=>{const s=localStorage.getItem("contentos_api_key");return s||(N("请先在设置页面配置 DeepSeek API Key"),null)},H=s=>s<1024?`${s}B`:s<1024*1024?`${(s/1024).toFixed(1)}KB`:`${(s/1024/1024).toFixed(1)}MB`,de=s=>{var a;const t=(a=s.target.files)==null?void 0:a[0];if(!t)return;if(!t.name.match(/\.(mp4|mov)$/i)){N("只支持 mp4 / mov 格式");return}N("");const x=URL.createObjectURL(t),i=document.createElement("video");i.preload="metadata",i.src=x;const o=(c={})=>{O({videoUrl:x,fileName:t.name,fileSize:t.size||0,fileType:t.type||"video/unknown",duration:0,hasVideo:!1,hasAudio:!1,width:0,height:0,...c})};i.onloadedmetadata=()=>{var l;const c=i.videoWidth?{hasVideo:!0,width:i.videoWidth,height:i.videoHeight}:{};o({duration:Math.round(i.duration||0),hasAudio:(((l=i.audioTracks)==null?void 0:l.length)||0)>0||i.mozHasAudio||!!i.webkitAudioDecodedByteCount,...c})},i.onerror=()=>o()},xe=()=>{var i,o,a,c,l,m;const s=A?`账号名称：${A.name}
平台：${A.platform||"小红书"}
领域：${A.category||"未指定"}
目标受众：${A.targetAudience||"未指定"}`:"账号信息未配置",t=F?`内容风格：${F.toneDescription||"未分析"}
常用表达：${((i=F.signaturePhrases)==null?void 0:i.join("、"))||"无"}`:"风格未分析";if(j==="script"&&r){const h=(o=r.hook)!=null&&o.text?`${r.hook.text}（类型：${r.hook.type||"未指定"}，原理：${r.hook.whyItWorks||"无"}）`:"未提供",f=(()=>{var w;const u=(w=r.structure)==null?void 0:w.contentFlow;return!u||u.length===0?"未提供结构":u.map(z=>`[${z.order}] ${z.segment} | 用户问题：${z.viewerQuestion||"-"} | 情绪：${z.emotion||"-"} | 脚本：${(z.script||"").slice(0,100)}`).join(`
`)})(),k=((a=r.structure)==null?void 0:a.emotionCurve)||"未提供";(l=(c=r.structure)==null?void 0:c.hook)!=null&&l.hookAnalysis;const C=r.shootingPlan?[`时长：${r.shootingPlan.duration||"-"}`,r.shootingPlan.basicSetup?`拍摄：${JSON.stringify(r.shootingPlan.basicSetup).slice(0,80)}`:null,(m=r.shootingPlan.shootingNotes)!=null&&m.length?`注意：${r.shootingPlan.shootingNotes.slice(0,3).join("；")}`:null].filter(Boolean).join(`
`):"",g=(r.script||"").slice(0,1500),p=r.title||"未提供",ue=r.cover?`${r.cover.style||""} | 文字：${r.cover.textSuggestion||""} | 情绪：${r.cover.emotion||""}`:"未提供",I=ne.find(u=>u.projectId===y&&u.title===r.title);let B="";if(I&&I.metrics){const u=I.metrics,w=I.derivedMetrics||{};B=`
### 6. 真实发布数据
- 播放量：${u.views||0}
- 点赞：${u.likes||0}
- 收藏：${u.saves||0}
- 评论：${u.comments||0}
- 分享：${u.shares||0}
- 点赞率：${(w.likeRate||0).toFixed(1)}%
- 收藏率：${(w.saveRate||0).toFixed(1)}%
- 互动率：${(w.engagementRate||0).toFixed(1)}%`}else B=`
### 6. 真实发布数据
该内容暂无真实发布数据，请基于内容结构分析。`;return`你是【AI 内容复盘优化助手】。你的工作是基于用户已经写好的【脚本】和【创作方案文本】以及真实发布数据，帮他复盘并给出下一版优化方向。

【严格禁止】不要用任何形式声称：
- 你看到了视频画面、镜头、截图、场景
- 你听到了声音、音频、BGM、说话语速、语气
- 你分析了剪辑节奏、转场、镜头运动、字幕时间点
- 任何"第X秒镜头/画面/声音"之类的描述

你只能基于下面提供的纯文本数据（脚本、结构、标题、拍摄说明、账号定位、风格 DNA）做文字层面的优化分析。

## 账号信息
${s}

## 风格信息
${t}

## 输入模式：方案复盘（基于脚本与创作方案文本，非视频文件）

### 1. 3秒 Hook
${h}

### 2. 内容结构（段落设计）
${f}
情绪曲线：${k}

### 3. 完整脚本（前 1500 字）
${g}

### 4. 原始标题 & 封面
- 标题：${p}
- 封面建议：${ue}

### 5. 拍摄方案摘要
${C||"未提供"}
${B}

## 输出要求
直接输出严格 JSON，不要任何解释、markdown 或代码块标记。JSON 结构如下（所有字段必须存在，数组不能为空）：

{
  "score": {
    "hook": 0-100,
    "retention": 0-100,
    "conversion": 0-100,
    "total": 0-100
  },
  "assessmentBasis": "说明本次评估基于【脚本文本 + 创作方案结构 + 账号定位匹配度 + 真实发布数据】进行，不涉及视频画面/音频分析",
  "problems": ["问题1（文字层面，如'Hook 缺少明确反常识冲突'）", "问题2"],
  "strengths": ["优点1", "优点2"],
  "structureChange": {
    "original": "根据传入的 contentFlow 总结的当前结构（简短）",
    "optimized": "优化后的结构建议"
  },
  "editingAdvice": ["脚本层面的改写建议1", "脚本层面的改写建议2"],
  "packaging": {
    "title": "优化后的标题",
    "cover": "封面画面建议",
    "subtitle": "封面文字建议"
  },
  "nextVersionPlan": ["下一版优化方向第 1 条（具体可执行）", "下一版优化方向第 2 条", "下一版优化方向第 3 条"]
}

强制：
- problems/strengths/editingAdvice/nextVersionPlan 至少各 2 条
- assessmentBasis 必须明确写出"不涉及视频画面/音频分析"
- 严禁出现视频画面、镜头、声音、剪辑等违规用语
- 如果有真实发布数据：复盘时必须结合数据判断，哪些设计导致了当前数据表现，哪些问题影响了关键指标，下一版应优先优化影响数据最大的环节
- 如果没有真实发布数据：基于内容结构和账号定位做通用分析
`}return`你是【AI 内容复盘优化助手】。你的工作是基于下面的【视频元信息】进行通用优化建议。

【严格禁止】不要用任何形式声称：
- 你看到了视频画面、镜头、截图、场景
- 你听到了声音、音频、BGM、说话语速、语气
- 你分析了剪辑节奏、转场、镜头运动、字幕时间点
- 任何"第X秒镜头/画面/声音"之类的描述

当前系统只能读取文件格式、时长、分辨率、是否有音视频轨等元数据，不能读取视频内容内容。请基于账号定位 + 风格 DNA + 元信息匹配度，给出通用建议。

## 视频元信息
${[`文件名：${d.fileName}`,`文件大小：${H(d.fileSize)}`,`格式：${d.fileType}`,`时长：${d.duration}秒`,`视频轨：${d.hasVideo?"有":"未检测到"}（${d.width}x${d.height}）`,`音频轨：${d.hasAudio?"有":"未检测到"}`].join(`
`)}

## 账号信息
${s}

## 风格信息
${t}

## 平台
小红书短视频

## 输出要求
直接输出 JSON，不要任何解释或代码块标记。JSON 结构如下（所有字段必须存在）：

{
  "score": {
    "hook": 0-100,
    "retention": 0-100,
    "conversion": 0-100,
    "total": 0-100
  },
  "assessmentBasis": "根据元信息与账号定位匹配度评估（当前版本不读取视频画面/音频内容，仅基于元数据）",
  "problems": ["问题1", "问题2"],
  "strengths": ["优点1", "优点2"],
  "structureChange": {
    "original": "根据文件名/时长推断的原始结构（如果无法判断就写'元信息不足，建议基于账号爆款经验重构'）",
    "optimized": "优化后的结构建议"
  },
  "editingAdvice": ["通用优化建议1", "通用优化建议2"],
  "packaging": {
    "title": "优化后的标题",
    "cover": "封面画面建议",
    "subtitle": "封面文字建议"
  },
  "nextVersionPlan": ["下一版方向1", "下一版方向2", "下一版方向3"]
}

强制：
- assessmentBasis 必须明确写出"不读取视频画面/音频内容，仅基于元数据"
- 严禁出现视频画面、镜头、声音、剪辑等违规用语
`};function me(s){if(!s)return s;let t=s.trim();t.startsWith("```")&&(t=t.replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,""));const x=t.indexOf("{"),i=t.lastIndexOf("}");x>=0&&i>x&&(t=t.substring(x,i+1)),t=t.replace(/,(\s*[}\]])/g,"$1"),t=t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,"");let o=!1,a="",c="";for(let l=0;l<t.length;l++){const m=t[l],h=t[l-1];if(!o&&(m==='"'||m==="'")){o=!0,a=m,c+='"';continue}if(o&&m===a&&h!=="\\"){o=!1,c+='"';continue}if(o&&m===`
`&&h!=="\\"){c+="\\n";continue}o&&m==="\r"&&h!=="\\"||(c+=m)}return c}const he=s=>{try{const t=s.match(/\{[\s\S]*\}/),x=t?t[0]:s.trim();let i;try{i=JSON.parse(x)}catch(o){const a=me(s);i=JSON.parse(a)}if(!i.score||!i.problems||!i.packaging)throw new Error("AI 返回数据不完整");return(!Array.isArray(i.nextVersionPlan)||i.nextVersionPlan.length===0)&&(i.nextVersionPlan=["结合复盘问题重新调整 Hook 冲突点","根据优化结构改写脚本段落顺序"]),i}catch(t){throw new Error("AI 返回格式错误："+(t.message||"解析失败"))}},ge=[/我看到了/,/画面显示/,/你的第.{0,3}秒/,/你的镜头/,/字幕内容/,/语速/,/BGM/,/声音/,/音频/,/画面中/,/镜头中/,/听到了/,/听到的/,/视频节奏/,/剪辑点/,/转场/,/背景音乐/,/镜头运动/,/看到画面/,/看到你的/,/画面里/,/视频画面/],L="该项无法基于当前版本判断，建议结合人工检查优化。",pe=s=>{const t="__CONTENTOS_SAFE__",x=["不涉及视频画面/音频分析","不涉及视频画面/音频/剪辑分析","不读取视频画面/音频内容","不读取视频画面、字幕或语音内容","视频画面理解","不涉及视频画面"],i=c=>{if(!c||typeof c!="string")return c;let l=c;const m=[];return x.forEach((h,f)=>{const k=`${t}${f}__`;l.includes(h)&&(l=l.split(h).join(k),m.push({idx:f,phrase:h}))}),ge.forEach(h=>{h.test(l)&&(l=L)}),l!==L&&m.forEach(({idx:h,phrase:f})=>{l=l.split(`${t}${h}__`).join(f)}),l},o=c=>Array.isArray(c)?c.map(l=>typeof l=="string"?i(l):l):c,a={...s};return a.assessmentBasis&&(a.assessmentBasis=i(a.assessmentBasis)),a.problems&&(a.problems=o(a.problems)),a.strengths&&(a.strengths=o(a.strengths)),a.editingAdvice&&(a.editingAdvice=o(a.editingAdvice)),a.nextVersionPlan&&(a.nextVersionPlan=o(a.nextVersionPlan)),a.structureChange&&(a.structureChange={...a.structureChange,original:i(a.structureChange.original),optimized:i(a.structureChange.optimized)}),a.packaging&&(a.packaging={...a.packaging,title:i(a.packaging.title),cover:i(a.packaging.cover),subtitle:i(a.packaging.subtitle)}),a},J=async()=>{if(j==="script"){if(!r){N("没有接收到方案数据，请从创作导演重新点击「让 AI 复盘这个方案」");return}}else if(!d){N("请先上传视频");return}const s=oe();if(s){V(!0),N(""),_(null);try{const t=xe(),x=await be(s,t,{temperature:.7,max_tokens:2e3}),i=he(x),o=pe(i);if(_(o),y){ie(y);const a=g=>{if(!g||typeof g!="string")return null;const p=g.toLowerCase();return/选题|方向|主题|机会|痛点|受众|场景|人群|细分/.test(p)?"topics":/hook|开头|前3秒|引入|抓|注意力|第一句|开场/.test(p)?"hooks":/结构|节奏|段落|流程|中段|结尾|转折|信息密度|递进/.test(p)?"structures":/语气|口吻|表达|用词|文案|话术|情绪|措辞|风格/.test(p)?"expressions":null},c=[],l=[],m=[],h=[];(o.strengths||[]).forEach(g=>{const p=a(g);p==="topics"?c.push(g):p==="hooks"?l.push(g):p==="structures"?m.push(g):p==="expressions"&&h.push(g)});const f=[],k=[],C=[];(o.problems||[]).forEach(g=>{const p=a(g);p==="topics"?f.push(g):p==="structures"?k.push(g):C.push(g)}),le(y,{winningPatterns:{topics:c.slice(0,3),hooks:l.slice(0,3),structures:m.slice(0,3),expressions:h.slice(0,3)},failedPatterns:{topics:f.slice(0,3),hooks:[],reasons:[...C,...k].slice(0,3)}})}}catch(t){const x=je(t);N(x.message||"分析失败，请重试")}finally{V(!1)}}};return e.jsxs("div",{className:"flex flex-col h-full overflow-hidden",children:[e.jsxs("header",{className:"flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 shrink-0",children:[e.jsx("button",{onClick:()=>S("/workbench/director"),className:"p-1.5 rounded-lg hover:bg-gray-100 text-gray-500",children:e.jsx(ve,{size:18})}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(R,{size:18,className:"text-purple-600"}),e.jsx("h1",{className:"text-xl font-semibold text-gray-900",children:"AI 内容复盘优化助手"}),e.jsx("span",{className:"text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 font-medium ml-1",children:"V1 · 复盘模式"})]})]}),e.jsx("div",{className:"flex-1 overflow-y-auto p-6",children:e.jsxs("div",{className:"max-w-3xl mx-auto space-y-6",children:[e.jsxs("div",{className:"bg-gradient-to-br from-gray-900 via-purple-900 to-brand-900 rounded-2xl p-6 text-white relative overflow-hidden",children:[e.jsx("div",{className:"absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"}),e.jsxs("div",{className:"relative z-10",children:[e.jsx("h2",{className:"text-2xl font-bold mb-2",children:"复盘你的内容，找到下一版优化方向"}),e.jsx("p",{className:"text-sm text-gray-300 max-w-2xl leading-relaxed",children:"支持从创作导演导入方案复盘，或上传视频元信息复盘。不读取视频画面/音频，基于文本与元信息分析。"})]})]}),e.jsx("div",{className:"bg-white rounded-2xl border border-gray-100 p-5",children:e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-xs font-medium text-emerald-600 mb-2",children:"✅ 支持"}),e.jsxs("ul",{className:"space-y-1",children:[e.jsxs("li",{className:"text-xs text-gray-600 flex items-start gap-1.5",children:[e.jsx("span",{className:"text-emerald-400",children:"·"}),"内容结构优化（Hook / 痛点 / 情绪曲线）"]}),e.jsxs("li",{className:"text-xs text-gray-600 flex items-start gap-1.5",children:[e.jsx("span",{className:"text-emerald-400",children:"·"}),"标题封面优化"]}),e.jsxs("li",{className:"text-xs text-gray-600 flex items-start gap-1.5",children:[e.jsx("span",{className:"text-emerald-400",children:"·"}),"账号定位匹配 & 风格 DNA 检查"]}),e.jsxs("li",{className:"text-xs text-gray-600 flex items-start gap-1.5",children:[e.jsx("span",{className:"text-emerald-400",children:"·"}),"基于脚本 & 创作方案生成下一版方向"]})]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-xs font-medium text-red-500 mb-2",children:"❌ 不支持"}),e.jsxs("ul",{className:"space-y-1",children:[e.jsxs("li",{className:"text-xs text-gray-600 flex items-start gap-1.5",children:[e.jsx("span",{className:"text-red-400",children:"·"}),"视频画面理解"]}),e.jsxs("li",{className:"text-xs text-gray-600 flex items-start gap-1.5",children:[e.jsx("span",{className:"text-red-400",children:"·"}),"语音分析 / 语速检测"]}),e.jsxs("li",{className:"text-xs text-gray-600 flex items-start gap-1.5",children:[e.jsx("span",{className:"text-red-400",children:"·"}),"剪辑节奏检测 / 镜头分析"]})]})]})]})}),e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 overflow-hidden",children:[e.jsxs("div",{className:"flex border-b border-gray-100",children:[e.jsx("button",{onClick:()=>E("script"),className:`flex-1 px-4 py-3 text-sm font-medium transition-colors ${j==="script"?"text-brand-700 bg-brand-50/60 border-b-2 border-brand-500":"text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`,children:e.jsxs("span",{className:"inline-flex items-center gap-1.5",children:[e.jsx(Z,{size:14})," 方案复盘",r&&e.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-1",children:"已接收方案"})]})}),e.jsx("button",{onClick:()=>E("video"),className:`flex-1 px-4 py-3 text-sm font-medium transition-colors ${j==="video"?"text-brand-700 bg-brand-50/60 border-b-2 border-brand-500":"text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`,children:e.jsxs("span",{className:"inline-flex items-center gap-1.5",children:[e.jsx(T,{size:14})," 视频元信息"]})})]}),e.jsxs("div",{className:"p-5 space-y-4",children:[e.jsx("div",{className:`rounded-xl p-3 border ${j==="script"?"bg-blue-50 border-blue-100":"bg-amber-50 border-amber-100"}`,children:e.jsx("div",{className:`text-xs leading-relaxed ${j==="script"?"text-blue-700":"text-amber-700"}`,children:j==="script"?"ℹ️ 当前为方案复盘模式：基于脚本和创作方案文本优化，不涉及视频画面/音频/剪辑分析。":"⚠️ 当前版本不读取视频画面、字幕或语音内容，分析仅基于视频元信息和账号定位，仅供优化参考。"})}),j==="script"&&e.jsx("div",{className:"space-y-3",children:r?e.jsxs("div",{className:"space-y-3",children:[((W=r.hook)==null?void 0:W.text)&&e.jsxs("div",{className:"rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-100 p-4",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx(ee,{size:14,className:"text-brand-600"}),e.jsx("span",{className:"text-xs font-medium text-brand-700",children:"3 秒 Hook"}),r.hook.type&&e.jsx("span",{className:"text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-700",children:r.hook.type})]}),e.jsxs("div",{className:"text-base font-semibold text-gray-900 leading-snug mb-2",children:['"',r.hook.text,'"']}),r.hook.whyItWorks&&e.jsxs("div",{className:"text-xs text-gray-600 bg-white/70 rounded-lg px-3 py-2",children:["💡 ",r.hook.whyItWorks]})]}),r.title&&e.jsxs("div",{className:"rounded-lg bg-gray-50 p-3",children:[e.jsx("div",{className:"text-[11px] text-gray-400 mb-1",children:"原标题"}),e.jsx("div",{className:"text-sm font-medium text-gray-900",children:r.title})]}),r.script&&e.jsxs("div",{className:"rounded-lg bg-gray-50 p-3",children:[e.jsxs("div",{className:"text-[11px] text-gray-400 mb-1",children:["完整脚本（",r.script.length," 字）",((K=r.shootingPlan)==null?void 0:K.duration)&&e.jsxs(e.Fragment,{children:[" · 预估 ",r.shootingPlan.duration]})]}),e.jsxs("div",{className:"text-xs text-gray-600 leading-relaxed whitespace-pre-wrap line-clamp-3",children:[r.script.slice(0,180),r.script.length>180?"...":""]})]}),((G=(U=r.structure)==null?void 0:U.contentFlow)==null?void 0:G.length)>0&&e.jsxs("div",{className:"rounded-lg bg-gray-50 p-3",children:[e.jsxs("div",{className:"text-[11px] text-gray-400 mb-2",children:["结构（",r.structure.contentFlow.length," 段）"]}),e.jsxs("div",{className:"space-y-1.5",children:[r.structure.contentFlow.map((s,t)=>{var x;return e.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[e.jsx("span",{className:"w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0",children:(x=s.order)!=null?x:t+1}),e.jsx("span",{className:"font-medium text-gray-800",children:s.segment}),s.emotion&&e.jsx("span",{className:"text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600",children:s.emotion})]},t)}),r.structure.emotionCurve&&e.jsxs("div",{className:"mt-2 text-[11px] text-amber-700 bg-amber-50 rounded px-2 py-1",children:["情绪曲线：",r.structure.emotionCurve]})]})]}),r.cover&&e.jsxs("div",{className:"rounded-lg bg-gray-50 p-3",children:[e.jsx("div",{className:"text-[11px] text-gray-400 mb-1",children:"封面建议"}),e.jsxs("div",{className:"text-xs text-gray-700 space-y-0.5",children:[e.jsxs("div",{children:["风格：",r.cover.style||"-"]}),e.jsxs("div",{children:["文字：",r.cover.textSuggestion||"-"]}),e.jsxs("div",{children:["情绪：",r.cover.emotion||"-"]})]})]}),e.jsx("button",{onClick:J,disabled:P,className:"w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 shadow-sm",children:P?e.jsxs(e.Fragment,{children:[e.jsx(se,{size:16,className:"animate-spin"}),"AI 复盘方案中..."]}):e.jsxs(e.Fragment,{children:[e.jsx(R,{size:16}),"开始复盘并生成优化方向"]})})]}):e.jsxs("div",{className:"border-2 border-dashed border-gray-200 rounded-xl p-8 text-center",children:[e.jsx(Z,{size:28,className:"mx-auto text-gray-300 mb-3"}),e.jsx("div",{className:"text-sm text-gray-500 mb-1",children:"暂未接收到创作导演方案"}),e.jsx("div",{className:"text-xs text-gray-400 mb-3",children:"请先到「创作导演」生成方案，然后点击「让 AI 复盘这个方案」按钮"}),e.jsxs("button",{onClick:()=>S("/workbench/video-director"),className:"text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1",children:["前往创作导演 ",e.jsx(M,{size:12})]})]})}),j==="video"&&e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(T,{size:18,className:"text-purple-600"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"上传视频素材（元信息模式）"})]}),d?e.jsxs("div",{className:"space-y-3",children:[e.jsxs("div",{className:"rounded-xl bg-gray-50 p-4",children:[e.jsxs("div",{className:"flex items-center gap-3 mb-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0",children:e.jsx(te,{size:18,className:"text-purple-600"})}),e.jsx("div",{className:"flex-1 min-w-0",children:e.jsx("div",{className:"text-sm font-medium text-gray-900 truncate",children:d.fileName})}),e.jsx("button",{onClick:()=>O(null),className:"text-xs text-gray-400 hover:text-red-500",children:"重新上传"})]}),e.jsxs("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-2",children:[e.jsxs("div",{className:"bg-white/70 rounded-lg p-2",children:[e.jsx("div",{className:"text-[10px] text-gray-400 mb-0.5",children:"格式"}),e.jsx("div",{className:"text-xs text-gray-700",children:d.fileType||"未知"})]}),e.jsxs("div",{className:"bg-white/70 rounded-lg p-2",children:[e.jsx("div",{className:"text-[10px] text-gray-400 mb-0.5",children:"文件大小"}),e.jsx("div",{className:"text-xs text-gray-700",children:H(d.fileSize)})]}),e.jsxs("div",{className:"bg-white/70 rounded-lg p-2",children:[e.jsx("div",{className:"text-[10px] text-gray-400 mb-0.5",children:"时长"}),e.jsxs("div",{className:"text-xs text-gray-700",children:[d.duration,"秒"]})]}),e.jsxs("div",{className:"bg-white/70 rounded-lg p-2",children:[e.jsx("div",{className:"text-[10px] text-gray-400 mb-0.5",children:"分辨率"}),e.jsx("div",{className:"text-xs text-gray-700",children:d.hasVideo?`${d.width}x${d.height}`:"未检测到"})]}),e.jsxs("div",{className:"bg-white/70 rounded-lg p-2",children:[e.jsx("div",{className:"text-[10px] text-gray-400 mb-0.5",children:"视频轨"}),e.jsx("div",{className:"text-xs text-gray-700",children:d.hasVideo?"有":"无"})]}),e.jsxs("div",{className:"bg-white/70 rounded-lg p-2",children:[e.jsx("div",{className:"text-[10px] text-gray-400 mb-0.5",children:"音频轨"}),e.jsx("div",{className:"text-xs text-gray-700",children:d.hasAudio?"有":"无"})]})]})]}),e.jsx("button",{onClick:J,disabled:P,className:"w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-purple-700 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50",children:P?e.jsxs(e.Fragment,{children:[e.jsx(se,{size:16,className:"animate-spin"}),"AI 分析中..."]}):e.jsxs(e.Fragment,{children:[e.jsx(R,{size:16}),"开始 AI 分析（元信息模式）"]})})]}):e.jsxs("label",{className:"block",children:[e.jsxs("div",{className:"border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition-colors",children:[e.jsx(T,{size:30,className:"mx-auto text-gray-300 mb-3"}),e.jsx("div",{className:"text-sm text-gray-500 mb-1",children:"点击上传视频文件"}),e.jsx("div",{className:"text-xs text-gray-400",children:"支持 mp4 / mov 格式 · 仅读取元信息"})]}),e.jsx("input",{type:"file",accept:".mp4,.mov,video/mp4,video/quicktime",onChange:de,className:"hidden"})]})]}),D&&e.jsxs("div",{className:"mt-1 flex items-center gap-2 text-sm text-red-500",children:[e.jsx(ye,{size:14}),D]})]})]}),n&&e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(ke,{size:18,className:"text-purple-600"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"视频评分"})]}),e.jsx("div",{className:"grid grid-cols-4 gap-3",children:[{label:"Hook",value:n.score.hook,color:"text-brand-600"},{label:"留存",value:n.score.retention,color:"text-blue-600"},{label:"转化",value:n.score.conversion,color:"text-purple-600"},{label:"总分",value:n.score.total,color:"text-orange-600"}].map(s=>e.jsxs("div",{className:"text-center rounded-xl bg-gray-50 p-4",children:[e.jsx("div",{className:`text-3xl font-bold ${s.color}`,children:s.value}),e.jsx("div",{className:"text-xs text-gray-400 mt-1",children:s.label})]},s.label))})]}),((q=n.problems)==null?void 0:q.length)>0&&e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(we,{size:18,className:"text-red-500"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"存在问题"})]}),e.jsx("ul",{className:"space-y-2",children:n.problems.map((s,t)=>e.jsxs("li",{className:"text-sm text-gray-700 flex items-start gap-2",children:[e.jsx("span",{className:"text-red-400 mt-0.5",children:"•"}),e.jsx("span",{children:s})]},t))})]}),((X=n.strengths)==null?void 0:X.length)>0&&e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx($e,{size:18,className:"text-emerald-500"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"优化方向"})]}),e.jsx("ul",{className:"space-y-2",children:n.strengths.map((s,t)=>e.jsxs("li",{className:"text-sm text-gray-700 flex items-start gap-2",children:[e.jsx("span",{className:"text-emerald-400 mt-0.5",children:"•"}),e.jsx("span",{children:s})]},t))})]}),n.structureChange&&e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(te,{size:18,className:"text-blue-600"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"重构结构"})]}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"rounded-xl bg-gray-50 p-4",children:[e.jsx("div",{className:"text-xs font-medium text-gray-400 mb-2",children:"原结构"}),e.jsx("div",{className:"text-sm text-gray-700",children:n.structureChange.original})]}),e.jsxs("div",{className:"rounded-xl bg-blue-50 border border-blue-100 p-4",children:[e.jsx("div",{className:"text-xs font-medium text-blue-500 mb-2",children:"优化后"}),e.jsx("div",{className:"text-sm text-gray-700",children:n.structureChange.optimized})]})]})]}),((Q=n.editingAdvice)==null?void 0:Q.length)>0&&e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(ee,{size:18,className:"text-amber-500"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"剪辑建议"})]}),e.jsx("ul",{className:"space-y-2",children:n.editingAdvice.map((s,t)=>e.jsxs("li",{className:"text-sm text-gray-700 flex items-start gap-2",children:[e.jsx("span",{className:"text-amber-400 mt-0.5",children:"•"}),e.jsx("span",{children:s})]},t))})]}),n.assessmentBasis&&e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-5",children:[e.jsx("div",{className:"text-[11px] text-gray-400 mb-1",children:"评估依据"}),e.jsx("div",{className:"text-xs text-gray-600 leading-relaxed",children:n.assessmentBasis})]}),((Y=n.nextVersionPlan)==null?void 0:Y.length)>0&&e.jsxs("div",{className:"bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(M,{size:18,className:"text-orange-600"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"下一版优化方向"}),e.jsx("span",{className:"text-[11px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700",children:"N+1 版重点"})]}),e.jsx("ol",{className:"space-y-2.5",children:n.nextVersionPlan.map((s,t)=>e.jsxs("li",{className:"text-sm text-gray-800 flex items-start gap-3 bg-white/70 rounded-xl px-4 py-3 border border-amber-100",children:[e.jsx("span",{className:"w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm",children:t+1}),e.jsx("span",{className:"leading-relaxed pt-0.5",children:s})]},t))})]}),n.packaging&&e.jsxs("div",{className:"bg-white rounded-2xl border border-gray-100 p-6",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-4",children:[e.jsx(Ae,{size:18,className:"text-brand-600"}),e.jsx("h3",{className:"font-semibold text-gray-900",children:"标题 & 封面建议"})]}),n.packaging.title&&e.jsxs("div",{className:"mb-4",children:[e.jsx("div",{className:"text-xs font-medium text-gray-400 mb-1",children:"标题建议"}),e.jsx("div",{className:"rounded-xl bg-brand-50 border border-brand-100 p-4",children:e.jsx("div",{className:"text-base font-semibold text-gray-900",children:n.packaging.title})})]}),n.packaging.cover&&e.jsxs("div",{className:"mb-4",children:[e.jsx("div",{className:"text-xs font-medium text-gray-400 mb-1",children:"封面画面"}),e.jsx("div",{className:"rounded-xl bg-gray-50 p-4",children:e.jsxs("div",{className:"text-sm text-gray-700 flex items-start gap-2",children:[e.jsx(ze,{size:14,className:"text-gray-400 mt-0.5 shrink-0"}),e.jsx("span",{children:n.packaging.cover})]})})]}),n.packaging.subtitle&&e.jsxs("div",{children:[e.jsx("div",{className:"text-xs font-medium text-gray-400 mb-1",children:"封面文字"}),e.jsx("div",{className:"rounded-xl bg-gray-50 p-4",children:e.jsx("div",{className:"text-sm text-gray-700",children:n.packaging.subtitle})})]})]}),e.jsxs("div",{className:"flex flex-col items-center gap-2 pt-2 pb-4",children:[e.jsxs("button",{onClick:()=>S("/workbench/video-director"),className:"text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors",children:[e.jsx(M,{size:14}),"返回创作导演，生成下一版"]}),e.jsx("button",{onClick:()=>S("/workbench/director"),className:"text-xs text-gray-400 hover:text-gray-600",children:"返回导演选择"})]})]})]})})]})}export{Fe as default};
