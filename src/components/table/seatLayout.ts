// Fixed anchor points for the 9 seats, as percentages of the felt's bounding
// box. `half` tells the seat which way the table center is, so hole cards and
// bet chips push toward the middle (up for bottom seats, down for top seats).
//
// The bottom-center is kept clear for the hero; the action bar lives in the
// bottom-right corner, so the open/extra seat sits inboard of it.

export interface SeatAnchor {
  x: number; // 0..100, horizontal center of the seat pod
  y: number; // 0..100, vertical center of the seat pod
  half: 'top' | 'bottom';
}

// Index 0 is the hero, bottom-center. The rest run clockwise around the oval.
export const SEAT_ANCHORS: SeatAnchor[] = [
  { x: 50, y: 95, half: 'bottom' }, // 0 hero
  { x: 16, y: 89, half: 'bottom' }, // 1 bottom-left
  { x: 3, y: 57, half: 'top' }, // 2 left
  { x: 11, y: 19, half: 'top' }, // 3 upper-left
  { x: 34, y: 4, half: 'top' }, // 4 top-left
  { x: 66, y: 4, half: 'top' }, // 5 top-right
  { x: 89, y: 19, half: 'top' }, // 6 upper-right
  { x: 97, y: 53, half: 'top' }, // 7 right
  { x: 88, y: 78, half: 'top' }, // 8 lower-right (clears the action bar)
];
