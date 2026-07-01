// Convert a protocol card token to an asset id used by the card catalog.
//
// Protocol (PT):  value = 2..10 V D R A   suit = P O C E
//   P = paus (clubs), O = ouros (diamonds), C = copas (hearts), E = espadas (spades)
// Asset ids (EN): rank = 2..10 J Q K A     suit = C D H S
//
// e.g. "AC" -> "AH" (Ás de copas),  "RO" -> "KD" (Rei de ouros),  "10P" -> "10C".

const VALUE_MAP: Record<string, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  V: 'J',
  D: 'Q',
  R: 'K',
  A: 'A',
};

const SUIT_MAP: Record<string, string> = {
  P: 'C',
  O: 'D',
  C: 'H',
  E: 'S',
};

export function protocolCardToId(token: string | null | undefined): string | null {
  if (!token) {
    return null;
  }

  const upper = token.toUpperCase();
  const suitChar = upper.slice(-1);
  const valueChar = upper.slice(0, -1);

  const rank = VALUE_MAP[valueChar];
  const suit = SUIT_MAP[suitChar];

  if (!rank || !suit) {
    return null;
  }

  return `${rank}${suit}`;
}
