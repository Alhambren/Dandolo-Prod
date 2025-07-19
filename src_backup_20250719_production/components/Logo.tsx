import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'full' | 'shield' | 'wordmark';
  theme?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "h-10 w-auto", 
  showText = true, 
  variant = 'full',
  theme = 'dark'
}) => {
  // For the new PNG assets, we'll use img tags
  const getLogoSrc = () => {
    switch (variant) {
      case 'shield':
        return '/logos/Dandolo_shield_flat.png';
      case 'wordmark':
        return '/logos/Dandolo_wordmark_black.png';
      case 'full':
      default:
        if (theme === 'light') {
          return '/logos/Dandolo_full_transparent_black.png';
        }
        return '/logos/Dandolo_full_transparent_white.png';
    }
  };

  if (variant === 'shield') {
    return (
      <div className="flex items-center gap-3">
        <img 
          src={getLogoSrc()} 
          alt="Dandolo.ai" 
          className={`${className} object-contain`}
        />
        {showText && (
          <span className="text-2xl font-semibold tracking-tight text-white">
            Dandolo.ai
          </span>
        )}
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <img 
        src={getLogoSrc()} 
        alt="Dandolo.ai" 
        className={`${className} object-contain`}
      />
    );
  }

  // Full logo variant
  return (
    <div className="flex items-center">
      <img 
        src={getLogoSrc()} 
        alt="Dandolo.ai" 
        className={`${className} object-contain`}
      />
    </div>
  );
};

export default Logo; 