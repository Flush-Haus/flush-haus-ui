import { motion } from 'framer-motion';
import type { CardAsset } from '../hooks/useCardAssets';

interface CardBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FlyingCardState {
  animationId: string;
  kind: 'throw' | 'draw';
  card: CardAsset;
  from: CardBox;
  to: CardBox;
  fromRotation: number;
  rotation: number;
  spin: number;
  zIndex: number;
  /** Optional stagger: the card waits invisible at the origin, then flies. */
  delay?: number;
}

interface FlyingCardProps {
  flyingCard: FlyingCardState;
  backUrl?: string;
  onComplete: (flyingCard: FlyingCardState) => void;
}

const premiumEase = [0.16, 1, 0.3, 1] as const;
const drawEase = [0.18, 0.9, 0.2, 1] as const;

export default function FlyingCard({ flyingCard, backUrl, onComplete }: FlyingCardProps) {
  const isDraw = flyingCard.kind === 'draw';
  const midX = flyingCard.from.x + (flyingCard.to.x - flyingCard.from.x) * 0.5;
  const midY = Math.min(flyingCard.from.y, flyingCard.to.y) - 42;
  const duration = isDraw ? 0.84 : 0.62;
  const delay = flyingCard.delay ?? 0;

  return (
    <motion.div
      className={`flying-card is-${flyingCard.kind}`}
      style={{
        width: flyingCard.to.width,
        height: flyingCard.to.height,
        zIndex: flyingCard.zIndex,
      }}
      initial={{
        x: flyingCard.from.x,
        y: flyingCard.from.y,
        rotateZ: flyingCard.fromRotation,
        scale: flyingCard.from.width / flyingCard.to.width,
        opacity: delay > 0 ? 0 : 1,
      }}
      animate={{
        x: isDraw ? flyingCard.to.x : [flyingCard.from.x, midX, flyingCard.to.x],
        y: isDraw ? flyingCard.to.y : [flyingCard.from.y, midY, flyingCard.to.y],
        rotateZ: isDraw
          ? flyingCard.rotation
          : [flyingCard.fromRotation, flyingCard.fromRotation + flyingCard.spin * 0.22, flyingCard.rotation],
        scale: isDraw ? 1 : [flyingCard.from.width / flyingCard.to.width, 1.014, 1],
        opacity: 1,
      }}
      transition={{
        duration,
        delay,
        type: 'tween',
        ease: isDraw ? drawEase : premiumEase,
        times: isDraw ? undefined : [0, 0.54, 1],
        opacity: { duration: 0.01, delay },
      }}
      onAnimationComplete={() => onComplete(flyingCard)}
    >
      <motion.span
        className="flying-card-inner"
        initial={{ rotateY: isDraw ? 180 : 0, rotateX: 0 }}
        animate={{
          rotateY: isDraw ? 0 : [0, 14, 0],
          rotateX: isDraw ? 0 : [0, 5, 0],
        }}
        transition={{
          duration: isDraw ? 0.78 : duration,
          delay,
          type: 'tween',
          ease: isDraw ? drawEase : premiumEase,
          times: isDraw ? undefined : [0, 0.5, 1],
        }}
      >
        <span className="flying-card-face flying-card-front">
          <img className="card-image" src={flyingCard.card.url} alt="" draggable="false" />
        </span>
        <span className="flying-card-face flying-card-back">
          {backUrl ? <img className="card-image" src={backUrl} alt="" draggable="false" /> : null}
        </span>
      </motion.span>
    </motion.div>
  );
}
