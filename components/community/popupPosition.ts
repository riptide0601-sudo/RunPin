export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

const EDGE_MARGIN = 8;
const ANCHOR_OFFSET = 14;

export function getAnchoredPopupPosition(anchor: Point, container: Size, card: Size): Point {
  const fitsRight = anchor.x + ANCHOR_OFFSET + card.width <= container.width - EDGE_MARGIN;
  const left = fitsRight ? anchor.x + ANCHOR_OFFSET : anchor.x - ANCHOR_OFFSET - card.width;

  const clampedLeft = Math.min(Math.max(left, EDGE_MARGIN), Math.max(EDGE_MARGIN, container.width - card.width - EDGE_MARGIN));
  const top = anchor.y - card.height / 2;
  const clampedTop = Math.min(Math.max(top, EDGE_MARGIN), Math.max(EDGE_MARGIN, container.height - card.height - EDGE_MARGIN));

  return { x: clampedLeft, y: clampedTop };
}
