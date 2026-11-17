"""분양시장 레이더(New-Build_Rader)의 국토부 실거래 캐시(cache/rt)에서
부천시 아파트 단지별 요약을 만들어 data/bucheon.json 으로 저장합니다.
사용법: python3 scripts/build_data.py <레이더 저장소 경로>
"""
import json, os, sys, glob

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
rows.sort(key=lambda r: -(r['n12'] or 0))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf-8') as fh:
    json.dump({'asOf': months[-1], 'from': months[0], 'quarters': quarters, 'src': '국토교통부 아파트 매매 실거래가 (분양시장 레이더 수집)',
               'cx': rows}, fh, ensure_ascii=False, separators=(',', ':'))
print(f'{len(rows)}개 단지 · {months[0]}~{months[-1]} → {os.path.normpath(OUT)}')
