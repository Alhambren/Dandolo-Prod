import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-12 w-12", showText = true }) => {
  return (
    <div className="flex items-center gap-3">
      <div className={`${className} relative`}>
        {/* Shield background */}
        <svg viewBox="0 0 100 120" className="w-full h-full">
          <path
            d="M50 0 L90 20 L90 80 Q90 110 50 120 Q10 110 10 80 L10 20 Z"
            fill="white"
            stroke="#FFD700"
            strokeWidth="2"
          />
          {/* Lion */}
          <g transform="translate(50, 60)">
            <path
              d="M-15 -20 Q-20 -25 -15 -30 Q-10 -32 -5 -30 L0 -25 L5 -30 Q10 -32 15 -30 Q20 -25 15 -20 L10 -15 L10 0 L5 5 L0 10 L-5 5 L-10 0 L-10 -15 Z"
              fill="#000000"
            />
            {/* Tail */}
            <path
              d="M10 0 Q20 5 25 15 Q28 20 25 25"
              fill="none"
              stroke="#000000"
              strokeWidth="2"
            />
          </g>
        </svg>
      </div>
      {showText && (
        <span className="text-3xl font-bold text-white">Dandolo.ai</span>
      )}
    </div>
  );
}; 