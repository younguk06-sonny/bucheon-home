/* 부천 집 비교 — 지금 집 + 후보 3곳 + 중동·상동에서 고르는 후보 4
   지도: 카카오맵 (부천 밖으로는 나가지 않게 묶음). 카카오맵을 못 불러오면 직접 그린 부천 지도로 대신합니다.
   자료: data/bucheon.json (부천 전체 국토부 실거래, 분양시장 레이더 캐시를 매일 받아 만듦), data/zones.json (부천 정비구역),
         data/bounds.json (부천 구·동 경계, 통계청 2013) */
'use strict';

const KAKAO_KEY = '76e1f2c0c1f996041b2d1c9441792ea1'; // 정비맵과 같은 키 (younguk06-sonny.github.io 도메인)
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('bh_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { v == null ? localStorage.removeItem('bh_' + k) : localStorage.setItem('bh_' + k, JSON.stringify(v)); } catch (e) { /* 저장 공간 */ } },
};
const fmt = (v) => (v == null || v === '' || isNaN(v) ? '—' : (+v).toFixed(2).replace(/0$/, '') + '억');
const eok = (man) => (man == null ? null : man / 10000);
const THIS_YEAR = new Date().getFullYear();

/* ---------------- 고정 후보 ---------------- */
const APTS = [
  { id: 0, role: '지금 집', name: '송내역파인푸르지오1단지', short: '파인푸르지오1', pyeong: '26평 (전용 약 63㎡)',
    addr: '소사구 송내동 315 (송내대로 16)', built: '2016.10', age: '11년차', hh: '353세대 · 4개동', floors: '최고 25층',
    builder: '대우건설', far: '244% / 17%', parking: '445대 (세대당 1.26)', heat: '지역난방', subway: '1호선 송내역 260m (도보 4분)',
    price: 6.05, priceNote: '최근 실거래 기준 추정', jeonse: null,
    recent: [['2026.06.14', '3층', '6.0억'], ['2026.05.17', '19층', '6.2억'], ['2026.05.11', '5층', '6.0억'], ['2025.10.02', '14층', '6.2억']],
    listing: '26평 매물 정보 미확인 (33평 최저호가 6.8억)', peak: '6.97억 (2021.07)', trade: '거래 적음 · 해당 평형 누적 23건',
    elem: [['솔안초', '507m', '통학구역']], mid: [['부천여중', '734m', '배정 가능권'], ['부천남중', '—', '인근 단지 기준 권역']],
    trend: { 2021: 5.99, 2022: 6.90, 2023: null, 2024: 6.02, 2025: 6.06, 2026: 6.05 },
    lat: 37.4853, lng: 126.7524, q: '송내역파인푸르지오1단지',
    links: [['호갱노노', 'https://hogangnono.com/apt/aCobc'], ['KB부동산', 'https://kbland.kr/se/c/29492']] },
  { id: 1, role: '후보 1', name: '상동 라일락마을 신성미소지움', short: '신성미소지움', pyeong: '26평 A타입 (전용 59.96㎡)',
    addr: '원미구 상동 525-3 (도약로 36)', built: '2002.11', age: '25년차', hh: '955세대 · 10개동', floors: '15~25층',
    builder: '(주)신성', far: '209% / 15%', parking: '1,029대 (세대당 1.07)', heat: '지역난방', subway: '7호선 상동역 (인접 대우유림 기준 도보 5분대)',
    price: 7.14, priceNote: '리치고 시세 26.11', jeonse: 4.61,
    recent: [['2026.11.04', '2층', '6.6억'], ['2026.10.17', '10층', '7.4억'], ['2026.10.02', '6층', '7.5억'], ['2026.10.03', '8층', '7.0억']],
    listing: '13건 · 최저 6.7억 · 중간 7.5억 · 최고 8.5억', peak: '7.6억 (2026.08, 15층)', trade: '매물 소화 약 2.2개월 (원미구 평균 6.8)',
    elem: [['석천초', '112m', '길 건너']], mid: [['석천중', '392m', '가장 가까움'], ['상일중', '1.1km', '']],
    trend: { 2021: 6.32, 2022: 6.11, 2023: 5.27, 2024: 5.62, 2025: 5.86, 2026: 6.58 },
    lat: 37.5018, lng: 126.7490, q: '라일락마을신성미소지움', rt: '라일락마을(신성미소지움)',
    links: [['리치고', 'https://m.richgo.ai/realty/danji/a6UZrwj'], ['호갱노노', 'https://hogangnono.com/apt/5us41']] },
  { id: 2, role: '후보 2', name: '중동 팰리스카운티', short: '팰리스카운티', pyeong: '34평 (전용 84.99㎡)',
    addr: '원미구 중동 1288 (중동로 108)', built: '2009.07', age: '18년차', hh: '3,090세대 · 29개동', floors: '18~30층',
    builder: '대우건설 등', far: '249% / 16%', parking: '3,790대 (세대당 1.22)', heat: '—', subway: '1호선 중동역 북쪽 (구 중동주공 재건축)',
    price: 7.48, priceNote: '리치고 시세 26.10', jeonse: 4.94,
    recent: [['2026.11.13', '27층', '7.5억'], ['2026.10.26', '6층', '7.7억'], ['2026.10.17', '19층', '8.2억'], ['2026.10.22', '4층', '6.9억']],
    listing: '28건 · 최저 6.6억', peak: '9.05억 (2021.10, 13층)', trade: '최근 1년 매매 87건',
    elem: [['중동초', '약 200m', '단지 내']], mid: [['계남중', '—', '리치고 요약 기준'], ['부천중', '—', '학군표 기준 · 엇갈림']],
    trend: { 2021: 7.45, 2022: 6.84, 2023: 6.41, 2024: 6.75, 2025: 6.86, 2026: 7.16 },
    lat: 37.4900, lng: 126.7672, q: '팰리스카운티', rt: '팰리스카운티',
    links: [['리치고', 'https://m.richgo.ai/realty/danji/a6NcABA']] },
  { id: 3, role: '후보 3', name: '상동 라일락마을 경남아너스빌', short: '경남아너스빌', pyeong: '34평 단일 (전용 84.80㎡)',
    addr: '원미구 상동 525-1', built: '2002.10', age: '25년차', hh: '474세대 · 7개동', floors: '최고 21층',
    builder: '경남기업', far: '207% / 16%', parking: '세대당 약 1.2대', heat: '지역난방', subway: '7호선 상동역 (라일락마을)',
    price: 7.92, priceNote: '선수 AI 시세 26.10', jeonse: 5.63,
    recent: [['2026.11.02', '16층', '8.4억'], ['2026.11.01', '3층', '7.5억'], ['2026.10.24', '12층', '8.2억'], ['2026.10.04', '13층', '8.0억']],
    listing: '매물 수 미확인 (링크에서 확인)', peak: '8.4억 (2026.11, 16층 · 신고가)', trade: '관리비 평균 월 30만원',
    elem: [['석천초', '약 150m', '인접 단지 기준 · 확인 필요']], mid: [['석천중', '약 400m', '인접 단지 기준'], ['상일중', '약 1km', '']],
    trend: { 2021: 7.12, 2022: 7.61, 2023: 6.14, 2024: 6.30, 2025: 6.49, 2026: 7.38 },
    lat: 37.5009, lng: 126.7474, q: '라일락마을경남아너스빌', rt: '라일락마을(경남아너스빌)',
    links: [['호갱노노', 'https://hogangnono.com/apt/5uv9f']] },
];
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];
const COLORS = ['var(--s0)', 'var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)'];

