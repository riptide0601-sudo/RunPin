const fs=require('fs');
const rows=JSON.parse(fs.readFileSync('result1.json','utf8')).filter(r=>!r.error);
const ok=rows;
const applied=rows.filter(r=>r.sampledCount<r.rawCount); // 단순화가 실제로 일어난 건
function sum(a,k){return a.reduce((s,r)=>s+r[k],0);}
function report(label,a){
  const rc=sum(a,'rawCount'), sc=sum(a,'sampledCount');
  const rb=sum(a,'rawBytes'), sb=sum(a,'sampledBytes');
  const errs=a.map(r=>Math.abs(r.distErrPct));
  console.log(`\n[${label}] 대상 ${a.length}건`);
  console.log(`  포인트: ${rc} → ${sc} (감소 ${rc-sc}, ${(((rc-sc)/rc)*100).toFixed(1)}%)`);
  console.log(`  크기(mock.ts 리터럴 기준): ${(rb/1024).toFixed(2)}KB → ${(sb/1024).toFixed(2)}KB (감소 ${(((rb-sb)/rb)*100).toFixed(1)}%)`);
  console.log(`  거리오차 절대값: 평균 ${(errs.reduce((x,y)=>x+y,0)/errs.length).toFixed(3)}% / 최대 ${Math.max(...errs).toFixed(3)}%`);
  const worst=a.reduce((m,r)=>Math.abs(r.distErrPct)>Math.abs(m.distErrPct)?r:m);
  console.log(`  최대오차 코스: ${worst.id} (${worst.rawKm}km → ${worst.sampledKm}km, ${worst.distErrPct}%)`);
}
report('전체 대상(waypoint 정의된 14건)',ok);
report('단순화가 실제 적용된 건만',applied);
console.log('\n[참고] 단순화 불필요(원본이 이미 50pt 이하):',rows.filter(r=>r.sampledCount===r.rawCount).map(r=>`${r.id}(${r.rawCount}pt)`).join(', '));
