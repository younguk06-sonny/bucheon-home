"""분양시장 레이더(New-Build_Rader)의 국토부 실거래 캐시(cache/rt)에서
부천시 아파트 단지별 요약을 만들어 data/bucheon.json 으로 저장합니다.
사용법: python3 scripts/build_data.py <레이더 저장소 경로>
"""
import json, os, re, sys, glob

SRC = sys.argv[1] if len(sys.argv) > 1 else '_src'
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'bucheon.json')
CODES = ('41192', '41194', '41196')   # 부천시 원미구·소사구·오정구 (부천 전체)
PY = 3.3058

files = sorted(glob.glob(os.path.join(SRC, 'cache', 'rt', '[0-9]' * 6 + '.json')))
if not files:
    sys.exit('실거래 캐시가 없습니다: ' + SRC)
months = [os.path.basename(f)[:6] for f in files]
last12 = set(months[-12:])
q_of = lambda m: f"{m[:4]}Q{(int(m[4:]) - 1) // 3 + 1}"
quarters = list(dict.fromkeys(q_of(m) for m in months))[-12:]

acc = {}
for m, f in zip(months, files):
    with open(f, encoding='utf-8') as fh:
        store = json.load(fh)
    parts = [p for code in CODES for p in (store.get(code) or {}).get('parts', {}).values()]
    for part in parts:
        for k, (by, cnt, mp, ma) in part.get('c', {}).items():
            apt, dong = k.split('|')
            c = acc.setdefault(k, {'apt': apt, 'dong': dong, 'by': by, 'm': {}, 'd': []})
            if by and not c['by']:
                c['by'] = by
            c['m'][m] = (cnt, mp, ma)
        for x in part.get('d', []):  # [일, 단지, 동, 전용, 층, 금액, 준공]
            k = x[1] + '|' + x[2]
            if k in acc:
                acc[k]['d'].append([m + str(x[0]).zfill(2), x[3], x[4], x[5]])

def wavg(ms, idx):
    n = sum(acc_m[m][0] for m in ms)
    return (sum(acc_m[m][0] * acc_m[m][idx] for m in ms) / n) if n else None

rows = []
for k, c in acc.items():
    acc_m = c['m']
    ms12 = [m for m in acc_m if m in last12]
    n12 = sum(acc_m[m][0] for m in ms12)
    n36 = sum(v[0] for v in acc_m.values())
    amt12 = wavg(ms12, 2) if ms12 else None
    mp12 = wavg(ms12, 1) if ms12 else None
    allm = list(acc_m)
    amt36, mp36 = wavg(allm, 2), wavg(allm, 1)
    amt, mp = (amt12, mp12) if n12 >= 2 else (amt36, mp36)   # 12개월 거래가 1건 이하면 36개월로
    years = {}
    for y in sorted({m[:4] for m in allm}):
        ym = [m for m in allm if m.startswith(y)]
        if len([m for m in months if m.startswith(y)]) >= 3:   # 자료가 3개월 미만인 해는 뺌
            years[y] = round(wavg(ym, 2))
    qs = []
    for q in quarters:
        qm = [m for m in allm if q_of(m) == q]
        qs.append(round(wavg(qm, 1) / 10 * PY) if qm else None)
    lm = max(allm)
    deals = sorted(c['d'], key=lambda x: x[0], reverse=True)[:6]
    rows.append({
        'n': c['apt'], 'dong': c['dong'], 'by': c['by'],
        'n12': n12, 'n36': n36,
        'amt': round(amt) if amt else None,            # 대표 거래가(만원): 월별 거래가 중위값의 거래량 가중평균
        'py': round(mp / 10 * PY) if mp else None,     # 평당가(만원/전용평)
        'area': round(amt / (mp / 10), 1) if amt and mp else None,  # 대표 전용면적(㎡) 추정
        'yr': years, 'q': qs, 'last': [lm, acc_m[lm][2], acc_m[lm][0]], 'deals': deals,
    })
# ---------- K-apt 단지 정보 덧붙이기 (data/kapt.json 이 있을 때) ----------
KAPT = os.path.join(os.path.dirname(__file__), '..', 'data', 'kapt.json')
WALK = {'5분이내': 5, '5~10분이내': 10, '10~15분이내': 15, '15~20분이내': 20, '20분초과': 25}
def norm(n, dong=''):
    n = re.sub(r'\(.*?\)', lambda m: m.group(0)[1:-1], n or '')
    n = re.sub(r'[\s·,.\-]|아파트|APT', '', n, flags=re.I)
    if dong:
        n = n.replace(dong, '').replace(dong.rstrip('동'), '', 1) if n.startswith(dong) or n.startswith(dong.rstrip('동')) else n
    return n.replace('부천', '')
def bigr(s):
    return {s[i:i + 2] for i in range(len(s) - 1)} or {s}