/* ---------------- 상태 ---------------- */
const S = {
  data: null, zones: [], bounds: null, slot4: null, sel4: LS.get('sel4', null),
  f: Object.assign({ dong: { 중동: true, 상동: true }, min: 6, max: 9, area: 'all', age: 'all', deal: 1, q: '', sort: 'amt', inView: false }, LS.get('filter', {})),
  viewBB: null, moreDong: false,
  geo: LS.get('geo', {}), mapMode: null,
};
const all = () => (S.slot4 ? [...APTS, S.slot4] : APTS.slice());
const cleanName = (n) => n.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------------- 후보 4 ---------------- */
function makeSlot4(c) {
  if (!c) return null;
  const g = S.geo[c.n];
  const yr = {}; YEARS.forEach((y) => { yr[y] = c.yr[y] != null ? eok(c.yr[y]) : null; });
  const q = encodeURIComponent('부천 ' + c.dong + ' ' + cleanName(c.n));
  return {
    id: 4, role: '후보 4', name: c.n, short: c.n.length <= 11 ? c.n : c.n.replace(/^.*?\((.+)\)$/, '$1'), pyeong: c.area ? `대표 전용 약 ${Math.round(c.area)}㎡` : '',
    addr: '부천시 ' + c.dong, built: c.by ? String(c.by) : '—', age: c.by ? `${THIS_YEAR - c.by + 1}년차` : '', hh: '', floors: '—',
    builder: '—', far: '—', parking: '—', heat: '—', subway: '—',
    price: eok(c.amt), priceNote: c.n12 >= 2 ? '최근 12개월 대표 거래가' : '36개월 대표 거래가', jeonse: null,
    recent: c.deals.length ? c.deals.slice(0, 4).map((d) => [`${d[0].slice(0, 4)}.${d[0].slice(4, 6)}.${d[0].slice(6, 8)}`, `${d[2]}층 · ${Math.round(d[1])}㎡`, fmt(eok(d[3]))]) : `마지막 거래 ${c.last[0].slice(2, 4)}.${c.last[0].slice(4)} · 중위 ${fmt(eok(c.last[1]))} (${c.last[2]}건)`,
    listing: '링크에서 확인', peak: '—', trade: `최근 12개월 ${c.n12}건 · 전용 평당 ${c.py ? c.py.toLocaleString() : '—'}만원`,
    elem: '확인 필요', mid: '확인 필요', trend: yr, mixed: true,
    lat: g ? g[0] : null, lng: g ? g[1] : null, q: cleanName(c.n), rt: c.n, dong: c.dong,
    links: [['네이버부동산', `https://m.land.naver.com/search/result/${q}`], ['호갱노노', `https://hogangnono.com/search?q=${q}`]],
  };
}
function setSel4(name) {
  S.sel4 = name; LS.set('sel4', name);
  const c = S.data?.cx.find((x) => x.n === name);
  S.slot4 = makeSlot4(c);
  renderAll();
  if (S.slot4) Geo.locate(S.slot4).then(() => { S.slot4 = makeSlot4(c); renderAll(); MapView.focus(S.slot4); });
}

/* ---------------- 위치 찾기 (카카오 장소 검색, 이 기기에 저장) ---------------- */
const Geo = {
  async locate(a) {
    if (S.geo[a.rt || a.name] !== undefined) return S.geo[a.rt || a.name];
    if (S.mapMode !== 'kakao') return null;
    const key = a.rt || a.name;
    const dong = a.dong || (a.addr.match(/(중동|상동|송내동)/) || [])[1] || '';
    const r = await new Promise((res) => new kakao.maps.services.Places().keywordSearch(`부천 ${dong} ${a.q || cleanName(key)}`, (d, st) => res(st === kakao.maps.services.Status.OK ? d : []), { size: 5 }));
    const hit = r.find((x) => /아파트/.test(x.category_name) && (!dong || (x.address_name || '').includes(dong))) || r.find((x) => (x.address_name || '').includes('부천')) || null;
    S.geo[key] = hit ? [+hit.y, +hit.x] : 0;
    clearTimeout(Geo._t); Geo._t = setTimeout(() => LS.set('geo', S.geo), 600);
    return S.geo[key];
  },
};
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; await fn(items[k]); } })); }

/* ---------------- 요약 타일 ---------------- */
function renderTiles() {
  const base = APTS[0].price;
  let h = '';
  all().forEach((a) => {
    const d = a.price != null && a.id !== 0 ? a.price - base : null;
    h += `<div class="tile" data-a="${a.id}"><div class="tag"><span class="dot" style="background:${COLORS[a.id]}"></span>${esc(a.role)}</div>
      <div class="nm">${esc(a.short || a.name)}</div><div class="meta">${esc(a.pyeong || '')}</div>
      <div class="big" style="margin-top:6px">${fmt(a.price)}</div>
      <div class="meta">${d != null ? `지금 집 대비 ${d >= 0 ? '+' : ''}${d.toFixed(2)}억` : esc(a.priceNote || '')}</div>
      <div class="meta" style="margin-top:4px">${esc(a.built || '')}${a.hh ? ' · ' + esc(a.hh) : ''}</div></div>`;
  });
  if (!S.slot4) h += `<div class="tile empty" id="tileEmpty"><div class="tag"><span class="dot" style="background:var(--s4)"></span>후보 4</div><div>중동·상동 6~9억 단지에서 고르기</div><button class="btn">고르러 가기</button></div>`;
  $('#tiles').innerHTML = h;
}

