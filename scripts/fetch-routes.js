// 개발 전용 1회성 스크립트: data/mock.ts의 mockCourses 좌표를 실제 도로 기반 경로로 교체한다.
//
// OSRM 공개 데모 서버(router.project-osrm.org)는 프로토타입/개발용이며,
// 실제 서비스 운영 시에는 자체 호스팅 OSRM 또는 유료 라우팅 서비스로 반드시 교체해야 한다.
//
// 실행: node scripts/fetch-routes.js
// 앱 실행 중에는 네트워크 호출이 전혀 없다 — 이 스크립트가 만든 결과가 data/mock.ts에 그대로 하드코딩된다.

const fs = require('fs');
const path = require('path');

const MOCK_FILE = path.join(__dirname, '..', 'data', 'mock.ts');
const OSRM_BASE = 'https://router.project-osrm.org/route/v1/foot';
const SAMPLE_MIN = 30; // 목표 포인트 수 하한
const SAMPLE_MAX = 50; // 목표 포인트 수 상한
const REQUEST_DELAY_MS = 300; // 공개 데모 서버 예의상 요청 간 지연

// data/mock.ts에 현재 하드코딩되어 있던 코스별 원본 waypoint (도형 형태).
// mock.ts를 직접 import하지 않는 이유: '@/...' 경로 별칭이 plain Node에서 해석되지 않기 때문.
// 아래 waypoint들은 (1) 코스 이름이 가리키는 실제 지형(공원/둘레길처럼 루프형인지,
// 하천/강변처럼 선형인지)을 판단하고 (2) 각 코스의 기존(장식용) waypoint가 차지하던
// 대략적 위치·반경을 유지한 채로, 소수의 실제 도로 위 지점만 남기고
// (3) OSRM 응답 거리가 distanceKm 라벨에 가깝게 수렴할 때까지 반복 조정해서 구했다.
// 자세한 산출 과정은 PR 설명/커밋 참고. 점 개수를 줄인 이유는 촘촘한 장식용 다각형
// waypoint를 그대로 두면 OSRM이 각 점을 순서대로 반드시 통과해야 해서, 점들 사이를
// 실제 도로로 연결하더라도 전체 윤곽선은 원래의 별/도형 모양을 그대로 물려받기 때문이다.
const COURSE_WAYPOINTS = {
  // 공원 루프: 원래 waypoint들이 차지하던 대각선 범위를 감싸는 사각형 루프로 축소.
  // 남서쪽 모서리(37.5513,126.9265)가 와우산로의 막다른 지선에 스냅되어 OSRM이
  // 그 지점까지 들어갔다가 그대로 되돌아오는 유턴이 발생해, 실제 관통로인
  // 와우산로 본선 위 지점(126.9285)으로 옮기고, 시작/종료점도 인접한 교차로 구간의
  // 겹치는 급회전(약 150°)을 피해 남쪽으로 소폭 이동.
  'course-1': [
    { latitude: 37.5495, longitude: 126.9165 },
    { latitude: 37.5577, longitude: 126.9165 },
    { latitude: 37.5577, longitude: 126.9265 },
    { latitude: 37.5513, longitude: 126.9285 },
    { latitude: 37.5495, longitude: 126.9165 },
  ],
  // 경의선숲길(Gyeongui Line Forest Park)의 실제 구간 양 끝점.
  // OSM relation 8616724 조회 + Overpass로 확인한 공원 경계 좌표를 바탕으로,
  // 연남동 쪽 끝(서북단)과 대흥동 쪽 끝(동남단)만 waypoint로 사용해 OSRM이
  // 그 사이 실제 도로/보행로를 직접 찾도록 함 (기존의 장식용 원형 waypoint 13개 제거).
  'course-2': [
    { latitude: 37.567, longitude: 126.9182 },
    { latitude: 37.5493, longitude: 126.9384 },
  ],
  // 강변(반포 한강공원) 선형 코스: 왕복(out-and-back).
  // (자기교차 재검증) 위 3-waypoint(출발→도착→출발) 왕복 요청을 그대로 쓰면, 반포 한강공원의
  // 자전거도로/보행로가 분리돼 있어 OSRM이 왕복 양쪽 다리를 서로 다른 도로로 잡아 자기교차가
  // 발생했다. 이 파이프라인(3-waypoint 왕복 요청)으로는 재현이 안 되는 문제라 course-3은
  // COURSE_WAYPOINTS에서 제외하고, 편도 한 번만 OSRM으로 받은 뒤(출발 37.508,126.9883 → 도착
  // 37.51,127.0067) 그 결과를 정확히 반전(reverse)해 복귀 구간을 만드는 방식으로 mock.ts에
  // 직접 반영했다(왕복 경로가 항상 완전히 겹치므로 자기교차가 구조적으로 불가능해짐).
  // 실거리가 5.6km로 기존 라벨(7.0km)보다 크게 줄어 distanceKm도 함께 갱신.
  // 'course-3': [
  //   { latitude: 37.508, longitude: 126.9883 },
  //   { latitude: 37.51, longitude: 127.0067 },
  //   { latitude: 37.508, longitude: 126.9883 },
  // ],
  // 하천(안양천) 선형 코스: 왕복.
  // 기존 종점(37.5354,126.8971)이 선유로 본선에서 살짝 벗어나 있어, OSRM이 100m
  // 오버슈트한 뒤 그대로 되돌아오는 유턴이 발생했다. 종점을 선유로 본선 위
  // 지점(37.5359,126.8979)으로 옮겨 해소.
  // (자기교차 재검증) course-3과 동일한 이유(3-waypoint 왕복 요청의 왕/복 비대칭)로 자기교차가
  // 발생해, COURSE_WAYPOINTS에서 제외하고 편도 OSRM + 정확한 역순 미러링으로 mock.ts에 직접
  // 반영. 실거리 5.6km로 기존 라벨과 거의 동일해 distanceKm 유지.
  // 'course-4': [
  //   { latitude: 37.5181, longitude: 126.8934 },
  //   { latitude: 37.5359, longitude: 126.8979 },
  //   { latitude: 37.5181, longitude: 126.8934 },
  // ],
  // 보라매공원 루프: Nominatim으로 확인한 실제 공원 경계(37.4903~37.4962, 126.9159~126.9261)
  // 안쪽에 루프를 두면 OSRM이 매번 공원 외곽 실제 순환로로 라우팅하는 것을 확인함.
  // 그 결과 실제 거리가 기존 라벨(4.0km)보다 커서 distanceKm도 함께 갱신 필요.
  // 북서쪽 모서리(37.495315,126.91743)가 막다른 지점이라 완전히 되돌아오는 유턴이
  // 발생해, 여의대방로20길 본선 위 지점(37.4958,126.9178)으로 이동해 해소.
  'course-5': [
    { latitude: 37.491185, longitude: 126.91743 },
    { latitude: 37.4958, longitude: 126.9178 },
    { latitude: 37.495315, longitude: 126.92457 },
    { latitude: 37.491185, longitude: 126.92457 },
    { latitude: 37.491185, longitude: 126.91743 },
  ],
  // 연남동 경의선 확장코스: course-2와 마찬가지로 선형 구간이라 양 끝점만 사용(편도).
  'course-6': [
    { latitude: 37.5698, longitude: 126.9285 },
    { latitude: 37.5576, longitude: 126.9399 },
  ],
  // 강변(망원한강공원) 루프. 기존 사각형은 북쪽 모서리가 막다른 골목에 물려 유턴이
  // 2회 발생하고, 동쪽 변은 성산로(간선도로) 횡단 지점이 안 맞아 중앙분리대를 따라
  // 되돌아오는 유턴이 발생했다. 루프 전체를 관통로 위주로 재배치해 유턴 없이
  // 닫히는 형태로 조정(반복 시행착오로 확인).
  // (2차 검증) 재검증 결과 북동쪽 모서리(37.5592,126.946)가 여전히 막다른 골목
  // 안쪽이라, 이화여대7길 구간을 왕복하며 두 번 지나가는 배회가 남아있었다.
  // 해당 모서리를 관통로 위 지점(37.5585,126.9445)으로 옮겨 완전히 해소.
  'course-7': [
    { latitude: 37.553, longitude: 126.9365 },
    { latitude: 37.5592, longitude: 126.9365 },
    { latitude: 37.5585, longitude: 126.9445 },
    { latitude: 37.553, longitude: 126.946 },
    { latitude: 37.553, longitude: 126.9365 },
  ],
  // 골목길 루프. 남동쪽 모서리가 막다른 골목 안쪽에 물려 왕복 유턴이 발생해,
  // 인접한 관통 골목 위 지점으로 옮겨 해소.
  // (2차 검증) 기존 사각형의 북동쪽 구간(37.5616,126.9443)~(37.5616,126.9473)이
  // 실제로는 도로망이 끊긴 고립 지역이라, 성산로를 통한 큰 우회 후 같은 교차로를
  // 3번이나 지나가는 배회가 남아있었다. Overpass 도로 그래프 분석으로 실제
  // 연결된 도로만으로 닫히는 더 작은 루프를 다시 설계(북동쪽 고립 구간 전체 제외).
  // 거리가 기존 라벨(3.0km)보다 크게 줄어드는데, 이 지역 도로망 제약상 이보다
  // 긴 루프를 만들면 반드시 같은 길을 되짚거나 자기교차가 생기므로 자연스러운
  // 루프를 우선했다.
  // (3차 검증/자기교차) 위 3점 삼각형 루프를 OSRM으로 실제 라우팅하면 왕/복 두 구간이
  // "이화여대길" 구간을 공유해 자기교차가 발생했다. 시작점을 세 꼭짓점 중 어느 것으로
  // 바꿔 돌려도(3가지 회전 모두 시도) 동일하게 재발 — 도로망 구조상 이 세 점으로는
  // 자기교차 없는 순수 루프가 불가능하다고 판단, course-15와 동일하게 왕복(out-and-back)
  // 으로 전환했다. 세 변 중 가장 긴 두 번째·세 번째 꼭짓점 사이(0.86km 편도)만 남기고
  // COURSE_WAYPOINTS에서 제외, 편도 OSRM + 정확한 역순 미러링으로 mock.ts에 직접 반영.
  // 실거리 1.7km로 기존 라벨(1.6km)과 큰 차이 없어 유지.
  // 'course-8': [
  //   { latitude: 37.5592, longitude: 126.9443 },
  //   { latitude: 37.5586, longitude: 126.9463 },
  //   { latitude: 37.5558, longitude: 126.9455 },
  //   { latitude: 37.5592, longitude: 126.9443 },
  // ],
  // 월드컵공원 둘레길 루프. 남동쪽 모서리가 막다른 골목 안쪽이라 완전히 되돌아오는
  // 유턴이 발생해, 백범로 본선 위 지점으로 옮겨 해소.
  'course-9': [
    { latitude: 37.5473, longitude: 126.94038 },
    { latitude: 37.5557, longitude: 126.94038 },
    { latitude: 37.5557, longitude: 126.94962 },
    { latitude: 37.5445, longitude: 126.949 },
    { latitude: 37.5473, longitude: 126.94038 },
  ],
  // 홍제천 산책로: 원래 waypoint가 상류 지점을 찍고 거의 원점으로 돌아오는 형태였으므로
  // 그 왕복 구조를 그대로 살려 두 지점 사이 왕복으로 단순화.
  // 왕복 자체는 규칙상 허용되지만, 원래 상류 지점(37.55195,126.9386)이 백범로
  // 중앙분리대 횡단 지점과 맞지 않아 편도 구간 중간에 불필요한 유턴이 한 번 더
  // 발생했다. 상류 지점을 조금 당겨 그 유턴을 제거.
  // (자기교차 재검증) course-3/4와 동일한 3-waypoint 왕복 비대칭 문제가 있어 COURSE_WAYPOINTS
  // 에서 제외하고 편도 OSRM + 정확한 역순 미러링으로 mock.ts에 직접 반영. 실거리 4.0km로
  // 기존 라벨(3.8km)과 5% 이내라 유지.
  // 'course-10': [
  //   { latitude: 37.54215, longitude: 126.933 },
  //   { latitude: 37.555, longitude: 126.9383 },
  //   { latitude: 37.54215, longitude: 126.933 },
  // ],
  // 연희동 둘레길 루프.
  'course-11': [
    { latitude: 37.5467, longitude: 126.9197 },
    { latitude: 37.5537, longitude: 126.9197 },
    { latitude: 37.5537, longitude: 126.9287 },
    { latitude: 37.5467, longitude: 126.9287 },
    { latitude: 37.5467, longitude: 126.9197 },
  ],
  // 가좌역 코스(공원) 루프. 북동쪽 모서리 부근에서 월드컵북로12길/12안길 쪽
  // 막다른 구간을 찍고 그대로 되돌아오는 구간이 있어, 모서리를 관통로 위로 당겨 해소.
  'course-12': [
    { latitude: 37.5565, longitude: 126.9065 },
    { latitude: 37.5635, longitude: 126.9065 },
    { latitude: 37.5635, longitude: 126.9135 },
    { latitude: 37.5565, longitude: 126.9145 },
    { latitude: 37.5565, longitude: 126.9065 },
  ],
  // 서강대교 남단(강변) 선형 코스: 왕복.
  // (자기교차 재검증) course-3/4/10과 동일한 3-waypoint 왕복 비대칭 문제(최대 61m 어긋남)가
  // 있어 COURSE_WAYPOINTS에서 제외하고 편도 OSRM + 정확한 역순 미러링으로 mock.ts에 직접
  // 반영. 실거리 6.6km로 기존 라벨(6.8km)과 3% 이내라 유지.
  // 'course-13': [
  //   { latitude: 37.5682, longitude: 126.9162 },
  //   { latitude: 37.5864, longitude: 126.9098 },
  //   { latitude: 37.5682, longitude: 126.9162 },
  // ],
  // 신수동 골목길 코스. 원래 waypoint가 같은 교차로(37.5532,126.9372 부근)를 두 번 지나가는
  // 부분 8자형이라 idx13에서 178° 급회전(재통과)이 발생했다. 8자형을 이루던 곁가지를 걷어내고
  // 신수동 골목 전체를 감싸는 단일 루프로 재설계. 사각형의 남서쪽 모서리로 썼던 지점
  // (37.4890,126.9358 인근)이 막다른 골목이라 그 지점에서 그대로 되돌아오는 유턴(179°)이
  // 발생해 해당 모서리를 제거하고 4개 지점만으로 재구성했다.
  // (3차 검증) analyze-routes.js의 edge-재사용/급회전 검사는 통과했지만, 좌표를 직접 투영해
  // 자기교차(비인접 구간끼리 겹침) 여부를 계산해보니 3번째 waypoint(37.550945,126.939423)가
  // 좁은 골목 안쪽이라 그 지점에 도달/이탈하는 두 구간이 폭 3~10m 정도의 거의 같은 통로를
  // 반대 방향으로 지나가는 8자 매듭이 있었다. 해당 지점을 관통로 위(37.551094,126.938812)로
  // 옮겨봤지만, 실제 도로망상 그 지점 역시 같은 폭 좁은 통로를 통해서만 접근 가능해 자기교차가
  // 재발했다 — 다만 이번엔 원본(139개) 좌표 기준으로는 교차가 없고, 30~50개로 단순화(샘플링)하는
  // 과정에서 3~10m 폭의 미세한 좌우 offset이 뭉개지며 생기는 샘플링 아티팩트였다(64개로 줄여도
  // 재발 확인). 즉 이 지점은 몇 개의 waypoint로 두든 "좁은 통로를 왕복"하는 형태 자체를 벗어날
  // 수 없어, 3번째 waypoint를 완전히 제거하고 2번째→4번째를 직접 연결하는 3개 지점 루프로
  // 축소. OSRM 재조회 결과 원본(101개)·샘플링(36개) 좌표 모두 자기교차 0건 확인.
  // 실거리가 2.0km로 기존 라벨(2.5km)보다 크게 줄어 distanceKm도 2.0으로 갱신.
  'course-14': [
    { latitude: 37.555, longitude: 126.9346 },
    { latitude: 37.554348, longitude: 126.937646 },
    { latitude: 37.550105, longitude: 126.932971 },
    { latitude: 37.555, longitude: 126.9346 },
  ],
  // 서강대 캠퍼스 둘레길. 원래 waypoint 중 하나(37.551653,126.942694)가 캠퍼스 내부의
  // 막다른 지점이라 정확히 되짚어 나오는 유턴(180°)이 발생했다. OSM 보행 네트워크상
  // 캠퍼스 내부 통로가 매핑돼 있지 않아(街路 이름이 항상 백범로/대흥로로만 나옴)
  // 순환 루프 자체가 불가능해, 캠퍼스 정문 앞(대흥로)~후문 방향(백범로) 왕복으로 변경.
  // (자기교차 재검증) 3-waypoint 왕복 요청이 여기서도 비대칭(최대 570m 어긋남)이라
  // COURSE_WAYPOINTS에서 제외하고 편도 OSRM + 정확한 역순 미러링으로 mock.ts에 직접 반영.
  // 실거리 1.8km로 기존 라벨(1.7km)과 8% 이내라 유지.
  // 'course-15': [
  //   { latitude: 37.549177, longitude: 126.939212 },
  //   { latitude: 37.551313, longitude: 126.942071 },
  //   { latitude: 37.549177, longitude: 126.939212 },
  // ],
  // 대현동 골목길 코스(구 "이화여대 캠퍼스길" 전면 재설계). 기존 코스는 이대 정문 앞
  // 도로망에서 근접 자기교차가 반복 발생해(위 이력 참고), 아예 다른 블록으로 이동했다.
  // 이대 정문에서 동쪽으로 두 블록 떨어진 대현동 주택가 격자(이화여대길·이화여대2가/2다길·
  // 이화여대8길)를 Overpass로 조사해, 실제 교차로(2개 이상의 named way가 만나는 지점)만
  // waypoint로 사용하는 사각형 루프로 설계했다. 첫 시도에서 북쪽 꼭짓점을
  // (37.55919,126.94569) 이화여대길 북단 로터리로 잡았더니 그 작은 원형 교차로를 돌고
  // 나오며 자기교차(및 재시도 시 edge 재사용)가 재발해, 로터리를 아예 경유하지 않는
  // 낮은 위도의 관통로 지점(37.55879,126.94614)으로 교체해 해소. 동쪽 꼭짓점도 이화여대8길이
  // 실제로 막다른 지점(37.5598,126.9499)까지 이어져 있어 그 지점을 waypoint로 쓰면
  // 178° 급회전(왕복)이 발생, 관통로 중간 지점(37.558791,126.9479879)으로 옮겨 해소.
  // OSRM 재조회 결과 원본(52pt)·샘플링 불필요(26pt, SAMPLE_MAX 이하) 모두 자기교차 0건,
  // edge 재사용 0건, 급회전(≥150°) 0건 확인. 실거리 1.04km로 distanceKm 1.0 반영.
  'course-16': [
    { latitude: 37.55734, longitude: 126.94588 },
    { latitude: 37.55879, longitude: 126.94614 },
    { latitude: 37.558791, longitude: 126.9479879 },
    { latitude: 37.55755, longitude: 126.94879 },
    { latitude: 37.55734, longitude: 126.94588 },
  ],
  // 성미산 자락길 루프. 원래 waypoint 중 하나(37.562516,126.918536)가 막다른 지점이라
  // 그대로 되돌아오는 유턴(180°)이 발생했다. 해당 곁가지를 제거하고 성미산 둘레를
  // 도는 단일 루프로 재설계. 거리가 기존 라벨(1.9km)과 거의 동일해 distanceKm 유지.
  'course-18': [
    { latitude: 37.560517, longitude: 126.919529 },
    { latitude: 37.561707, longitude: 126.918673 },
    { latitude: 37.562179, longitude: 126.919469 },
    { latitude: 37.563547, longitude: 126.921812 },
    { latitude: 37.560593, longitude: 126.92418 },
    { latitude: 37.559335, longitude: 126.920014 },
    { latitude: 37.560517, longitude: 126.919529 },
  ],
  // 합정동 골목길 코스. 원래 waypoint 중 2개(37.552645,126.918259 / 37.552767,126.91812)가
  // 코스1(몽마르뜨공원) 좌표와 정확히 일치 — 실수로 다른 코스 좌표가 섞여 들어가
  // 합정동 골목 밖으로 갔다가 돌아오며 idx13에서 179° 급회전이 발생했다. 해당 두 점을
  // 우선 제거했으나, 남은 waypoint 중 원래 시작점(37.549564,126.913513 부근)과
  // 그 남쪽 지점(37.548661,126.914829)이 독막로상의 막다른 지점이라 — 그쪽으로
  // 들어갔다 나올 때 항상 같은 143m 구간을 되짚거나(edge 재사용), 반대 방향으로는
  // 먼 곳(양화로 우회 유턴)까지 갔다 와야 했다. 두 지점을 모두 제거하고 막다른 골목이
  // 아닌 지점들만으로 루프를 재구성. 거리가 기존 라벨(2.3km)보다 크게 줄어
  // distanceKm도 함께 갱신 필요.
  'course-19': [
    { latitude: 37.551877, longitude: 126.912502 },
    { latitude: 37.552249, longitude: 126.914203 },
    { latitude: 37.551267, longitude: 126.915196 },
    { latitude: 37.550814, longitude: 126.915483 },
    { latitude: 37.549242, longitude: 126.913449 },
    { latitude: 37.551877, longitude: 126.912502 },
  ],
  // 창천동 명물길 코스(구 "신촌 연세로 코스" 전면 재설계). 기존 코스는 연세로 본선을
  // 따라 북상했다 정문 광장을 돌고 되짚어오는 "롤리팝" 형태라 자기교차가 반복됐다(위 이력
  // 참고). 연세로 자체를 아예 벗어나, 그 동쪽 뒷골목인 창천동 먹자골목(명물길·연세로2~4길
  // 계열 소로) 격자를 Overpass로 조사해 실제 교차로만 waypoint로 쓰는 사각형 루프로
  // 설계했다. 남측 변(연세로2길)으로 진입해 동측을 거쳐 북측(명물길)을 지나 서측
  // (연세로4길·2가길)으로 내려오는 단일 방향 루프라 남/북 변이 서로 다른 도로라
  // 왕복 구조 자체가 없다. OSRM 재조회 결과 원본(53pt)을 샘플링(32pt, Douglas-Peucker)한
  // 좌표 기준 자기교차 0건, edge 재사용 0건, 급회전(≥150°) 0건 확인. 실거리 1.35km로
  // distanceKm 1.3 반영.
  'course-20': [
    { latitude: 37.55592, longitude: 126.93759 },
    { latitude: 37.55743, longitude: 126.94167 },
    { latitude: 37.55863, longitude: 126.94163 },
    { latitude: 37.55898, longitude: 126.93792 },
    { latitude: 37.55592, longitude: 126.93759 },
  ],
  //
  // mockMyRunningRoute(러닝 중 화면에 그려지는 "지금까지 뛴 경로") 전용.
  // mockCourses 안의 코스가 아니라 data/mock.ts에 독립적으로 선언된 배열이라
  // 아래에서 별도 치환 함수(replaceMyRunningRoute)로 처리한다.
  // 시작점은 기존 mock 좌표를 유지해 mockMeLocation과 같은 신촌/연세로 인근
  // 구역을 유지. 원래 끝점(37.561,126.9372)은 연세대 앞 지하보도 진입로에
  // 스냅되어 성산로 중앙분리대에서 그대로 되돌아오는 유턴(uturn)이 발생해,
  // 성산로 표면 도로 위 지점(37.5602,126.9365)으로 옮겨 해소.
  'my-running-route': [
    { latitude: 37.5589, longitude: 126.9345 },
    { latitude: 37.5602, longitude: 126.9365 },
  ],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 점(point)에서 (lineStart, lineEnd)를 잇는 직선까지의 수직 거리.
// lat/lng는 매우 좁은 범위 안에서만 비교하므로 평면 근사로 충분하다.
function perpendicularDistance(point, lineStart, lineEnd) {
  const { latitude: x, longitude: y } = point;
  const { latitude: x1, longitude: y1 } = lineStart;
  const { latitude: x2, longitude: y2 } = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  const cross = Math.abs(dy * x - dx * y + x2 * y1 - y2 * x1);
  return cross / Math.sqrt(lengthSquared);
}

// Ramer-Douglas-Peucker: 커브/회전 구간은 점을 더 많이, 직선 구간은 더 적게 남기는
// 곡률 인식 단순화. 인덱스 기준 균등 추출과 달리 경로의 실제 형태를 보존한다.
function douglasPeucker(points, epsilon) {
  if (points.length < 3) {
    return points;
  }

  let maxDistance = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance <= epsilon) {
    return [first, last];
  }

  const left = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
  const right = douglasPeucker(points.slice(maxIndex), epsilon);
  return [...left.slice(0, -1), ...right];
}

