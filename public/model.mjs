export const CATEGORIES = {'M&A':'并购与股权交易',Partnership:'合作','Supply Chain Resilience':'供应链',Manufacturing:'制造'};
export function beijingToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get = type => parts.find(p => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function shiftDate(day, amount) {
  const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+amount); return d.toISOString().slice(0,10);
}
export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
}
export function filterEvents(events, companies, params, today=beijingToday()) {
  const get = key => params.get(key)||'';
  const q = get('q').trim().toLocaleLowerCase();
  const companyMap = new Map(companies.map(c=>[c.id,c]));
  const start = get('start'), end=get('end');
  if ((start&&!validDate(start)) || (end&&!validDate(end)) || (start&&end&&start>end)) throw new Error('日期范围无效，请检查起止日期。');
  const recent = get('period')==='recent' && !start && !end;
  const rows = events.filter(e=> {
    const names=e.company_ids.flatMap(id=>{const c=companyMap.get(id);return c?[c.name,...c.aliases]:[];});
    return (!get('company')||e.company_ids.includes(get('company'))) &&
      (!get('category')||e.category===get('category')||e.tags.includes(get('category'))) &&
      (!q||[e.title,e.summary,...names].join(' ').toLocaleLowerCase().includes(q)) &&
      (!start||e.latest_disclosure_date>=start) && (!end||e.latest_disclosure_date<=end) &&
      (!recent||(e.latest_disclosure_date>=shiftDate(today,-6)&&e.latest_disclosure_date<=today));
  });
  rows.sort((a,b)=>params.get('sort')==='title'?a.title.localeCompare(b.title,'zh-CN'):
    ((params.get('sort')==='oldest'?1:-1)*(a.latest_disclosure_date.localeCompare(b.latest_disclosure_date)||Number(a.id)-Number(b.id))));
  return rows;
}
export function statistics(events) {
  const categories=Object.fromEntries(Object.keys(CATEGORIES).map(k=>[k,0])); const years={};
  for(const e of events) {
    categories[e.category]++;
    for(const year of new Set(e.years))years[year]=(years[year]||0)+1;
  }
  return {categories,years};
}
export function paginate(events, raw, size=9) {
  const pages=Math.max(1,Math.ceil(events.length/size));
  const page=Math.min(pages,Math.max(1,Number.parseInt(raw,10)||1));
  return {page,pages,rows:events.slice((page-1)*size,page*size)};
}
export function validateIndex(events, companies) {
  if(!Array.isArray(companies)||!companies.length||!Array.isArray(events))throw new Error('公开数据结构无效。');
  const ids=new Set(companies.map(c=>c.id));
  if(ids.size!==companies.length||companies.some(c=>typeof c.name!=='string'||!Array.isArray(c.aliases)))throw new Error('企业数据无效。');
  const seen=new Set();
  for(const e of events) {
    if(!/^[1-9]\d*$/.test(e.id)||seen.has(e.id)||typeof e.title!=='string'||typeof e.summary!=='string'||!validDate(e.latest_disclosure_date)||
      !Object.hasOwn(CATEGORIES,e.category)||!Array.isArray(e.tags)||e.tags.some(t=>!Object.hasOwn(CATEGORIES,t))||
      !Array.isArray(e.company_ids)||!e.company_ids.length||e.company_ids.some(c=>!ids.has(c))||
      !Array.isArray(e.years)||e.years.some(y=>!/^\d{4}$/.test(y)))throw new Error('事件索引校验失败。');
    seen.add(e.id);
  }
}