/* ---------------- 후보 4 목록 ---------------- */
const AREA_F = [['all', '전체'], ['s', '60㎡ 이하'], ['m', '60~85㎡'], ['l', '85㎡ 초과']];
const AGE_F = [['all', '전체'], ['2000', '2000년 이후'], ['2010', '2010년 이후']];
const DEAL_F = [[1, '1건 이상'], [5, '5건 이상'], [20, '20건 이상']];
function filtered() {
  const f = S.f, q = f.q.replace(/\s/g, '');
  const list = (S.data?.cx || []).filter((c) => {
    if (!f.dong[c.dong] || c.amt == null) return false;
    const p = c.amt / 10000;
    if (f.min !== '' && p < +f.min) return false;
    if (f.max !== '' && p > +f.max) return false;
    if (f.area === 's' && !(c.area <= 60.5)) return false;
    if (f.area === 'm' && !(c.area > 60.5 && c.area <= 85.5)) return false;
    if (f.area === 'l' && !(c.area > 85.5)) return false;
    if (f.age !== 'all' && !(c.by >= +f.age)) return false;
    if ((c.n12 || 0) < f.deal) return false;
    if (q && !c.n.replace(/\s/g, '').includes(q)) return false;
    if (f.inView && S.viewBB) { const g = S.geo[c.n]; if (!g) return false; const b = S.viewBB; if (g[0] < b[0] || g[0] > b[2] || g[1] < b[1] || g[1] > b[3]) return false; }
    return true;
  });
  const k = f.sort;
  list.sort((a, b) => (k === 'amt' ? a.amt - b.amt : k === 'amtd' ? b.amt - a.amt : k === 'n12' ? b.n12 - a.n12 : k === 'by' ? (b.by || 0) - (a.by || 0) : (a.py || 1e9) - (b.py || 1e9)));
  return list;
}
function chipRow(el, opts, cur, key) {
  $(el).innerHTML = opts.map(([v, t]) => `<button class="chip${String(cur) === String(v) ? ' on' : ''}" data-v="${v}">${t}</button>`).join('');
  $(el).onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; S.f[key] = isNaN(+b.dataset.v) || key === 'age' ? b.dataset.v : +b.dataset.v; saveF(); };
}
function saveF() { LS.set('filter', S.f); renderPick(); MapView.drawCx(); clearTimeout(saveF._t); saveF._t = setTimeout(geoQueue, 500); }
let geoBusy = false;
async function geoQueue() { // 조건에 맞는 단지 중 아직 위치를 모르는 곳을 찾음 (한 번 찾으면 이 기기에 저장)
  if (S.mapMode !== 'kakao' || geoBusy) return; geoBusy = true;
  const inv = S.f.inView; S.f.inView = false; const todo = filtered().filter((c) => S.geo[c.n] === undefined).slice(0, 200); S.f.inView = inv;
  let n = 0; await pool(todo, 3, async (c) => { await Geo.locate({ name: c.n, rt: c.n, q: cleanName(c.n), dong: c.dong, addr: c.dong }); if (++n % 8 === 0) MapView.drawCx(); });
  geoBusy = false; MapView.drawCx(); if (S.f.inView) renderPick();
}
function renderPick() {
  const cnt = {}; (S.data?.cx || []).forEach((c) => { cnt[c.dong] = (cnt[c.dong] || 0) + 1; });
  const others = Object.keys(cnt).filter((d) => d !== '중동' && d !== '상동').sort((a, b) => cnt[b] - cnt[a]);
  const shown = ['중동', '상동', ...(S.moreDong ? others : others.filter((d) => S.f.dong[d]))];
  $('#fDong').innerHTML = shown.map((d) => `<button class="chip${S.f.dong[d] ? ' on' : ''}" data-d="${d}">${d}</button>`).join('') +
    `<button class="chip" data-more="1">${S.moreDong ? '접기' : '다른 동 ＋'}</button>`;
  $('#fDong').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; if (b.dataset.more) { S.moreDong = !S.moreDong; renderPick(); return; } S.f.dong[b.dataset.d] = !S.f.dong[b.dataset.d]; saveF(); };
  $('#fView').classList.toggle('on', !!S.f.inView);
  chipRow('#fArea', AREA_F, S.f.area, 'area'); chipRow('#fAge', AGE_F, S.f.age, 'age'); chipRow('#fDeal', DEAL_F, S.f.deal, 'deal');
  const list = filtered();
  $('#pickCount').textContent = `조건에 맞는 단지 ${list.length}곳${S.f.inView ? ' (지도 화면 안)' : ''}`;
  $('#plist').innerHTML = list.length ? list.map((c) => `<div class="pc${S.sel4 === c.n ? ' sel' : ''}" data-n="${esc(c.n)}">
     <div class="r1"><b>${esc(c.n)}</b><span class="p">${fmt(eok(c.amt))}</span></div>
     <div class="m">${esc(c.dong)} · ${c.by || '—'}년 준공 · 대표 전용 ${c.area ? Math.round(c.area) + '㎡' : '—'}</div>
     <div class="m">12개월 ${c.n12}건 · 평당 ${c.py ? c.py.toLocaleString() + '만' : '—'}${c.yr[2024] && c.yr[2026] ? ` · 24→26년 ${((c.yr[2026] / c.yr[2024] - 1) * 100).toFixed(0)}%` : ''}</div>
     ${S.sel4 === c.n ? '<span class="fav">✓ 후보 4로 비교 중</span>' : (() => { const f = APTS.find((a) => a.rt === c.n); return f ? `<span class="fav" style="color:${COLORS[f.id]}">이미 ${f.role}</span>` : ''; })()}</div>`).join('') : `<div class="empty-list">조건에 맞는 단지가 없어요. ${S.f.inView ? '지도를 옮기거나 \'지도 화면 안만\'을 끄고 ' : ''}가격 범위를 넓혀 보세요.</div>`;
}

/* ---------------- 지도 공통 ---------------- */
const ZCAT = { rd: ['재개발', '#1c7ed6'], rc: ['재건축', '#2f9e44'] };
const STEPS = ['구역 지정', '추진위 구성', '조합설립인가', '사업시행인가', '관리처분인가', '착공', '준공'];
const zDone = (z) => /준공|청산/.test(z.s);
const zStep = (z) => { const t = z.s; if (/준공|청산/.test(t)) return 6; if (/착공/.test(t)) return 5; if (/관리처분/.test(t)) return 4; if (/사업시행/.test(t)) return 3; if (/조합설립/.test(t)) return 2; if (/추진위/.test(t)) return 1; return 0; };
const MAPF = Object.assign({ rd: true, rc: true, done: false, apt: true, cx: true }, LS.get('mapf', {}));
const L1 = [['부개', 37.4889, 126.7406], ['송내', 37.4875, 126.7531], ['중동', 37.4863, 126.7643], ['부천', 37.4840, 126.7827], ['소사', 37.4826, 126.7950], ['역곡', 37.4853, 126.8113]];
const L7 = [['상동', 37.5058, 126.7531], ['부천시청', 37.5047, 126.7633], ['신중동', 37.5030, 126.7760], ['춘의', 37.5038, 126.7873], ['부천종합운동장', 37.5051, 126.7977], ['까치울', 37.5063, 126.8107]];
const VIEWS = { cand: [37.4935, 126.7585, 330], js: [37.4985, 126.7640, 360], all: [37.5035, 126.7895, 1050] };
let selZone = null;