// epsilon을 이분 탐색해 결과 점 개수가 [min, max] 범위에 들어오도록 조정한다.
// 원본 점 개수가 이미 max 이하라면 손실 없이 그대로 사용한다.
function samplePoints(points, min, max) {
  if (points.length <= max) {
    return points;
  }

  let low = 0;
  let high = 1; // 위도/경도 단위 — 이 범위의 경로엔 충분히 큰 상한
  let result = douglasPeucker(points, high);

  for (let i = 0; i < 25; i++) {
    const mid = (low + high) / 2;
    const simplified = douglasPeucker(points, mid);
    result = simplified;

    if (simplified.length > max) {
      low = mid;
    } else if (simplified.length < min) {
      high = mid;
    } else {
      return simplified;
    }
  }

  return result;
}

async function fetchRoadRoute(waypoints, courseId) {
  const coords = waypoints.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM 응답 오류: ${data.code || 'unknown'}`);
  }

  const route = data.routes[0];
  console.log(`\n[fetch-routes] ${courseId} OSRM 응답 확인`);
  console.log(`  code: ${data.code}, 총 거리: ${(route.distance / 1000).toFixed(2)}km, 원본 포인트 수: ${route.geometry.coordinates.length}`);
  route.legs.forEach((leg, i) => {
    console.log(`  leg ${i}: ${leg.distance.toFixed(0)}m`);
  });
  const streetNames = [...new Set(route.legs.flatMap((leg) => leg.steps.map((s) => s.name).filter(Boolean)))];
  console.log(`  경유 도로명: ${streetNames.join(', ') || '(없음)'}`);

  const rawPoints = route.geometry.coordinates.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));

  return samplePoints(rawPoints, SAMPLE_MIN, SAMPLE_MAX);
}

function formatCoordinatesBlock(points, indent = '      ') {
  const lines = points.map(
    (p) => `${indent}{ latitude: ${p.latitude}, longitude: ${p.longitude} },`,
  );
  const closingIndent = indent.slice(0, -2);
  return `[\n${lines.join('\n')}\n${closingIndent}]`;
}

// mock.ts 텍스트에서 특정 코스의 `coordinates: [ ... ]` 블록만 안전하게 치환한다.
// coordinates 배열 내부는 { } 객체만 있고 중첩 배열이 없으므로, `coordinates: [` 다음
// 첫 `]`까지가 항상 해당 배열의 끝이다.
function replaceCourseCoordinates(fileText, courseId, newPoints) {
  const idMarker = `id: '${courseId}',`;
  const idIndex = fileText.indexOf(idMarker);
  if (idIndex === -1) {
    throw new Error(`mock.ts에서 ${courseId}를 찾을 수 없음`);
  }

  const coordsKeyIndex = fileText.indexOf('coordinates: [', idIndex);
  if (coordsKeyIndex === -1) {
    throw new Error(`${courseId}의 coordinates 배열을 찾을 수 없음`);
  }

  const arrayStart = coordsKeyIndex + 'coordinates: '.length;
  const arrayEnd = fileText.indexOf(']', arrayStart) + 1;

  const before = fileText.slice(0, arrayStart);
  const after = fileText.slice(arrayEnd);
  return `${before}${formatCoordinatesBlock(newPoints)}${after}`;
}

// mockMyRunningRoute는 mockCourses 배열 안의 객체가 아니라
// `export const mockMyRunningRoute: LatLng[] = [ ... ];` 형태로 독립 선언되어 있어
// id 기반 replaceCourseCoordinates를 쓸 수 없다. 선언부를 직접 찾아 치환한다.
function replaceMyRunningRoute(fileText, newPoints) {
  const declMarker = 'export const mockMyRunningRoute: LatLng[] = ';
  const declIndex = fileText.indexOf(declMarker);
  if (declIndex === -1) {
    throw new Error('mock.ts에서 mockMyRunningRoute 선언을 찾을 수 없음');
  }

  const arrayStart = declIndex + declMarker.length;
  const arrayEnd = fileText.indexOf(']', arrayStart) + 1;

  const before = fileText.slice(0, arrayStart);
  const after = fileText.slice(arrayEnd);
  return `${before}${formatCoordinatesBlock(newPoints, '  ')}${after}`;
}

async function main() {
  // 개발 편의용: `node scripts/fetch-routes.js course-2` 처럼 인자를 주면 해당 코스만 처리.
  const onlyCourseIds = process.argv.slice(2);
  const entries = Object.entries(COURSE_WAYPOINTS).filter(
    ([courseId]) => onlyCourseIds.length === 0 || onlyCourseIds.includes(courseId),
  );

  let fileText = fs.readFileSync(MOCK_FILE, 'utf8');
  const results = [];

  for (const [courseId, waypoints] of entries) {
    try {
      const roadPoints = await fetchRoadRoute(waypoints, courseId);
      fileText = courseId === 'my-running-route'
        ? replaceMyRunningRoute(fileText, roadPoints)
        : replaceCourseCoordinates(fileText, courseId, roadPoints);
      results.push({ courseId, status: 'ok', count: roadPoints.length });
    } catch (error) {
      console.error(`[fetch-routes] ${courseId} 실패, 기존 좌표 유지: ${error.message}`);
      results.push({ courseId, status: 'failed', reason: error.message });
    }
    await sleep(REQUEST_DELAY_MS);
  }

  fs.writeFileSync(MOCK_FILE, fileText, 'utf8');

  console.log('\n=== fetch-routes 결과 요약 ===');
  for (const result of results) {
    if (result.status === 'ok') {
      console.log(`  ${result.courseId}: 성공 (${result.count}개 포인트)`);
    } else {
      console.log(`  ${result.courseId}: 실패 - ${result.reason} (기존 좌표 유지)`);
    }
  }
}

main().catch((error) => {
  console.error('[fetch-routes] 스크립트 실행 중 예상치 못한 오류:', error);
  process.exitCode = 1;
});
