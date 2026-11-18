"""학교알리미 OpenAPI로 부천 초등학교의 위치와 학년별 학생수·학급수를 받아 data/schools.json 으로 저장합니다.
필요: 환경변수 SCHOOLINFO_API_KEY (학교알리미 OpenAPI 인증키, 무료·즉시 발급:
      https://www.schoolinfo.go.kr/ng/go/pnnggo_a01_m0.do → 로그인 → OpenAPI 인증키 신청)
키가 없거나 실패하면 기존 data/schools.json 을 그대로 둡니다.
"""
import json, os, sys, time, urllib.parse, urllib.request

KEY = os.environ.get('SCHOOLINFO_API_KEY', '').strip()
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'schools.json')
URLS = ['https://www.schoolinfo.go.kr/openApi.do', 'http://www.schoolinfo.go.kr/openApi.do', 'https://schoolinfo.go.kr/openApi.do']
SIDO, SGGS = '41', ['41192', '41194', '41196']   # 경기도 부천시 원미구·소사구·오정구


def call(api_type, sgg, year=None):
    q = {'apiKey': KEY, 'apiType': api_type, 'sidoCode': SIDO, 'sggCode': sgg, 'schulKndCode': '02'}
    if year:
        q['pbanYr'] = str(year)
    last = None
    for a in range(4):
        url = URLS[a % len(URLS)] + '?' + urllib.parse.urlencode(q)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (bucheon-home)', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=60) as r:
                j = json.loads(r.read().decode('utf-8', 'replace'))
            if j.get('resultCode') != 'success':
                msg = j.get('resultMsg')
                if 'apiKey' in str(msg):
                    print('  인증키 오류:', msg); return None
                raise RuntimeError(msg)
            return j.get('list') or []
        except Exception as e:
            last = e; time.sleep(3)
    print('  실패', api_type, sgg, year, last); return None


def num(v):
    try:
        return int(float(str(v).replace(',', '')))
    except Exception:
        return None


def main():
    if not KEY:
        print('SCHOOLINFO_API_KEY 가 없어 초등학교 학생수를 건너뜁니다.'); return
    schools = {}
    for sgg in SGGS:
        for r in call('0', sgg) or []:
            if str(r.get('ABSCH_YN', 'N')).upper() == 'Y':
                continue
            schools[r['SCHUL_CODE']] = {'code': r['SCHUL_CODE'], 'name': r.get('SCHUL_NM'), 'addr': (r.get('SCHUL_RDNMA') or r.get('ADRES_BRKDN') or '').strip(),
                                        'lat': float(r['LTTUD']) if r.get('LTTUD') else None, 'lng': float(r['LGTUD']) if r.get('LGTUD') else None}
    print(f'부천 초등학교 {len(schools)}곳')
    if not schools:
        return
    year_now = time.localtime().tm_year
    used_year = None
    for year in (year_now, year_now - 1):
        got = 0
        for sgg in SGGS:
            for r in call('09', sgg, year) or []:
                s = schools.get(r.get('SCHUL_CODE'))
                if not s:
                    continue
                st = [num(r.get(f'COL_S{g}')) for g in range(1, 7)]
                if not any(st):
                    continue
                s['s'] = st
                s['c'] = [num(r.get(f'COL_C{g}')) for g in range(1, 7)]
                s['total'] = num(r.get('COL_S_SUM')) or num(r.get('COL_SUM_S1'))
                s['perClass'] = r.get('COL_SUM') or r.get('COL_SUM_1')
                got += 1
        if got:
            used_year = year; print(f'{year}년 공시 학년별 학생수: {got}곳'); break
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump({'year': used_year, 'src': '학교알리미 (학년별·학급별 학생수, 매년 4월 1일 기준)', 'schools': list(schools.values())}, fh, ensure_ascii=False, separators=(',', ':'))
    print('→ data/schools.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('초등학교 자료 받기 실패:', e); sys.exit(0)
