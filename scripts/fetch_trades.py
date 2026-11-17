"""국토부 아파트 매매 실거래가 원자료(공공데이터포털)로 부천 단지별·전용면적(타입)별 거래를 모아 data/types.json 으로 저장합니다.
분양시장 레이더 캐시에는 면적별 내역이 일부만 있어서, 타입별 시세는 이 원자료로 만듭니다.
필요: 환경변수 DATA_GO_KR_KEY (분양시장 레이더와 같은 인증키, '국토교통부_아파트 매매 실거래가 자료' 활용신청 필요)
키가 없거나 실패하면 아무것도 바꾸지 않습니다.
"""
import json, os, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from fetch_kapt import parse  # JSON/XML 공용 파서

KEY = os.environ.get('DATA_GO_KR_KEY', '').strip()
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'types.json')
URL = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade'
CODES = ['41192', '41194', '41196']
MONTHS = int(os.environ.get('TRADE_MONTHS', '36'))


def months_back(n):
    t = time.localtime(); y, m = t.tm_year, t.tm_mon
    out = []
    for _ in range(n):
        out.append(f'{y}{m:02d}'); m -= 1
        if m == 0: y, m = y - 1, 12
    return out


def get(code, ym, page):
    key = KEY if '%' in KEY else urllib.parse.quote(KEY, safe='')
    url = f'{URL}?serviceKey={key}&LAWD_CD={code}&DEAL_YMD={ym}&pageNo={page}&numOfRows=1000'
    for a in range(3):
        try:
            with urllib.request.urlopen(url, timeout=40) as r:
                return parse(r.read().decode('utf-8', 'replace'))
        except Exception as e:
            if a == 2:
                print('  실패', code, ym, e); return None
            time.sleep(2)


def main():
    if not KEY:
        print('DATA_GO_KR_KEY 가 없어 타입별 실거래를 건너뜁니다.'); return
    yms = months_back(MONTHS); last12 = set(yms[:12])
    agg = {}  # 단지|동 -> 전용 -> 집계
    n = 0
    for code in CODES:
        for ym in yms:
            page = 1
            while True:
                r = get(code, ym, page)
                if not r or not r['items']: break
                for it in r['items']:
                    if str(it.get('cdealType') or '').strip() in ('O', 'o'): continue  # 해제된 거래 제외
                    try:
                        area = round(float(it.get('excluUseAr')), 2)
                        amt = int(str(it.get('dealAmount')).replace(',', '').strip())
                    except Exception:
                        continue
                    k = f"{str(it.get('aptNm')).strip()}|{str(it.get('umdNm')).strip()}"
                    d = f"{it.get('dealYear')}{int(it.get('dealMonth')):02d}{int(it.get('dealDay')):02d}"
                    t = agg.setdefault(k, {}).setdefault(f'{area:.2f}', {'n': 0, 'n12': 0, 's12': 0, 'last': '', 'max': 0})
                    t['n'] += 1; n += 1
                    if ym in last12: t['n12'] += 1; t['s12'] += amt
                    if d >= t['last']: t['last'] = d; t['lastAmt'] = amt; t['lastFl'] = str(it.get('floor') or '').strip()
                    if amt > t['max']: t['max'] = amt; t['maxD'] = d
                if page * 1000 >= (r['total'] or 0): break
                page += 1
            time.sleep(0.05)
    if not n:
        print('거래를 받지 못해 기존 자료를 유지합니다.'); return
    out = {}
    for k, types in agg.items():
        rows = []
        for a, t in sorted(types.items(), key=lambda x: float(x[0])):
            rows.append([float(a), t['n'], t['n12'], round(t['s12'] / t['n12']) if t['n12'] else None, t['last'], t.get('lastFl'), t.get('lastAmt'), t['max'], t.get('maxD')])
        out[k] = rows
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump({'asOf': yms[0], 'months': MONTHS, 'cols': ['전용㎡', '36개월 건수', '12개월 건수', '12개월 평균(만원)', '마지막 거래일', '층', '마지막 거래가(만원)', '최고가(만원)', '최고가 날짜'], 't': out}, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'타입별 실거래: {n}건 · {len(out)}개 단지 → data/types.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('타입별 실거래 받기 실패:', e); sys.exit(0)