function zoneInfo(i) {
  const z = S.zones[i], c = zDone(z) ? '#9aa4ae' : ZCAT[z.k][1], st = zStep(z);
  const dts = (z.dt || []).slice(-4).map((d) => `${d[0]} ${d[1].slice(0, 4)}.${d[1].slice(4, 6)}`).join(' · ');
  showInfo(`<h4>${esc(z.n || z.n0 || '정비구역')}</h4>
    <span class="badge" style="--c:${c}">${ZCAT[z.k][0]}</span><span class="badge" style="--c:${c}">${esc(z.s)}</span>
    <div class="st" style="--c:${c}">${STEPS.map((_, k) => `<i class="${k <= st ? 'on' : ''}"></i>`).join('')}</div>
    <div class="note">${STEPS[0]} → ${STEPS[6]}</div>
    <div style="margin-top:6px">구역면적 ${Math.round(z.a).toLocaleString()}㎡${dts ? `<br><span class="note">${esc(dts)}</span>` : ''}</div>`);
}
function aptInfo(a) {
  showInfo(`<h4>${esc(a.name)}</h4>
    <span class="badge" style="--c:${COLORS[a.id]}">${esc(a.role)}</span>${a.pyeong ? `<span class="badge" style="--c:${COLORS[a.id]}">${esc(a.pyeong.split(' (')[0])}</span>` : ''}
    <div style="margin-top:6px">시세 <b>${fmt(a.price)}</b>${a.jeonse ? ` · 전세 ${fmt(a.jeonse)}` : ''}<br>${esc(a.built || '')}${a.hh ? ' · ' + esc(a.hh) : ''}<br><span class="note">${esc(a.subway !== '—' ? a.subway : a.addr)}</span></div>`);
}
function cxInfo(c) {
  showInfo(`<h4>${esc(c.n)}</h4><span class="badge" style="--c:#6b7a89">${esc(c.dong)}</span><span class="badge" style="--c:#6b7a89">${c.by || '—'}년</span>
    <div style="margin-top:6px">대표 거래가 <b>${fmt(eok(c.amt))}</b> · 대표 전용 ${c.area ? Math.round(c.area) + '㎡' : '—'}<br><span class="note">12개월 ${c.n12}건 · 평당 ${c.py ? c.py.toLocaleString() + '만' : '—'}</span></div>
    ${S.sel4 === c.n ? '<div class="note" style="margin-top:6px">후보 4로 비교 중</div>' : `<button class="btn primary" data-pick="${esc(c.n)}">후보 4로 비교하기</button>`}`);
}
function showInfo(html) {
  const el = $('#jinfo'); el.innerHTML = `<button class="x" aria-label="닫기">×</button>${html}`; el.classList.add('on');
  el.querySelector('.x').onclick = () => { el.classList.remove('on'); if (selZone != null) { selZone = null; MapView.drawZones(); } };
  const pb = el.querySelector('[data-pick]'); if (pb) pb.onclick = () => { setSel4(pb.dataset.pick); el.classList.remove('on'); };
}
function renderMapChips() {
  const c = [['apt', '비교 단지', 'var(--s1)'], ['cx', '후보 4 목록', 'var(--s4)'], ['rd', '재개발', '#1c7ed6'], ['rc', '재건축', '#2f9e44'], ['done', '준공 구역', '#9aa4ae']];
  $('#mapChips').innerHTML = c.map((x) => `<button class="chip${MAPF[x[0]] ? ' on' : ''}" data-f="${x[0]}" style="--c:${x[2]}"><i></i>${x[1]}</button>`).join('');
  $('#mapChips').onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; MAPF[b.dataset.f] = !MAPF[b.dataset.f]; LS.set('mapf', MAPF); renderMapChips(); MapView.drawZones(); MapView.drawCx(); MapView.drawApts(); };
  $('#mapLegend').innerHTML = `<span><svg width="22" height="6"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/></svg>중동·상동</span>
    <span class="note">정비구역 ${S.zones.length}곳(국토부 2026.10 · 경기도 추진현황 2025.10) · 회색 칩은 후보 4 목록 단지(누르면 비교에 추가)${S.mapMode === 'svg' ? ' · 카카오맵을 불러오지 못해 직접 그린 지도로 보여줍니다' : ''}</span>`;
}

/* ---------------- 카카오맵 ---------------- */
const Kakao = {
  load() {
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
      s.onload = () => { try { kakao.maps.load(() => resolve(true)); } catch (e) { resolve(false); } };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
      setTimeout(() => resolve(!!(window.kakao && kakao.maps && kakao.maps.Map)), 8000);
    });
  },
};
const KM = { map: null, zones: [], zlabels: [], apts: [], cx: [] };
const KView = {
  init() {
    const b = S.bounds.bb, LL = (a, b2) => new kakao.maps.LatLng(a, b2);
    const v = VIEWS.cand;
    KM.map = new kakao.maps.Map($('#kmap'), { center: LL(v[0], v[1]), level: 5 });
    KM.map.setMinLevel(1); KM.map.setMaxLevel(8);
    KM.map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    // 부천 밖은 흐리게 (바깥 사각형 + 구 경계 구멍)
    const outer = [LL(37.30, 126.55), LL(37.30, 127.05), LL(37.70, 127.05), LL(37.70, 126.55)];
    const holes = Object.values(S.bounds.gu).map((r) => r.map((p) => LL(p[0], p[1])).reverse());
    new kakao.maps.Polygon({ map: KM.map, path: [outer, ...holes], strokeWeight: 0, fillColor: '#1d2a38', fillOpacity: 0.32 });
    Object.values(S.bounds.gu).forEach((r) => new kakao.maps.Polyline({ map: KM.map, path: r.map((p) => LL(p[0], p[1])), strokeWeight: 2, strokeColor: '#5d6b7a', strokeOpacity: 0.8, strokeStyle: 'shortdash' }));
    Object.values(S.bounds.dong).forEach((r) => new kakao.maps.Polygon({ map: KM.map, path: r.map((p) => LL(p[0], p[1])), strokeWeight: 1.5, strokeColor: '#1d5fd1', strokeOpacity: 0.55, strokeStyle: 'shortdash', fillColor: '#1d5fd1', fillOpacity: 0.04 }));
    const clamp = () => { const c = KM.map.getCenter(); const la = Math.min(b[2], Math.max(b[0], c.getLat())), lo = Math.min(b[3], Math.max(b[1], c.getLng())); if (la !== c.getLat() || lo !== c.getLng()) KM.map.setCenter(LL(la, lo)); };
    kakao.maps.event.addListener(KM.map, 'dragend', clamp);
    kakao.maps.event.addListener(KM.map, 'zoom_changed', () => { clamp(); this.drawZoneLabels(); this.drawCx(); });
    kakao.maps.event.addListener(KM.map, 'click', () => $('#jinfo').classList.remove('on'));
    kakao.maps.event.addListener(KM.map, 'idle', () => { const bb = KM.map.getBounds(), sw = bb.getSouthWest(), ne = bb.getNorthEast(); S.viewBB = [sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng()]; if (S.f.inView) renderPick(); });
    this.drawZones(); this.drawApts(); this.drawCx();
  },
  setView(k) { const v = VIEWS[k]; KM.map.setLevel(k === 'all' ? 8 : k === 'js' ? 6 : 5); KM.map.setCenter(new kakao.maps.LatLng(v[0], v[1])); },
  zoom(d) { KM.map.setLevel(KM.map.getLevel() + d); },
  drawZones() {
    KM.zones.forEach((p) => p.setMap(null)); KM.zones = [];
    S.zones.forEach((z, i) => {
      if (!zVis(z)) return;
      const c = zDone(z) ? '#9aa4ae' : ZCAT[z.k][1], sel = selZone === i;
      z.r.forEach((r) => {
        const pg = new kakao.maps.Polygon({ map: KM.map, path: r.map((p) => new kakao.maps.LatLng(p[0], p[1])), strokeWeight: sel ? 3 : 1.5, strokeColor: c, strokeOpacity: 0.9, fillColor: c, fillOpacity: sel ? 0.32 : zDone(z) ? 0.1 : 0.18, zIndex: 1 });
        kakao.maps.event.addListener(pg, 'click', () => { selZone = i; this.drawZones(); zoneInfo(i); });
        KM.zones.push(pg);
      });
    });
    this.drawZoneLabels();
  },
  drawZoneLabels() {
    KM.zlabels.forEach((o) => o.setMap(null)); KM.zlabels = [];
    const lv = KM.map.getLevel(); if (lv > 5) return;
    S.zones.forEach((z, i) => {
      if (!zVis(z)) return;
      const el = document.createElement('div');
      el.className = 'zr' + (zDone(z) ? ' done' : '') + (selZone === i ? ' sel' : ''); el.style.setProperty('--c', ZCAT[z.k][1]);
      el.innerHTML = `<b>${esc(z.n || '정비구역')}</b>${lv <= 3 ? `<span>${esc(z.s)}</span>` : ''}`;
      el.onclick = (e) => { e.stopPropagation(); selZone = i; this.drawZones(); zoneInfo(i); };
      const o = new kakao.maps.CustomOverlay({ map: KM.map, position: new kakao.maps.LatLng(z.c[0], z.c[1]), content: el, yAnchor: 0.5, zIndex: 3 });
      KM.zlabels.push(o);
    });
  },
  drawApts() {
    KM.apts.forEach((o) => o.setMap(null)); KM.apts = [];
    if (!MAPF.apt) return;
    all().forEach((a) => {
      if (a.lat == null) return;
      const el = document.createElement('div');
      el.className = 'mk-site'; el.style.setProperty('--c', COLORS[a.id]);
      el.innerHTML = `<em>${a.id === 0 ? '現' : a.id}</em>${esc(a.short || a.name)} · ${fmt(a.price)}`;
      el.onclick = (e) => { e.stopPropagation(); aptInfo(a); };
      KM.apts.push(new kakao.maps.CustomOverlay({ map: KM.map, position: new kakao.maps.LatLng(a.lat, a.lng), content: el, yAnchor: 1.35, zIndex: 10 + a.id }));
    });
  },
  drawCx() {
    KM.cx.forEach((o) => o.setMap(null)); KM.cx = [];
    if (!MAPF.cx || KM.map.getLevel() > 6) return;
    const fixed = new Set(APTS.map((a) => a.rt).filter(Boolean));
    filtered().forEach((c) => {
      if (fixed.has(c.n) || c.n === S.sel4) return;
      const g = S.geo[c.n]; if (!g) return;
      const el = document.createElement('div'); el.className = 'mk-cx';
      el.innerHTML = `${fmt(eok(c.amt))}<small>${esc(c.n)}</small>`;
      el.onclick = (e) => { e.stopPropagation(); cxInfo(c); };
      KM.cx.push(new kakao.maps.CustomOverlay({ map: KM.map, position: new kakao.maps.LatLng(g[0], g[1]), content: el, yAnchor: 0.5, zIndex: 5 }));
    });
  },
  focus(a) { if (a && a.lat != null) { if (KM.map.getLevel() > 5) KM.map.setLevel(5); KM.map.panTo(new kakao.maps.LatLng(a.lat, a.lng)); } },
};
const zVis = (z) => MAPF[z.k] !== false && (MAPF.done || !zDone(z));

