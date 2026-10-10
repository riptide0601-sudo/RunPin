// scripts/fetch-routes.js에서 main() 자동 실행부만 제거한 '측정용 사본'(pipeline.js)을 생성한다.
// 알고리즘(douglasPeucker/samplePoints)을 재구현하지 않고 저장소 코드를 그대로 쓰기 위한 장치이며,
// main()을 떼어내므로 data/mock.ts에 절대 쓰기를 하지 않는다.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'fetch-routes.js'), 'utf8');
const cut = src.indexOf('main().catch(');
if (cut < 0) throw new Error('main() 호출부를 찾지 못했습니다 — fetch-routes.js 구조가 바뀌었는지 확인하세요.');
fs.writeFileSync(
  path.join(__dirname, 'pipeline.js'),
  src.slice(0, cut) + '\nmodule.exports={COURSE_WAYPOINTS,douglasPeucker,samplePoints,formatCoordinatesBlock,SAMPLE_MIN,SAMPLE_MAX,OSRM_BASE};\n'
);
console.log('pipeline.js 생성 완료 (main() 실행부 제거)');
