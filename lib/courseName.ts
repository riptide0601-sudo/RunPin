const NEIGHBORHOODS = ['연남동', '성산동', '신수동', '연희동', '대현동', '합정동', '창천동', '망원동', '상수동', '서교동'];

const TERRAIN_SUFFIXES: { suffix: string; category: string }[] = [
  { suffix: '산책로', category: '하천' },
  { suffix: '골목길', category: '골목길' },
  { suffix: '둘레길', category: '둘레길' },
  { suffix: '자락길', category: '숲길' },
  { suffix: '공원길', category: '공원' },
];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function generateCourseName(): { name: string; category: string; neighborhood: string } {
  const neighborhood = pickRandom(NEIGHBORHOODS);
  const terrain = pickRandom(TERRAIN_SUFFIXES);
  return { name: `${neighborhood} ${terrain.suffix}`, category: terrain.category, neighborhood };
}
