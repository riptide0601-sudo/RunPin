// [측정 1] 좌표 단순화 효과 — scripts/fetch-routes.js의 samplePoints(Douglas-Peucker + epsilon 이진탐색)
// 원본: OSRM 공개 서버에 저장소의 COURSE_WAYPOINTS를 그대로 질의해 받은 full geometry
// 단순화: 저장소의 samplePoints() 함수를 그대로 호출 (알고리즘 재구현 아님)
const fs = require('fs');
const P = require('./pipeline.js');

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function haversine(a, b) {
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const pathKm = (pts) => pts.reduce((s,p,i)=> i ? s + haversine(pts[i-1],p) : 0, 0) / 1000;
const sleep = (ms) => new Promise((r)=>setTimeout(r,ms));

async function osrmRaw(waypoints) {
  const coords = waypoints.map((p)=>`${p.longitude},${p.latitude}`).join(';');
  const url = `${P.OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM ${data.code}`);
  return {
    points: data.routes[0].geometry.coordinates.map(([longitude, latitude]) => ({ latitude, longitude })),
    osrmDistKm: data.routes[0].distance / 1000,
  };
}

(async () => {
  const rows = [];
  for (const [id, wps] of Object.entries(P.COURSE_WAYPOINTS)) {
    try {
      const { points: raw, osrmDistKm } = await osrmRaw(wps);
      const sampled = P.samplePoints(raw, P.SAMPLE_MIN, P.SAMPLE_MAX);
      // 실제 앱에 실리는 형태(mock.ts 리터럴 텍스트) 기준 바이트 크기
      const rawBytes = Buffer.byteLength(P.formatCoordinatesBlock(raw), 'utf8');
      const sampledBytes = Buffer.byteLength(P.formatCoordinatesBlock(sampled), 'utf8');
      const rawKm = pathKm(raw), sampledKm = pathKm(sampled);
      rows.push({
        id, rawCount: raw.length, sampledCount: sampled.length,
        rawBytes, sampledBytes,
        rawKm: +rawKm.toFixed(4), sampledKm: +sampledKm.toFixed(4),
        osrmDistKm: +osrmDistKm.toFixed(4),
        distErrPct: +(((sampledKm - rawKm) / rawKm) * 100).toFixed(3),
      });
      console.log(`${id}: 원본 ${raw.length}pt → 단순화 ${sampled.length}pt | ${rawKm.toFixed(3)}km → ${sampledKm.toFixed(3)}km (${(((sampledKm-rawKm)/rawKm)*100).toFixed(2)}%)`);
    } catch (e) {
      console.log(`${id}: 실패 - ${e.message}`);
      rows.push({ id, error: e.message });
    }
    await sleep(300); // 저장소 REQUEST_DELAY_MS와 동일
  }
  fs.writeFileSync('result1.json', JSON.stringify(rows, null, 2));
  console.log('\n→ result1.json 저장 (' + rows.filter(r=>!r.error).length + '건 성공)');
})();