/* ---------------- 직접 그린 지도 (카카오맵을 못 쓸 때) ---------------- */
const LAT0 = 37.5, K0 = Math.cos(LAT0 * Math.PI / 180), U = 1e4;
const wx = (lng) => (lng - 126.7) * K0 * U, wy = (lat) => (LAT0 - lat) * U;
const ll = (x, y) => [LAT0 - y / U, x / (K0 * U) + 126.7];
const ptsStr = (arr) => arr.map((p) => wx(p[1]).toFixed(1) + ',' + wy(p[0]).toFixed(1)).join(' ');
let V = { cx: 0, cy: 0, s: 1 };
const SView = {
  el: () => $('#jmap'),
  init() {
    const svg = $('#jsvg'), guR = Object.values(S.bounds.gu);
    const big = `M${wx(126.55)},${wy(37.7)}H${wx(127.05)}V${wy(37.3)}H${wx(126.55)}Z`;
    const guPath = guR.map((r) => 'M' + r.map((p) => wx(p[1]).toFixed(1) + ',' + wy(p[0]).toFixed(1)).join('L') + 'Z').join(' ');
    const rail = (arr, c) => {
      const p = arr.map((s) => [wx(s[2]), wy(s[1])]); const e = (a, b) => [a[0] + (a[0] - b[0]) * 0.5, a[1] + (a[1] - b[1]) * 0.5];
      const allp = [e(p[0], p[1]), ...p, e(p[p.length - 1], p[p.length - 2])];
      return `<polyline points="${allp.map((q) => q.map((v) => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="4" vector-effect="non-scaling-stroke" stroke-linecap="round"/>` +
        p.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="1" fill="var(--surface-1)" stroke="${c}" stroke-width="2.5" vector-effect="non-scaling-stroke" class="stc"/>`).join('');
    };
    svg.innerHTML = `<path d="${big} ${guPath}" fill="var(--out)" fill-rule="evenodd"/>
      ${guR.map((r) => `<polygon points="${ptsStr(r)}" fill="var(--land)" stroke="var(--land-stroke)" stroke-width="1.2" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/>`).join('')}
      ${Object.values(S.bounds.dong).map((r) => `<polygon points="${ptsStr(r)}" fill="var(--accent)" fill-opacity=".05" stroke="var(--accent)" stroke-opacity=".5" stroke-width="1.2" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>`).join('')}
      <g id="jzones"></g>${rail(L1, 'var(--rail1)')}${rail(L7, 'var(--rail7)')}`;
    this.setView('cand'); this.drawZones(); this.bind();
  },
  setView(k) { const v = VIEWS[k], el = this.el(); const m = Math.min(el.clientWidth, el.clientHeight) || 500; V = { cx: wx(v[1]), cy: wy(v[0]), s: v[2] / m }; this.clamp(); this.render(); },
  clamp() { const b = S.bounds.bb, el = this.el(); V.s = Math.max(0.06, Math.min(V.s, 1200 / Math.min(el.clientWidth, el.clientHeight))); V.cx = Math.max(wx(b[1]), Math.min(wx(b[3]), V.cx)); V.cy = Math.max(wy(b[2]), Math.min(wy(b[0]), V.cy)); },
  scr(lat, lng) { const el = this.el(); return [(wx(lng) - V.cx) / V.s + el.clientWidth / 2, (wy(lat) - V.cy) / V.s + el.clientHeight / 2]; },
  unscr(x, y) { const el = this.el(); return ll((x - el.clientWidth / 2) * V.s + V.cx, (y - el.clientHeight / 2) * V.s + V.cy); },
  zoom(f, px, py) { const el = this.el(); px = px ?? el.clientWidth / 2; py = py ?? el.clientHeight / 2; const [la, lo] = this.unscr(px, py); V.s *= f; this.clamp(); const [nx, ny] = this.scr(la, lo); V.cx += (nx - px) * V.s; V.cy += (ny - py) * V.s; this.clamp(); this.render(); },
  drawZones() {
    $('#jzones').innerHTML = S.zones.map((z, i) => {
      if (!zVis(z)) return '';
      const c = zDone(z) ? '#9aa4ae' : ZCAT[z.k][1], sel = selZone === i;
      return z.r.map((r) => `<polygon points="${ptsStr(r)}" data-z="${i}" fill="${c}" fill-opacity="${sel ? 0.32 : zDone(z) ? 0.12 : 0.2}" stroke="${c}" stroke-width="${sel ? 3 : 1.5}" vector-effect="non-scaling-stroke" style="cursor:pointer"/>`).join('');
    }).join('');
    this.render();
  },
  drawApts() { this.render(); }, drawCx() { this.render(); }, drawZoneLabels() { this.render(); },
  focus(a) { if (a && a.lat != null) { V.cx = wx(a.lng); V.cy = wy(a.lat); this.clamp(); this.render(); } },
  render() {
    const el = this.el(), W = el.clientWidth, H = el.clientHeight;
    $('#jsvg').setAttribute('viewBox', `${V.cx - W / 2 * V.s} ${V.cy - H / 2 * V.s} ${W * V.s} ${H * V.s}`);
    document.querySelectorAll('#jsvg .stc').forEach((c) => c.setAttribute('r', 4.5 * V.s));
    const inView = (x, y) => x > -80 && y > -40 && x < W + 80 && y < H + 40;
    let h = '';
    if (V.s < 1.6) [...L1, ...L7].forEach((st) => { const [x, y] = this.scr(st[1], st[2]); if (inView(x, y)) h += `<div class="stn" style="left:${x}px;top:${y}px">${st[0]}</div>`; });
    if (V.s < 0.75) S.zones.forEach((z, i) => { if (!zVis(z)) return; const [x, y] = this.scr(z.c[0], z.c[1]); if (!inView(x, y)) return; const mini = V.s > 0.38;
      h += `<div class="zr${zDone(z) ? ' done' : ''}${selZone === i ? ' sel' : ''}" data-z="${i}" style="left:${x}px;top:${y}px;--c:${ZCAT[z.k][1]}"><b>${esc(z.n || '정비구역')}</b>${mini ? '' : `<span>${esc(z.s)}</span>`}</div>`; });
    if (MAPF.cx && V.s < 1.0) { const fixed = new Set(APTS.map((a) => a.rt).filter(Boolean)); filtered().forEach((c) => { if (fixed.has(c.n) || c.n === S.sel4) return; const g = S.geo[c.n]; if (!g) return; const [x, y] = this.scr(g[0], g[1]); if (inView(x, y)) h += `<div class="mk-cx" data-cx="${esc(c.n)}" style="left:${x}px;top:${y}px">${fmt(eok(c.amt))}<small>${esc(c.n)}</small></div>`; }); }
    if (MAPF.apt) { const placed = []; all().forEach((a) => { if (a.lat == null) return; const [x, y] = this.scr(a.lat, a.lng); if (!inView(x, y)) return; const mini = V.s > 1.2, wd = mini ? 40 : 170;
      const hit = placed.some((q) => !q.b && Math.abs(q.x - x) < wd && Math.abs(q.y - y) < 34); placed.push({ x, y, b: hit });
      h += `<div class="mk-site${mini ? ' mini' : ''}${hit ? ' below' : ''}" data-a="${a.id}" style="left:${x}px;top:${y}px;--c:${COLORS[a.id]}"><em>${a.id === 0 ? '現' : a.id}</em>${mini ? '' : esc(a.short || a.name) + ' · ' + fmt(a.price)}</div>`; }); }
    $('#jlayer').innerHTML = h;
    const a0 = this.unscr(0, H), a1 = this.unscr(W, 0); S.viewBB = [a0[0], a0[1], a1[0], a1[1]];
    $('#jhint').classList.toggle('on', V.s >= 0.75); $('#jhint').textContent = '확대하면 정비구역 이름과 진행 단계가 보여요';
  },
  bind() {
    const el = this.el(); el.classList.add('svgmode');
    el.addEventListener('wheel', (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); this.zoom(e.deltaY > 0 ? 1.25 : 0.8, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    let drag = null, moved = false; const ptrs = new Map(); let pinch = null;
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('.jbtn,.jinfo')) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }; drag = null; return; }
      drag = { x: e.clientX, y: e.clientY, cx: V.cx, cy: V.cy }; moved = false; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
      if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const r = el.getBoundingClientRect(); this.zoom(pinch.d / d, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); pinch.d = d; moved = true; return; }
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) { moved = true; el.classList.add('drag'); }
      V.cx = drag.cx - dx * V.s; V.cy = drag.cy - dy * V.s; this.clamp(); this.render(); });
    const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; el.classList.remove('drag');
      if (drag && !moved && e.type === 'pointerup') this.click(e); drag = null; };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => this.render());
  },
  click(e) {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const a = t && t.closest('[data-a]'), cx = t && t.closest('[data-cx]'), zl = t && t.closest('[data-z]');
    if (a) return aptInfo(all().find((o) => o.id == a.dataset.a));
    if (cx) return cxInfo(S.data.cx.find((c) => c.n === cx.dataset.cx));
    if (zl) { selZone = +zl.dataset.z; this.drawZones(); return zoneInfo(selZone); }
    if (selZone != null) { selZone = null; this.drawZones(); }
    $('#jinfo').classList.remove('on');
  },
};
let MapView = { drawZones() {}, drawApts() {}, drawCx() {}, focus() {} };

/* ---------------- 시세 추이 ---------------- */
const tip = () => $('#tip');
function showTip(e, html) { const t = tip(); t.innerHTML = html; t.style.display = 'block'; moveTip(e); }
function moveTip(e) { const t = tip(), w = t.offsetWidth; let x = e.pageX + 14; if (x + w > window.scrollX + innerWidth - 8) x = e.pageX - w - 14; t.style.left = x + 'px'; t.style.top = (e.pageY + 12) + 'px'; }
function hideTip() { tip().style.display = 'none'; }
function renderTrend() {
  const list = all();
  $('#lineLegend').innerHTML = list.map((a) => `<span><svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke="${COLORS[a.id]}" stroke-width="2.5"${a.mixed ? ' stroke-dasharray="4 3"' : ''}/></svg>${esc(a.short || a.name)} <span class="note">${esc((a.pyeong || '').split(' (')[0])}</span></span>`).join('');
  const W = 540, H = 280, m = { l: 42, r: 118, t: 12, b: 28 };
  const vals = []; list.forEach((a) => YEARS.forEach((y) => { const v = a.trend?.[y]; if (v != null && !isNaN(v)) vals.push(+v); }));
  let lo = Math.floor(Math.min(...vals) * 2) / 2 - 0.5, hi = Math.ceil(Math.max(...vals) * 2) / 2;
  if (!isFinite(lo)) { lo = 5; hi = 8; }
  const X = (i) => m.l + i * (W - m.l - m.r) / (YEARS.length - 1), Y = (v) => m.t + (hi - v) / (hi - lo) * (H - m.t - m.b);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="연도별 평균 실거래가" id="tsvg">`;
  for (let v = Math.ceil(lo); v <= hi; v += 0.5) { s += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/>`; if (Number.isInteger(v)) s += `<text x="${m.l - 6}" y="${Y(v) + 4}" font-size="11" text-anchor="end" fill="var(--text-muted)">${v}억</text>`; }
  YEARS.forEach((y, i) => { s += `<text x="${X(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="var(--text-muted)">${y}</text>`; });
  const ends = [];
  list.forEach((a) => {
    let seg = [], path = '';
    YEARS.forEach((y, i) => { const v = a.trend?.[y]; if (v != null && !isNaN(v)) seg.push([X(i), Y(+v)]); else { if (seg.length) path += 'M' + seg.map((p) => p.join(',')).join('L'); seg = []; } });
    if (seg.length) path += 'M' + seg.map((p) => p.join(',')).join('L');
    s += `<path d="${path}" fill="none" stroke="${COLORS[a.id]}" stroke-width="2" stroke-linejoin="round"${a.mixed ? ' stroke-dasharray="5 4"' : ''}/>`;
    YEARS.forEach((y, i) => { const v = a.trend?.[y]; if (v != null && !isNaN(v)) s += `<circle cx="${X(i)}" cy="${Y(+v)}" r="3.5" fill="${COLORS[a.id]}" stroke="var(--surface-1)" stroke-width="1.5"/>`; });
    const last = a.trend?.[2026]; const nm = a.short || a.name;
    if (last != null) ends.push({ y: Y(+last), t: (nm.length > 8 ? nm.slice(0, 8) + '…' : nm) + ' ' + (+last).toFixed(2) });
  });
  ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  ends.forEach((e) => { s += `<text x="${W - m.r + 8}" y="${e.y + 4}" font-size="10.5" fill="var(--text-secondary)">${esc(e.t)}</text>`; });
  s += `<line id="xh" y1="${m.t}" y2="${H - m.b}" stroke="var(--text-muted)" stroke-dasharray="3 3" style="display:none"/><rect x="${m.l - 10}" y="0" width="${W - m.l - m.r + 20}" height="${H}" fill="transparent" id="hit"/></svg>`;
  $('#chartBox').innerHTML = s;
  const svg = $('#tsvg'), hit = $('#hit'), xh = $('#xh');
  hit.addEventListener('mousemove', (e) => {
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const i = Math.max(0, Math.min(YEARS.length - 1, Math.round((p.x - m.l) / ((W - m.l - m.r) / (YEARS.length - 1)))));
    xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.style.display = '';
    showTip(e, `<b>${YEARS[i]}년 평균</b>` + list.map((a) => `<div class="r"><span><span class="dot" style="background:${COLORS[a.id]};width:8px;height:8px"></span> ${esc(a.short || a.name)}</span><span>${fmt(a.trend?.[YEARS[i]])}</span></div>`).join(''));
  });
  hit.addEventListener('mouseleave', () => { xh.style.display = 'none'; hideTip(); });
  let t = `<table><thead><tr><th>단지</th>${YEARS.map((y) => `<th class="num">${y}</th>`).join('')}</tr></thead><tbody>`;
  list.forEach((a) => { t += `<tr><td><span class="colhead"><span class="dot" style="background:${COLORS[a.id]}"></span>${esc(a.short || a.name)}</span></td>${YEARS.map((y) => `<td class="num">${fmt(a.trend?.[y])}</td>`).join('')}</tr>`; });
  $('#trendTable').innerHTML = t + '</tbody></table>';
}

/* ---------------- 비교표 ---------------- */
const head = (list) => `<thead><tr><th></th>${list.map((a) => `<th><span class="colhead"><span class="dot" style="background:${COLORS[a.id]}"></span>${esc(a.short || a.name)}</span><span class="note">${esc(a.role)}</span></th>`).join('')}</tr></thead>`;
const rows = (list, spec) => spec.map(([lab, fn]) => `<tr><th>${lab}</th>${list.map((a) => `<td>${fn(a) ?? '—'}</td>`).join('')}</tr>`).join('');
function renderTables() {
  const list = all(), base = APTS[0].price;
  $('#overview').innerHTML = `<table>${head(list)}<tbody>${rows(list, [
    ['비교 평형', (a) => esc(a.pyeong)], ['주소', (a) => esc(a.addr)], ['준공', (a) => esc(a.built) + (a.age ? ` <span class="pill">${esc(a.age)}</span>` : '')],
    ['규모', (a) => esc(a.hh || '—')], ['층수', (a) => esc(a.floors)], ['시공사', (a) => esc(a.builder)], ['용적률/건폐율', (a) => esc(a.far)],
    ['주차', (a) => esc(a.parking)], ['난방', (a) => esc(a.heat)], ['지하철', (a) => esc(a.subway)]])}</tbody></table>`;
  $('#market').innerHTML = `<table>${head(list)}<tbody>${rows(list, [
    ['매매 시세', (a) => `<b>${fmt(a.price)}</b><br><span class="note">${esc(a.priceNote || '')}</span>`],
    ['지금 집 대비', (a) => (a.id === 0 || a.price == null ? '—' : `${a.price - base >= 0 ? '+' : ''}${(a.price - base).toFixed(2)}억`)],
    ['전세 시세', (a) => fmt(a.jeonse) + (a.jeonse && a.price ? ` <span class="pill">전세가율 ${Math.round(a.jeonse / a.price * 100)}%</span>` : '')],
    ['최근 실거래', (a) => (Array.isArray(a.recent) ? a.recent.map((r) => `${r[0].slice(2)} · ${r[1]} · <b>${r[2]}</b>`).join('<br>') : esc(a.recent))],
    ['매물', (a) => esc(a.listing)], ['최고가', (a) => esc(a.peak)], ['참고', (a) => esc(a.trade)],
    ['링크', (a) => (a.links || []).map((l) => `<a href="${l[1]}" target="_blank" rel="noopener">${l[0]}</a>`).join(' · ')]])}</tbody></table>`;
  const sch = (arr) => (Array.isArray(arr) ? arr.map((s) => `<b>${esc(s[0])}</b> ${esc(s[1])}${s[2] ? ` <span class="pill">${esc(s[2])}</span>` : ''}`).join('<br>') : esc(arr));
  $('#schools').innerHTML = `<table>${head(list)}<tbody>${rows(list, [['초등학교', (a) => sch(a.elem)], ['중학교', (a) => sch(a.mid)]])}</tbody></table>`;
}

/* ---------------- 계산기 ---------------- */
const acqTax = (p) => p * (p <= 6 ? 0.01 : p <= 9 ? (p * 2 / 3 - 3) / 100 : 0.03) * 1.1;
const brokerFee = (p) => p * (p < 2 ? 0.005 : p < 9 ? 0.004 : p < 12 ? 0.005 : 0.006);
function renderCalc() {
  const sel = $('#cTarget'), prev = sel.value;
  sel.innerHTML = all().filter((a) => a.id !== 0).map((a) => `<option value="${a.id}">${esc(a.short || a.name)}</option>`).join('');
  if (prev && [...sel.options].some((o) => o.value === prev)) sel.value = prev;
  const a = all().find((x) => x.id == sel.value);
  if ($('#cBuy').dataset.for !== sel.value || !$('#cBuy').dataset.touched) { $('#cBuy').value = a?.price != null ? a.price.toFixed(2) : ''; $('#cBuy').dataset.for = sel.value; }
  calc();
}
function calc() {
  const sell = +$('#cSell').value || 0, buy = +$('#cBuy').value || 0, tax = acqTax(buy), fee = brokerFee(buy) + brokerFee(sell);
  $('#cOut').innerHTML = `<div>추가로 필요한 금액(대략)</div><div class="k">${(buy - sell + tax + fee).toFixed(2)}억</div>
    <div class="note" style="margin-top:4px">매수가 차액 ${(buy - sell).toFixed(2)}억 + 취득세 등 ${Math.round(tax * 10000).toLocaleString()}만원 + 중개보수(양쪽) ${Math.round(fee * 10000).toLocaleString()}만원</div>`;
}

/* ---------------- 출처 ---------------- */
function renderSources() {
  $('#sources').innerHTML = [
    ['국토교통부 아파트 매매 실거래가 (분양시장 레이더 수집) — 후보 4 목록', 'https://github.com/younguk06-sonny/New-Build_Rader'],
    ['정비맵 — 부천 정비구역 (국토교통부 정비구역 2026.10 · 경기도 정비사업 추진현황 2025.10)', 'https://younguk06-sonny.github.io/jeongbi-map/'],
    ['통계청 행정구역 경계 2013 (southkorea-maps)', 'https://github.com/southkorea/southkorea-maps'],
    ['리치고 · 라일락신성미소지움', 'https://m.richgo.ai/realty/danji/a6UZrwj'], ['리치고 · 팰리스카운티', 'https://m.richgo.ai/realty/danji/a6NcABA'],
    ['디아파트 · 송내역파인푸르지오1단지', 'https://dapt.kr/apt/BmA296.html'], ['디아파트 · 라일락마을신성미소지움', 'https://dapt.kr/apt/BmA011.html'],
    ['디아파트 · 팰리스카운티', 'https://dapt.kr/apt/BmA003.html'], ['디아파트 · 라일락마을경남아너스빌', 'https://dapt.kr/apt/BmA081.html'],
    ['호갱노노 · 송내역파인푸르지오1단지', 'https://hogangnono.com/apt/aCobc'], ['호갱노노 · 라일락마을경남아너스빌', 'https://hogangnono.com/apt/5uv9f'],
    ['KB부동산 · 송내역파인푸르지오1단지', 'https://kbland.kr/se/c/29492'],
  ].map((s) => `<a href="${s[1]}" target="_blank" rel="noopener">${s[0]}</a>`).join('<br>') + '<br>※ 후보 1~3·지금 집의 시세·매물·학교는 2026년 11월 중순 조사값으로 고정돼 있고, 후보 4 목록은 매일 아침 새 실거래로 갱신됩니다.';
}

/* ---------------- 시작 ---------------- */
function renderAll() { renderTiles(); renderPick(); renderTrend(); renderTables(); renderCalc(); MapView.drawApts(); MapView.drawCx(); }
async function getJSON(u) { const r = await fetch(u, { cache: 'no-cache' }); if (!r.ok) throw new Error(u); return r.json(); }
async function main() {
  const t = LS.get('theme', null); if (t) document.documentElement.dataset.theme = t;
  $('#themeBtn').onclick = () => { const r = document.documentElement; const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; LS.set('theme', r.dataset.theme); };
  const [data, zones, bounds] = await Promise.all([getJSON('data/bucheon.json'), getJSON('data/zones.json'), getJSON('data/bounds.json')]);
  S.data = data; S.zones = zones; S.bounds = bounds;
  $('#asOf').textContent = `실거래 자료(부천 전체): ${data.from.slice(0, 4)}.${data.from.slice(4)} ~ ${data.asOf.slice(0, 4)}.${data.asOf.slice(4)}.`;
  if (S.sel4) S.slot4 = makeSlot4(data.cx.find((c) => c.n === S.sel4));
  // 이벤트
  $('#fMin').value = S.f.min; $('#fMax').value = S.f.max; $('#fQ').value = S.f.q; $('#fSort').value = S.f.sort;
  $('#fMin').oninput = () => { S.f.min = $('#fMin').value; saveF(); };
  $('#fMax').oninput = () => { S.f.max = $('#fMax').value; saveF(); };
  $('#fQ').oninput = () => { S.f.q = $('#fQ').value; saveF(); };
  $('#fSort').onchange = () => { S.f.sort = $('#fSort').value; saveF(); };
  $('#fView').onclick = () => { S.f.inView = !S.f.inView; saveF(); };
  $('#plist').onclick = (e) => { const c = e.target.closest('.pc'); if (c) setSel4(c.dataset.n === S.sel4 ? null : c.dataset.n); };
  $('#tiles').onclick = (e) => { if (e.target.closest('#tileEmpty')) { $('#pick').scrollIntoView({ behavior: 'smooth' }); return; } const t2 = e.target.closest('[data-a]'); if (t2) { const a = all().find((x) => x.id == t2.dataset.a); $('#jmap').scrollIntoView({ behavior: 'smooth', block: 'center' }); MapView.focus(a); aptInfo(a); } };
  $('#vChart').onclick = () => { $('#chartBox').style.display = ''; $('#lineLegend').style.display = ''; $('#trendTable').style.display = 'none'; $('#vChart').classList.add('on'); $('#vTable').classList.remove('on'); };
  $('#vTable').onclick = () => { $('#chartBox').style.display = 'none'; $('#lineLegend').style.display = 'none'; $('#trendTable').style.display = ''; $('#vTable').classList.add('on'); $('#vChart').classList.remove('on'); };
  $('#cTarget').onchange = () => { $('#cBuy').dataset.touched = ''; renderCalc(); };
  $('#cSell').oninput = calc; $('#cBuy').oninput = () => { $('#cBuy').dataset.touched = '1'; calc(); };
  renderSources(); renderAll();

  // 지도
  const ok = await Kakao.load();
  $('#mapMsg').style.display = 'none';
  if (ok) { S.mapMode = 'kakao'; $('#jmap').classList.add('kakao'); MapView = KView; }
  else { S.mapMode = 'svg'; MapView = SView; }
  MapView.init(); renderMapChips();
  const setV = (k) => { MapView.setView(k); ['cand', 'js', 'all'].forEach((x) => $('#v' + { cand: 'Cand', js: 'Js', all: 'All' }[x]).classList.toggle('on', x === k)); };
  $('#vCand').onclick = () => setV('cand'); $('#vJs').onclick = () => setV('js'); $('#vAll').onclick = () => setV('all');
  $('#zIn').onclick = () => (S.mapMode === 'svg' ? SView.zoom(1 / 1.6) : KView.zoom(-1));
  $('#zOut').onclick = () => (S.mapMode === 'svg' ? SView.zoom(1.6) : KView.zoom(1));
  if (S.mapMode === 'kakao') {
    // 고정 후보 위치 바로잡기 + 목록 단지 위치 찾기(한 번 찾으면 이 기기에 저장)
    await pool(APTS, 2, async (a) => { const g = await Geo.locate(a); if (g) { a.lat = g[0]; a.lng = g[1]; } });
    if (S.slot4) { await Geo.locate(S.slot4); S.slot4 = makeSlot4(data.cx.find((c) => c.n === S.sel4)); }
    MapView.drawApts();
    geoQueue();
  }
}
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
main().catch((e) => { console.error(e); $('#mapMsg').textContent = '자료를 불러오지 못했어요: ' + e.message; });
