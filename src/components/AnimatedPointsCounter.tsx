import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedPointsCounterProps {
  points: number;
  className?: string;
}

const formatPoints = (points: number): string => {
  // Format with commas for thousands and 5 decimal places
  return points.toLocaleString('en-US', {
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  });
};

const AnimatedPointsCounter: React.FC<AnimatedPointsCounterProps> = ({ points, className = '' }) => {
  const formattedPoints = formatPoints(points);

  return (
    <div className={`font-mono ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={formattedPoints}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
            mass: 1
          }}
        >
          {formattedPoints}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default AnimatedPointsCounter; 