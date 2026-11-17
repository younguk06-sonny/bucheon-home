"""국토부 공동주택관리정보시스템(K-apt) 공공데이터로 부천 아파트 단지 정보를 받아 data/kapt.json 으로 저장합니다.
  - 세대수·동수·사용승인일·시공사·최고층·난방·주차·지하철 노선/역·지하철역/버스정류장까지 도보 시간
필요: 공공데이터포털(data.go.kr) 인증키를 환경변수 DATA_GO_KR_KEY 로 (GitHub 저장소 Secrets에 같은 이름으로 넣음)
      활용신청할 서비스: '국토교통부_공동주택 단지 목록제공 서비스', '국토교통부_공동주택 기본 정보제공 서비스'
키가 없거나 요청이 실패하면 기존 data/kapt.json 을 그대로 둡니다.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

KEY = os.environ.get('DATA_GO_KR_KEY', '').strip()
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'kapt.json')
SGG = ['41192', '41194', '41196', '41190']   # 원미구·소사구·오정구 (구 부천시 코드도 함께 시도)
LIST = 'https://apis.data.go.kr/1613000/AptListService3/getSigunguAptList3'
BASIS = 'https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusBassInfoV4'
DTL = 'https://apis.data.go.kr/1613000/AptBasisInfoServiceV4/getAphusDtlInfoV4'


def call(url, **params):
    q = urllib.parse.urlencode(params)
    full = f"{url}?serviceKey={KEY if '%' in KEY else urllib.parse.quote(KEY, safe='')}&{q}"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(full, timeout=30) as r:
                text = r.read().decode('utf-8', 'replace')
            return parse(text)
        except Exception as e:  # noqa
            if attempt == 2:
                print('  요청 실패:', url.rsplit('/', 1)[-1], params, e)
                return None
            time.sleep(1.5)


def parse(text):
    """JSON이면 JSON으로, 아니면 XML 태그를 dict로."""
    t = text.strip()
    if t.startswith('{'):
        j = json.loads(t)
        body = j.get('response', {}).get('body', {})
        items = body.get('items')
        if isinstance(items, dict):
            items = items.get('item', [])
        if isinstance(items, dict):
            items = [items]
        if items is None and 'item' in body:
            items = body['item'] if isinstance(body['item'], list) else [body['item']]
        return {'items': items or [], 'total': int(body.get('totalCount') or 0)}
    if re.search(r'SERVICE_KEY|SERVICE ACCESS DENIED|LIMITED_NUMBER|등록되지 않은', t):
        raise RuntimeError('인증키 오류: ' + t[:200])
    items = []
    for block in re.findall(r'<item>(.*?)</item>', t, re.S):
        items.append({k: v.strip() for k, v in re.findall(r'<(\w+)>(.*?)</\1>', block, re.S)})
    m = re.search(r'<totalCount>(\d+)</totalCount>', t)
    return {'items': items, 'total': int(m.group(1)) if m else len(items)}


def main():
    if not KEY:
        print('DATA_GO_KR_KEY 가 없어 K-apt 자료를 건너뜁니다 (기존 data/kapt.json 유지).')
        return
    seen = {}
    for sgg in SGG:
        page = 1
        while True:
            r = call(LIST, sigunguCode=sgg, pageNo=page, numOfRows=1000)
            if not r or not r['items']:
                break
            for it in r['items']:
                if it.get('kaptCode'):
                    seen[it['kaptCode']] = it
            if page * 1000 >= (r['total'] or 0):
                break
            page += 1
    print(f'K-apt 단지 목록: {len(seen)}곳')
    if not seen:
        print('목록을 받지 못해 기존 자료를 유지합니다. (서비스 활용신청 여부를 확인하세요)')
        return
    out = []
    for i, (code, it) in enumerate(seen.items()):
        b = (call(BASIS, kaptCode=code) or {}).get('items') or [{}]
        d = (call(DTL, kaptCode=code) or {}).get('items') or [{}]
        b, d = b[0] if isinstance(b, list) else b, d[0] if isinstance(d, list) else d
        num = lambda v: int(float(v)) if str(v or '').strip() not in ('', 'None') else None
        out.append({
            'code': code, 'name': it.get('kaptName') or b.get('kaptName'), 'dong': it.get('as3') or '',
            'addr': b.get('doroJuso') or b.get('kaptAddr') or '',
            'hh': num(b.get('kaptdaCnt')), 'dongs': num(b.get('kaptDongCnt')), 'use': b.get('kaptUsedate') or '',
            'builder': b.get('kaptBcompany') or '', 'top': num(b.get('kaptTopFloor')), 'heat': b.get('codeHeatNm') or '',
            'park': (num(d.get('kaptdPcnt')) or 0) + (num(d.get('kaptdPcntu')) or 0) or None,
            'line': d.get('subwayLine') or '', 'station': d.get('subwayStation') or '',
            'wsub': d.get('kaptdWtimesub') or '', 'wbus': d.get('kaptdWtimebus') or '',
        })
        if (i + 1) % 50 == 0:
            print(f'  {i + 1}/{len(seen)}')
        time.sleep(0.05)
    with open(OUT, 'w', encoding='utf-8') as fh:
        json.dump({'asOf': time.strftime('%Y-%m-%d'), 'src': '국토교통부 공동주택관리정보시스템(K-apt)', 'apts': out}, fh, ensure_ascii=False, separators=(',', ':'))
    print(f'K-apt 단지 정보 {len(out)}곳 → data/kapt.json')


if __name__ == '__main__':
    try:
        main()
    except Exception as e:  # 실패해도 배포는 계속
        print('K-apt 자료 받기 실패:', e)
        sys.exit(0)
