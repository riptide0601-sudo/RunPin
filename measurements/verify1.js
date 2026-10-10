// 검증 A: 측정값이 저장소에 실제로 반영된 값과 일치하는지 (mock.ts 현재 좌표 개수와 대조)
// 검증 B: OSRM 응답/알고리즘의 재현성 (같은 코스 3회 반복)
const fs=require('fs'), P=require('./pipeline.js');
const REPO='/Users/farclose/Desktop/취업/CJ 부트캠프/RunPin';
const mock=fs.readFileSync(REPO+'/data/mock.ts','utf8');
const rows=JSON.parse(fs.readFileSync('result1.json','utf8')).filter(r=>!r.error);

function mockCount(id){
  const i=mock.indexOf(`id: '${id}'`); if(i<0) return null;
  const s=mock.indexOf('coordinates: [',i), e=mock.indexOf('],',s);
  return [...mock.slice(s,e).matchAll(/latitude:/g)].length;
}
console.log('[검증 A] 재측정 결과 vs mock.ts 실제 반영 좌표 수');
let match=0, total=0;
for(const r of rows){
  if(r.id==='my-running-route') continue;
  const m=mockCount(r.id); total++;
  const same=m===r.sampledCount; if(same) match++;
  console.log(`  ${r.id}: 재측정 ${r.sampledCount}pt / mock.ts ${m}pt ${same?'일치':'불일치'}`);
}
console.log(`  → ${match}/${total} 일치`);

(async()=>{
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  console.log('\n[검증 B] 재현성 — course-7/9/14 각 3회 반복');
  for(const id of ['course-7','course-9','course-14']){
    const out=[];
    for(let i=0;i<3;i++){
      const wps=P.COURSE_WAYPOINTS[id];
      const coords=wps.map(p=>`${p.longitude},${p.latitude}`).join(';');
      const d=await (await fetch(`${P.OSRM_BASE}/${coords}?overview=full&geometries=geojson&steps=true`)).json();
      const raw=d.routes[0].geometry.coordinates.map(([lo,la])=>({latitude:la,longitude:lo}));
      out.push(`${raw.length}→${P.samplePoints(raw,P.SAMPLE_MIN,P.SAMPLE_MAX).length}`);
      await sleep(300);
    }
    console.log(`  ${id}: ${out.join(' , ')} ${new Set(out).size===1?'(3회 동일)':'(편차 있음)'}`);
  }
})();
