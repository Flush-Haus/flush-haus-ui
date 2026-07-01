interface TableBounds {
  width: number;
  height: number;
}

interface CardSize {
  width: number;
  height: number;
}

interface ExistingCardSpot extends CardSize {
  x: number;
  y: number;
}

interface LandingSpot {
  x: number;
  y: number;
  rotation: number;
  spin: number;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function getTableLandingSpot(
  existingCards: ExistingCardSpot[],
  bounds: TableBounds,
  cardSize: CardSize,
): LandingSpot {
  const pileIndex = existingCards.length;
  const pileCenterX = bounds.width * 0.54;
  const pileCenterY = bounds.height * 0.34;
  const driftX = Math.sin(pileIndex * 1.73) * cardSize.width * 0.16;
  const driftY = Math.cos(pileIndex * 1.29) * cardSize.height * 0.07;
  const jitterX = randomBetween(-cardSize.width * 0.22, cardSize.width * 0.22);
  const jitterY = randomBetween(-cardSize.height * 0.12, cardSize.height * 0.12);
  const clampedX = Math.min(bounds.width * 0.76 - cardSize.width, Math.max(bounds.width * 0.32, pileCenterX - cardSize.width / 2 + driftX + jitterX));
  const clampedY = Math.min(bounds.height * 0.54 - cardSize.height, Math.max(bounds.height * 0.16, pileCenterY - cardSize.height / 2 + driftY + jitterY));
  const angle = randomBetween(-22, 22);

  return {
    x: clampedX,
    y: clampedY,
    rotation: angle,
    spin: randomBetween(140, 260) * (Math.random() > 0.5 ? 1 : -1),
  };
}
