import { useMemo } from 'react';

export type CardSuitCode = 'S' | 'H' | 'D' | 'C';

export interface CardAsset {
  id: string;
  label: string;
  shortLabel: string;
  fileName: string;
  url: string;
  selectedUrl?: string;
  hoverUrl?: string;
  rank?: string;
  suit?: CardSuitCode;
  suitName?: string;
  suitSymbol?: string;
  sortIndex: number;
}

interface SpecialAsset {
  fileName: string;
  url: string;
}

export interface CardAssetCatalog {
  cards: CardAsset[];
  backCard?: SpecialAsset;
  placeholderCard?: SpecialAsset;
  selectedFrame?: SpecialAsset;
  hoverFrame?: SpecialAsset;
  totalImages: number;
}

const imageModules = import.meta.glob(
  [
    '../assets/cards/*.[pP][nN][gG]',
    '../assets/cards/*.[wW][eE][bB][pP]',
    '../assets/cards/*.[jJ][pP][gG]',
    '../assets/cards/*.[jJ][pP][eE][gG]',
  ],
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
) as Record<string, string>;

const RANKS: Record<string, { label: string; short: string; order: number }> = {
  A: { label: 'Ace', short: 'A', order: 14 },
  K: { label: 'King', short: 'K', order: 13 },
  Q: { label: 'Queen', short: 'Q', order: 12 },
  J: { label: 'Jack', short: 'J', order: 11 },
  '10': { label: '10', short: '10', order: 10 },
  '9': { label: '9', short: '9', order: 9 },
  '8': { label: '8', short: '8', order: 8 },
  '7': { label: '7', short: '7', order: 7 },
  '6': { label: '6', short: '6', order: 6 },
  '5': { label: '5', short: '5', order: 5 },
  '4': { label: '4', short: '4', order: 4 },
  '3': { label: '3', short: '3', order: 3 },
  '2': { label: '2', short: '2', order: 2 },
};

const RANK_WORDS: Record<string, string> = {
  ace: 'A',
  a: 'A',
  king: 'K',
  k: 'K',
  queen: 'Q',
  q: 'Q',
  jack: 'J',
  j: 'J',
  ten: '10',
  t: '10',
  nine: '9',
  eight: '8',
  seven: '7',
  six: '6',
  five: '5',
  four: '4',
  three: '3',
  two: '2',
};

const SUITS: Record<CardSuitCode, { label: string; symbol: string; order: number; words: string[] }> = {
  S: { label: 'Spades', symbol: '♠', order: 0, words: ['s', 'spade', 'spades'] },
  H: { label: 'Hearts', symbol: '♥', order: 1, words: ['h', 'heart', 'hearts'] },
  D: { label: 'Diamonds', symbol: '♦', order: 2, words: ['d', 'diamond', 'diamonds'] },
  C: { label: 'Clubs', symbol: '♣', order: 3, words: ['c', 'club', 'clubs'] },
};

const VARIANT_WORDS = /\b(selected|select|active|chosen|hover|over|highlight|glow)\b/gi;
const DECORATION_WORDS = /\b(card|playing|front|face|of|the)\b/gi;

function fileNameFromPath(path: string) {
  const fileName = path.split('/').pop() ?? path;
  return decodeURIComponent(fileName);
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '');
}

function normalizeName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/♠/g, ' S ')
    .replace(/♥/g, ' H ')
    .replace(/♦/g, ' D ')
    .replace(/♣/g, ' C ')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([0-9])/gi, '$1 $2')
    .replace(/([0-9])([a-z])/gi, '$1 $2')
    .trim()
    .toLowerCase();
}

