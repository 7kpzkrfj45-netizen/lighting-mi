import {CATEGORIES,beijingToday,filterEvents,statistics,paginate,validateIndex,validDate} from './model.mjs';
const $ = s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const href=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?esc(u.href):'#';}catch{return '#';}};
const date=value=>value?esc(value.replaceAll('-','.')):'未披露';
const page=document.body.dataset.page;
const params=new URLSearchParams(location.search);
const nav=[['home','概览','index.html'],['events','事件库','events.html'],['companies','企业','companies.html'],['about','数据说明','about.html']];
$('#header').innerHTML=`<a class="brand" href="index.html"><span class="brand-icon">L<span>·</span></span><span>Lighting <b>MI</b><small>照明企业情报</small></span></a><nav aria-label="主导航">${nav.map(([key,label,url])=>`<a href="${url}" ${key===(page==='event'?'events':page==='company'?'companies':page)?'aria-current="page"':''}>${label}</a>`).join('')}</nav><span class="header-label"><i></i> 公开资料 · 独立研究</span>`;
const today=beijingToday();
let manifest, companies, events, coverage, redirects;
const name=id=>companies.find(c=>c.id===id)?.name||id;
const tag=e=>`<span class="tag tag-${Object.keys(CATEGORIES).indexOf(e.category)}">${esc(CATEGORIES[e.category])}</span>`;
function eventLink(e){return `event.html?id=${encodeURIComponent(e.id)}&back=${encodeURIComponent(page==='events'?location.search:'')}`;}
function card(e){return `<article class="event-card"><div class="card-meta">${tag(e)}<time>${date(e.latest_disclosure_date)}</time></div><h3><a href="${eventLink(e)}">${esc(e.title)}<span aria-hidden="true">↗</span></a></h3><p class="summary">${esc(e.summary)}</p><div class="card-bottom"><span>${e.company_ids.map(id=>`<a href="company.html?id=${encodeURIComponent(id)}">${esc(name(id))}</a>`).join(' · ')}</span><span class="stage">${esc(e.latest_stage)}</span></div></article>`;}
function empty(title='暂无符合条件的事件',text='可以调整筛选条件，或前往全部历史查看已收录资料。'){return `<div class="empty"><span class="empty-mark">◎</span><h3>${esc(title)}</h3><p>${esc(text)}</p><a class="button secondary" href="events.html?period=all">查看全部历史 →</a></div>`;}
function lead(eyebrow,title,description){return `<div class="page-lead"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${description}</p></div>`;}
async function readFile(key){
  const item=manifest.files[key];
  if(!item||item.path!==`data/${manifest.dataset_version}/${key}`||!/^[a-f0-9]{64}$/.test(item.sha256))throw new Error('数据文件清单无效，请重试。');
  const response=await fetch(new URL(item.path,location.href),{cache:'no-store'});
  if(!response.ok)throw new Error('公开数据暂时无法读取，请稍后重试。');
  const bytes=await response.arrayBuffer();
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==item.sha256)throw new Error('数据正在更新或版本不一致，请重试。');
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
function charts(rows){
  const stats=statistics(rows);
  const categories=Object.entries(stats.categories),years=Object.entries(stats.years).sort(([a],[b])=>a.localeCompare(b));
  const bars=(entries,label,clickable=false)=>{const max=Math.max(1,...entries.map(([,n])=>n));return `<div class="bars" role="img" aria-label="${label}">${entries.map(([key,n])=>`<div class="bar-row"><span>${clickable?`<a href="events.html?period=all&category=${encodeURIComponent(key)}">${esc(CATEGORIES[key])}</a>`:esc(key)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(100*n/max)}%"></div></div><b>${n}</b></div>`).join('')}</div><details class="data-table"><summary>查看图表数据</summary><table><caption>${label}</caption><thead><tr><th>分组</th><th>事件数</th></tr></thead><tbody>${entries.map(([k,n])=>`<tr><td>${esc(clickable?CATEGORIES[k]:k)}</td><td>${n}</td></tr>`).join('')}</tbody></table></details>`;};
  return `<div class="chart-grid"><section class="panel"><div class="section-heading"><h3>事件类别</h3><span>主类别唯一计数</span></div>${bars(categories,'按主类别统计已收录事件',true)}</section><section class="panel"><div class="section-heading"><h3>年度事件分布</h3><span>按确认进展披露年度</span></div>${years.length?bars(years,'按确认进展年度统计去重事件'):'<p class="muted">尚无可用样本。</p>'}<p class="chart-note">同一事件同年计一次，跨年可重复出现。已收录样本，不代表完整行业趋势。</p></section></div>`;
}
function home(){
  const recent=filterEvents(events,companies,new URLSearchParams('period=recent'),today);
  $('#content').innerHTML=`<section class="hero"><div><p class="eyebrow">LIGHTING MARKET INTELLIGENCE</p><h1>看见变化，<br>追溯每一个<span>关键进展。</span></h1><p class="hero-copy">聚焦照明企业的并购、合作、供应链与制造。<br>从一条事实出发，找到原文与完整时间线。</p><div class="hero-actions"><a class="button" href="events.html?period=all">探索企业事件 <span>↗</span></a><a class="text-link" href="about.html">了解数据与方法 →</a></div></div><div class="hero-aside"><div class="signal"><span>研究范围</span><span class="badge">公开 · 只读</span></div><strong>19<span>家企业</span></strong><div class="scope-grid"><span>12<small>中国企业</small></span><span>07<small>国际企业</small></span><span>04<small>事件类别</small></span></div><p>持续整理事实，明确保留信息缺口。<br>不按企业或年份凑新闻。</p><a href="companies.html">查看监控企业 <span>→</span></a></div></section><div class="snapshot-strip"><span><i></i> 已公开 <b>${events.length}</b> 个独立事件</span><span>数据截至 <b>${date(manifest.data_as_of)}</b></span><a href="about.html">部分覆盖 · 查看说明 ↗</a></div><section class="section"><div class="section-heading large"><div><p class="eyebrow">LATEST DISCLOSURES</p><h2>最近七天</h2></div><a class="text-link" href="events.html?period=all">全部历史 →</a></div><p class="section-description">按有效披露日期 · 北京时间 ${date(today)} 及此前六天</p>${recent.length?`<div class="cards">${recent.slice(0,6).map(card).join('')}</div>`:empty('最近七天暂无已确认事件','当前展示为已审核快照。近期空白不代表企业没有新动态，请留意数据截至日期。')}</section><section class="section"><div class="section-heading large"><div><p class="eyebrow">PUBLISHED DATA SNAPSHOT</p><h2>已收录资料概览</h2></div><span class="muted">统计范围：全部公开历史</span></div>${charts(events)}</section><section class="method-callout"><span class="eyebrow">EVIDENCE FIRST</span><h2>结论之前，先看依据。</h2><p>每条公开事件保留来源与阶段。事实、企业原文所述目的和分析推断分别呈现。</p><a class="text-link" href="about.html">阅读收录规则 →</a></section>`;
}
function filters(){
 return `<form class="filter-form" action="events.html"><div class="search-field"><label class="sr-only" for="q">搜索事件</label><input id="q" name="q" type="search" placeholder="搜索企业、标题或事实摘要" value="${esc(params.get('q')||'')}"><span aria-hidden="true">⌕</span></div><details class="filter-details" open><summary>筛选条件</summary><div class="filter-fields"><label>企业<select name="company"><option value="">全部企业</option>${companies.map(c=>`<option value="${esc(c.id)}" ${params.get('company')===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><label>事件类别<select name="category"><option value="">全部类别</option>${Object.entries(CATEGORIES).map(([k,v])=>`<option value="${esc(k)}" ${params.get('category')===k?'selected':''}>${v}</option>`).join('')}</select></label><label>时间范围<select name="period"><option value="all" ${params.get('period')!=='recent'?'selected':''}>全部历史</option><option value="recent" ${params.get('period')==='recent'?'selected':''}>最近七天</option></select></label><label>起始披露日<input type="date" name="start" value="${esc(params.get('start')||'')}"></label><label>结束披露日<input type="date" name="end" value="${esc(params.get('end')||'')}"></label><label>排序<select name="sort"><option value="latest">最新披露优先</option><option value="oldest" ${params.get('sort')==='oldest'?'selected':''}>最早披露优先</option><option value="title" ${params.get('sort')==='title'?'selected':''}>按标题</option></select></label></div></details><input type="hidden" name="view" value="${params.get('view')==='table'?'table':'cards'}"><div class="filter-actions"><button class="button" type="submit">应用筛选 →</button><a class="text-link" href="events.html?period=all">清空条件</a></div><p class="small muted">日期按事件最新有效披露日；指定起止日时替代七天窗口。</p></form>`;
}
function queryLink(change){const q=new URLSearchParams(params);for(const [k,v]of Object.entries(change)){if(v===null)q.delete(k);else q.set(k,String(v));}return `events.html?${esc(q.toString())}`;}
function table(rows){return `<div class="table-scroll"><table class="event-table"><caption class="sr-only">事件筛选结果</caption><thead><tr><th>最新披露日</th><th>事件</th><th>企业</th><th>主类别</th><th>最新确认阶段</th></tr></thead><tbody>${rows.map(e=>`<tr><td class="nowrap">${date(e.latest_disclosure_date)}</td><td><a href="${eventLink(e)}">${esc(e.title)} ↗</a><small><a href="event.html?id=${encodeURIComponent(e.id)}#sources">查看来源</a></small></td><td>${e.company_ids.map(id=>esc(name(id))).join('、')}</td><td>${tag(e)}</td><td>${esc(e.latest_stage)}</td></tr>`).join('')}</tbody></table></div>`;}
function library(){
  const rows=filterEvents(events,companies,params,today),p=paginate(rows,params.get('page')); const tableView=params.get('view')==='table';
  const chips=['q','company','category','start','end'].filter(k=>params.get(k)).map(k=>`<a class="chip" href="${queryLink({[k]:null,page:null})}">${esc(k==='company'?name(params.get(k)):k==='category'?(CATEGORIES[params.get(k)]||params.get(k)):params.get(k))} <span aria-label="移除此筛选">×</span></a>`).join('');
  $('#content').innerHTML=lead('EVENT EXPLORER','企业事件库','以事实为索引，连接企业的重要变化。支持主类别与附加标签共同筛选。')+`<div class="library-layout"><aside class="filter-panel">${filters()}</aside><section class="results"><div class="results-toolbar"><p>找到 <b>${rows.length}</b> 个事件</p><div class="view-switch" aria-label="结果展示方式"><a href="${queryLink({view:'cards'})}" ${!tableView?'aria-current="true"':''}>卡片</a><a href="${queryLink({view:'table'})}" ${tableView?'aria-current="true"':''}>表格</a></div></div>${chips?`<div class="chips">${chips}</div>`:''}${rows.length?(tableView?table(p.rows):`<div class="cards library-cards">${p.rows.map(card).join('')}</div>`):empty()}<nav class="pagination" aria-label="结果分页">${p.page>1?`<a class="button secondary" href="${queryLink({page:p.page-1})}">← 上一页</a>`:'<span></span>'}<span>第 ${p.page} / ${p.pages} 页</span>${p.page<p.pages?`<a class="button secondary" href="${queryLink({page:p.page+1})}">下一页 →</a>`:'<span></span>'}</nav><button class="text-button copy" type="button">复制当前筛选链接 ↗</button></section></div>`;
  if(matchMedia('(max-width: 720px)').matches)$('.filter-details').open=false;
}
async function detail(){
  const id=params.get('id');
  if(/^[1-9]\d*$/.test(id||'') && Object.hasOwn(redirects,id)) {
    const target=redirects[id];
    if(events.some(e=>e.id===target)) {
      const next=new URL('event.html',location.href);next.searchParams.set('id',target);
      location.replace(next.href);return;
    }
  }
  if(!/^[1-9]\d*$/.test(id||'')||!events.some(e=>e.id===id)){$('#content').innerHTML=lead('EVENT NOT AVAILABLE','记录不存在或已撤回','该链接对应的内容目前不在公开资料中。')+empty('查看其他公开事件');return;}
  const e=await readFile(`events/${id}.json`);
  if(e.id!==id||!Array.isArray(e.progress)||!e.progress.length)throw new Error('事件详情校验失败。');
  document.title=`${e.title} · Lighting MI`;
  const back=params.get('back')||'';
  const purposeLabel={stated:'原文说明',inferred:'分析推断',undisclosed:'未披露'}[e.purpose_type]||'未披露';
  $('#content').innerHTML=`<div class="breadcrumb"><a href="events.html${back.startsWith('?')?esc(back):'?period=all'}">← 返回事件库</a><span> / </span><span>事件详情</span></div><div class="detail-title">${tag(e)}<h1>${esc(e.title)}</h1><div class="detail-meta"><span>${e.company_ids.map(id=>`<a href="company.html?id=${encodeURIComponent(id)}">${esc(name(id))}</a>`).join(' · ')}</span><span>最新披露 ${date(e.latest_disclosure_date)}</span><button class="text-button copy">复制事件链接 ↗</button></div></div><div class="detail-layout"><div><section class="panel prose"><p class="eyebrow">CONFIRMED FACTS</p><h2>事实摘要</h2><p class="fact-summary">${esc(e.summary)}</p>${e.tags.length?`<p class="small muted">附加标签：${e.tags.map(t=>esc(CATEGORIES[t])).join(' · ')}</p>`:''}</section><section class="panel"><p class="eyebrow">EVENT TIMELINE</p><h2>阶段与进展</h2><div class="timeline">${e.progress.map(p=>`<article class="timeline-item"><time>${date(p.disclosure_date)} <span>披露</span></time><h3>${esc(p.stage)} ${p.planned?'<span class="tag">计划，尚非完成</span>':''}</h3><p>${esc(p.fact)}</p><p class="small muted">发生日期：${p.event_date?date(p.event_date):esc(p.event_date_raw)||'未披露'}${p.planned?'（计划）':''}</p>${p.sources.map(s=>`<a class="source-inline" href="${href(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.publisher)} · 原文依据 ↗</a>`).join('')}</article>`).join('')}</div></section><section class="panel prose"><p class="eyebrow">CONTEXT & INTERPRETATION</p><h2>目的与影响</h2><div class="analysis-block"><span class="tag">目的 · ${purposeLabel}</span><p>${esc(e.purpose)||'原文未披露目的，不补写企业意图。'}</p></div><div class="analysis-block"><span class="tag">行业影响 · 分析推断</span><p>${esc(e.impact)||'现有信息不足，暂不作影响判断。'}</p>${e.impact_basis?`<p class="small muted">依据：${esc(e.impact_basis)}</p>`:''}</div></section></div><aside><section class="panel" id="sources"><p class="eyebrow">TRACEABLE SOURCES</p><h2>来源与证据</h2>${e.progress.flatMap(p=>p.sources.map(s=>`<article class="source-card"><span class="small muted">${esc(s.publisher)} · ${date(s.publication_date)}</span><h3><a href="${href(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></h3><blockquote>${esc(s.excerpt)}</blockquote><p class="small muted">${esc(s.locator)}</p></article>`)).join('')}<p class="chart-note">来源链接不保证当前可用；短证据不等同原文全文。日期及阶段以已核实记录为准。</p></section></aside></div>`;
}
function directory(){
  $('#content').innerHTML=lead('COMPANY DIRECTORY','关注企业','固定监控 19 家企业及符合归属规则的照明业务主体。展示分组不代表事件发生地。')+
   ['China','International'].map(group=>`<section class="section"><div class="section-heading large"><h2>${group==='China'?'中国企业':'国际企业'}</h2><span class="muted">${companies.filter(c=>c.group===group).length} 家</span></div><div class="company-grid">${companies.filter(c=>c.group===group).map(c=>`<a class="company-card" href="company.html?id=${encodeURIComponent(c.id)}"><span class="company-monogram">${esc(c.name.slice(0,2))}</span><h3>${esc(c.name)}</h3><p>${events.filter(e=>e.company_ids.includes(c.id)).length} 个已收录事件</p><span class="company-arrow">↗</span></a>`).join('')}</div></section>`).join('');
}
function company(){
  const c=companies.find(c=>c.id===params.get('id'));if(!c){$('#content').innerHTML=empty('未找到该企业');return;}
  const q=new URLSearchParams(params);q.set('company',c.id);q.set('period','all');
  const rows=filterEvents(events,companies,q,today);
  const years=[...new Set(rows.map(e=>e.latest_disclosure_date.slice(0,4)))].sort().reverse();
  $('#content').innerHTML=`<div class="breadcrumb"><a href="companies.html">← 企业目录</a></div>`+lead('COMPANY HISTORY',esc(c.name),'按最新有效披露年度浏览已公开事件；每个事件的详情保留全部已确认阶段。')+`<div class="company-tools"><span>${rows.length} 个已收录事件</span><div class="category-links"><a class="chip" href="company.html?id=${encodeURIComponent(c.id)}">全部类别</a>${Object.entries(CATEGORIES).map(([k,v])=>`<a class="chip" href="company.html?id=${encodeURIComponent(c.id)}&category=${encodeURIComponent(k)}" ${params.get('category')===k?'aria-current="true"':''}>${v}</a>`).join('')}</div></div><p class="notice">资料为部分覆盖。没有条目不代表企业未发生相关事件；<a href="about.html">查看范围说明 ↗</a></p>${years.length?years.map(y=>`<section class="section"><h2 class="year-title">${esc(y)}<small>最新披露年度</small></h2><div class="cards">${rows.filter(e=>e.latest_disclosure_date.startsWith(y)).map(card).join('')}</div></section>`).join(''):empty('暂无符合条件的已收录事件')}<a class="text-link" href="events.html?period=all&company=${encodeURIComponent(c.id)}">在事件库中进一步筛选 →</a>`;
}
function about(){
  $('#content').innerHTML=lead('DATA & METHODOLOGY','让每一条信息，都有出处。','这是一个公开只读的照明企业事件资料站。它呈现已核实资料，不代表完整行业数据库。')+`<div class="about-layout"><section class="panel prose"><h2>收录什么</h2><p>围绕固定 19 家企业，关注直接涉及照明业务的实质变化。普通产品宣传、展会交流和无具体业务内容的意向不独立收录。</p><div class="rule-list">${Object.entries(CATEGORIES).map(([k,v],i)=>`<div><span class="rule-number">0${i+1}</span><h3>${v}</h3><p>${['收购、合并、股权或业务交易，以及审批、交割、终止等后续阶段。','有明确对象和业务内容的战略、技术、渠道合作或合资。','供应保障、采购区域调整、本地化及重大供应中断与应对。','新建工厂、扩产、产线升级、迁移、关厂和制造自动化。'][i]}</p></div>`).join('')}</div><h2>日期与统计口径</h2><p>最近七天指北京时间今天及此前六个自然日，按有效披露日判断。发生日期单独展示；计划不等于完成，转载不构成新进展。列表的日期筛选按事件最新有效披露日，详情保留更早阶段。</p><p>类别图按主类别唯一计数。年度图按确认进展的披露年度统计独立事件：同年去重、跨年可重复。资料量不等于行业活跃度，更不能由条数推断企业产能或投资强度。</p><h2>事实与分析分开</h2><p>事实摘要和阶段都附来源。企业所述目的与分析推断分别标识；未披露内容保持未知，不在浏览时调用 AI 补全。</p></section><aside><section class="panel prose"><p class="eyebrow">CURRENT SNAPSHOT</p><h2>范围与缺口</h2><p>${esc(coverage.summary)}</p><dl class="snapshot-list"><dt>已公开事件</dt><dd>${events.length} 个</dd><dt>数据截至</dt><dd>${date(manifest.data_as_of)}</dd><dt>网页数据生成</dt><dd>${esc(new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'medium',timeStyle:'short'}).format(new Date(manifest.generated_at)))}</dd>${coverage.reviewed_at?`<dt>公开审核</dt><dd>${date(coverage.reviewed_at)}</dd>`:''}<dt>公开版本</dt><dd class="version">${esc(manifest.dataset_version)}</dd></dl><p class="small muted">只说明此快照实际包含的资料。2010 年起的目标补查范围不表示所有年份都已完成。</p></section><section class="panel prose"><h2>如何更新</h2><p>资料由本地采集与人工审核整理，再生成公开快照并发布。网站访问、搜索和图表不调用 AI，也不连接内部后台。电脑离线不影响阅读已发布内容，但可能延迟下一次更新。</p><p>本网站不提供登录、在线审核或个人数据存储。原文归相应来源所有，公开短摘录用于追溯。</p></section></aside></div>`;
}
function copyButtons(){document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{const original=button.textContent;try{await navigator.clipboard.writeText(location.href);button.textContent='链接已复制 ✓';}catch{button.textContent='请复制浏览器地址栏中的链接';}setTimeout(()=>button.textContent=original,3500);}));}
async function boot(){
  try{
    const response=await fetch('./manifest.json',{cache:'no-store'});if(!response.ok)throw new Error('尚未生成公开数据，请先运行本地导出。');
    manifest=await response.json();
    if(manifest.schema_version!==1||!/^[a-f0-9]{20}$/.test(manifest.dataset_version)||!validDate(manifest.data_as_of))throw new Error('公开数据版本不受支持。');
    [companies,events,coverage,redirects]=await Promise.all([readFile('companies.json'),readFile('events-index.json'),readFile('coverage.json'),readFile('redirects.json')]);
    validateIndex(events,companies);
    if(events.length!==manifest.event_count||typeof coverage.summary!=='string')throw new Error('公开快照完整性校验失败。');
    $('#snapshot-status').textContent=`数据截至 ${manifest.data_as_of} · 部分覆盖`;
    if(page==='home')home();else if(page==='events')library();else if(page==='event')await detail();else if(page==='companies')directory();else if(page==='company')company();else about();
    copyButtons();
    if(location.hash==='#sources')$('#sources')?.scrollIntoView();
    $('#footer').innerHTML=`<a class="footer-brand" href="index.html">Lighting <b>MI</b><small>照明企业事件情报</small></a><p>事实有出处 · 推断有标识 · 缺口不隐藏</p><div><a href="about.html">数据与方法 ↗</a><span>公开快照 ${esc(manifest.dataset_version.slice(0,8))}</span></div>`;
  }catch(error){$('#content').innerHTML=`<section class="empty error" role="alert"><span class="eyebrow">DATA NOT AVAILABLE</span><h1>暂时无法展示资料</h1><p>${esc(error.message)}</p><button class="button" id="retry">重新读取 →</button></section>`;$('#retry').addEventListener('click',()=>location.reload());}
}
boot();
