import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedPointsCounterProps {
  points: number;
  className?: string;
}

const AnimatedPointsCounter: React.FC<AnimatedPointsCounterProps> = ({ points, className = '' }) => {
  return (
    <div className={`text-2xl font-bold text-red ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={Math.floor(points)}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {points.toFixed(2)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default AnimatedPointsCounter;