function slugify(value: string) {
  return normalizeName(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function titleize(value: string) {
  return normalizeName(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function removeVariantWords(baseName: string) {
  return normalizeName(baseName)
    .replace(VARIANT_WORDS, ' ')
    .replace(DECORATION_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function includesSpecialWord(baseName: string, words: string[]) {
  const normalized = normalizeName(baseName);
  const compact = normalized.replace(/[^a-z0-9]/g, '');

  return words.some((word) => {
    const normalizedWord = normalizeName(word).replace(/\s+/g, ' ');
    const compactWord = normalizedWord.replace(/[^a-z0-9]/g, '');
    return normalized.split(/\s+/).includes(normalizedWord) || compact.includes(compactWord);
  });
}

function inferIdentity(baseName: string) {
  const cleaned = removeVariantWords(baseName);
  const compact = cleaned.replace(/[^a-z0-9]/g, '').toUpperCase();
  const compactMatch = compact.match(/^(10|[2-9AJQKT])([SHDC])$/);

  if (compactMatch) {
    const rank = compactMatch[1] === 'T' ? '10' : compactMatch[1];
    const suit = compactMatch[2] as CardSuitCode;
    return identityFromParts(rank, suit, cleaned);
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  let rank: string | undefined;
  let suit: CardSuitCode | undefined;

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (!rank && RANKS[upper]) {
      rank = upper;
    }
    if (!rank && RANK_WORDS[token]) {
      rank = RANK_WORDS[token];
    }
    if (!suit) {
      const suitEntry = Object.entries(SUITS).find(([, config]) => config.words.includes(token));
      if (suitEntry) {
        suit = suitEntry[0] as CardSuitCode;
      }
    }
  }

  if (!rank || !suit) {
    return undefined;
  }

  return identityFromParts(rank, suit, cleaned);
}

function identityFromParts(rank: string, suit: CardSuitCode, fallbackName: string) {
  const rankInfo = RANKS[rank];
  const suitInfo = SUITS[suit];

  if (!rankInfo || !suitInfo) {
    return undefined;
  }

  return {
    id: `${rank}${suit}`,
    label: `${rankInfo.label} of ${suitInfo.label}`,
    shortLabel: `${rankInfo.short}${suitInfo.symbol}`,
    rank,
    suit,
    suitName: suitInfo.label,
    suitSymbol: suitInfo.symbol,
    sortIndex: suitInfo.order * 20 + (14 - rankInfo.order),
    fallbackName,
  };
}

function buildCatalog(): CardAssetCatalog {
  const baseCards = new Map<string, CardAsset>();
  const selectedVariants = new Map<string, string>();
  const hoverVariants = new Map<string, string>();
  let backCard: SpecialAsset | undefined;
  let placeholderCard: SpecialAsset | undefined;
  let selectedFrame: SpecialAsset | undefined;
  let hoverFrame: SpecialAsset | undefined;

  Object.entries(imageModules).forEach(([path, url], index) => {
    const fileName = fileNameFromPath(path);
    const baseName = stripExtension(fileName);
    const normalized = normalizeName(baseName);
    const hasSelectedWord = includesSpecialWord(baseName, ['selected', 'select', 'chosen', 'active']);
    const hasHoverWord = includesSpecialWord(baseName, ['hover', 'over']);
    const identity = inferIdentity(baseName);

    if (includesSpecialWord(baseName, ['back', 'card back', 'cardback', 'reverse'])) {
      backCard ??= { fileName, url };
      return;
    }

    if (includesSpecialWord(baseName, ['placeholder', 'empty', 'blank', 'slot'])) {
      placeholderCard ??= { fileName, url };
      return;
    }

    if (hasSelectedWord && !identity) {
      selectedFrame ??= { fileName, url };
      return;
    }

    if (hasHoverWord && !identity) {
      hoverFrame ??= { fileName, url };
      return;
    }

    if (identity && hasSelectedWord) {
      selectedVariants.set(identity.id, url);
      return;
    }

    if (identity && hasHoverWord) {
      hoverVariants.set(identity.id, url);
      return;
    }

    const fallbackId = slugify(baseName) || `card-${index}`;
    const fallbackLabel = titleize(baseName) || `Card ${index + 1}`;
    const id = identity?.id ?? fallbackId;

    baseCards.set(id, {
      id,
      label: identity?.label ?? fallbackLabel,
      shortLabel: identity?.shortLabel ?? fallbackLabel,
      fileName,
      url,
      rank: identity?.rank,
      suit: identity?.suit,
      suitName: identity?.suitName,
      suitSymbol: identity?.suitSymbol,
      sortIndex: identity?.sortIndex ?? 1000 + index,
    });

    if (normalized.includes('selected')) {
      selectedVariants.set(id, url);
    }

    if (normalized.includes('hover')) {
      hoverVariants.set(id, url);
    }
  });

  const cards = Array.from(baseCards.values())
    .map((card) => ({
      ...card,
      selectedUrl: selectedVariants.get(card.id),
      hoverUrl: hoverVariants.get(card.id),
    }))
    .sort((a, b) => a.sortIndex - b.sortIndex || a.label.localeCompare(b.label));

  return {
    cards,
    backCard,
    placeholderCard,
    selectedFrame,
    hoverFrame,
    totalImages: Object.keys(imageModules).length,
  };
}

export default function useCardAssets() {
  return useMemo(buildCatalog, []);
}
