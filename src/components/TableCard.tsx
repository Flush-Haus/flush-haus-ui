import { motion } from 'framer-motion';
import type { CardAsset } from '../hooks/useCardAssets';

interface TableCardState {
  id: string;
  card: CardAsset;
  x: number;
  y: number;
  width: number;
  height: number;
  from?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fromRotation?: number;
  spin?: number;
  rotation: number;
  zIndex: number;
}

interface TableCardProps {
  tableCard: TableCardState;
}

export default function TableCard({ tableCard }: TableCardProps) {
  const from = tableCard.from;
  const fromRotation = tableCard.fromRotation ?? tableCard.rotation;
  const spin = tableCard.spin ?? 0;
  const finalRotation = from ? tableCard.rotation + Math.sign(spin || 1) * 360 : tableCard.rotation;

  return (
    <motion.div
      className="table-card"
      style={{
        width: tableCard.width,
        height: tableCard.height,
        zIndex: tableCard.zIndex,
      }}
      initial={{
        opacity: 1,
        x: from?.x ?? tableCard.x,
        y: from?.y ?? tableCard.y,
        rotate: fromRotation,
        scale: from ? from.width / tableCard.width : 1,
      }}
      animate={{
        opacity: 1,
        x: tableCard.x,
        y: tableCard.y,
        rotate: finalRotation,
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{
        duration: from ? 0.72 : 0.18,
        ease: [0.2, 0.86, 0.22, 1],
      }}
      aria-label={tableCard.card.label}
      role="img"
    >
      <img className="card-image" src={tableCard.card.url} alt="" draggable="false" />
    </motion.div>
  );
}