def score(a, b):
    if not a or not b:
        return 0
    if a == b:
        return 1
    da, db = re.findall(r'\d+', a), re.findall(r'\d+', b)
    if (da or db) and da != db:   # 1단지·2단지처럼 숫자가 다르면 다른 단지
        return 0
    short, long_ = sorted((a, b), key=len)
    if short in long_ and len(short) / len(long_) >= 0.6:
        return 0.9
    x, y = bigr(a), bigr(b)
    return len(x & y) / len(x | y)
kapt_asof = None
if os.path.exists(KAPT):
    with open(KAPT, encoding='utf-8') as fh:
        kj = json.load(fh)
    kapt_asof = kj.get('asOf')
    by_dong = {}
    for k in kj.get('apts', []):
        dong = re.sub(r'\d+동$', '동', (k.get('dong') or '').strip()) or ''
        k['_n'] = norm(k.get('name'), dong)
        by_dong.setdefault(dong, []).append(k)
    pairs = []
    for i, r in enumerate(rows):
        rn = norm(r['n'], r['dong'])
        for j, k in enumerate(by_dong.get(r['dong'], [])):
            sc = score(rn, k['_n'])
            if sc >= 0.55:
                pairs.append((sc, i, id(k), k))
    pairs.sort(key=lambda x: -x[0])
    used_r, used_k, hit = set(), set(), 0
    for sc, i, kid, best in pairs:   # 점수 높은 짝부터 하나씩 (한 단지에 하나만)
        if i in used_r or kid in used_k:
            continue
        used_r.add(i); used_k.add(kid); r = rows[i]
        if True:
            hit += 1
            r['k'] = {key: best.get(key) for key in ('name', 'hh', 'dongs', 'use', 'builder', 'top', 'heat', 'park', 'line', 'station', 'wsub', 'wbus', 'addr') if best.get(key) not in (None, '')}
            if best.get('wsub') in WALK:
                r['k']['wmin'] = WALK[best['wsub']]
    print(f'K-apt 연결: {hit}/{len(rows)}개 단지')
    left = [k for ks in by_dong.values() for k in ks if id(k) not in used_k]
    print(f'연결 안 된 K-apt 단지 {len(left)}곳:')
    for k in left:
        cand = [r for i, r in enumerate(rows) if i not in used_r and r['dong'] == re.sub(r'\d+동$', '동', (k.get('dong') or '').strip())]
        cand.sort(key=lambda r: -score(norm(r['n'], r['dong']), k['_n']))
        print('  K:', k.get('name'), '|', k.get('dong'), '| hh', k.get('hh'), '→ 후보:', [(r['n'], round(score(norm(r['n'], r['dong']), k['_n']), 2)) for r in cand[:3]])

# ---------- 타입(전용면적)별 거래 ----------
TYPES = os.path.join(os.path.dirname(__file__), '..', 'data', 'types.json')
types_src = None
if os.path.exists(TYPES):
    with open(TYPES, encoding='utf-8') as fh:
        tj = json.load(fh)
    types_src = 'full:' + tj.get('asOf', '')
    for r in rows:
        t = tj['t'].get(r['n'] + '|' + r['dong'])
        if t:
            r['t'] = [x for x in t if x[1] >= 1]
if not types_src:   # 원자료가 없으면 레이더 캐시에 있는 일부 거래로 타입만 추림
    types_src = 'sample'
    for k, c in acc.items():
        r = next((x for x in rows if x['n'] == c['apt'] and x['dong'] == c['dong']), None)
        if not r or not c['d']: continue
        g = {}
        for d in c['d']:   # [날짜, 전용, 층, 금액]
            a = round(d[1], 2); t = g.setdefault(a, {'n': 0, 'n12': 0, 's12': 0, 'last': '', 'max': 0})
            t['n'] += 1
            if d[0][:6] in last12: t['n12'] += 1; t['s12'] += d[3]
            if d[0] >= t['last']: t['last'] = d[0]; t['lastFl'] = str(d[2]); t['lastAmt'] = d[3]
            if d[3] > t['max']: t['max'] = d[3]; t['maxD'] = d[0]
        r['t'] = [[a, t['n'], t['n12'], round(t['s12'] / t['n12']) if t['n12'] else None, t['last'], t.get('lastFl'), t.get('lastAmt'), t['max'], t.get('maxD')] for a, t in sorted(g.items())]
print('타입 자료:', types_src)

rows.sort(key=lambda r: -(r['n12'] or 0))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as fh:
    json.dump({'asOf': months[-1], 'from': months[0], 'quarters': quarters, 'src': '국토교통부 아파트 매매 실거래가 (분양시장 레이더 수집)', 'kaptAsOf': kapt_asof, 'typesSrc': types_src,
               'cx': rows}, fh, ensure_ascii=False, separators=(',', ':'))
print(f'{len(rows)}개 단지 · {months[0]}~{months[-1]} → {os.path.normpath(OUT)}')
