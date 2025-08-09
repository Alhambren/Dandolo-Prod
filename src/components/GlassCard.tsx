import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'highlight' | 'error' | 'success';
  blur?: 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  role?: string;
  tabIndex?: number;
  'aria-label'?: string;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  blur = 'md',
  padding = 'md',
  hover = false,
  interactive = false,
  onClick,
  role,
  tabIndex,
  'aria-label': ariaLabel,
}) => {
  const baseClasses = 'rounded-xl border transition-all duration-250 ease-default';
  
  const variantClasses = {
    default: 'bg-glass border-glass-border',
    highlight: 'bg-glass border-brand-primary/30 ring-1 ring-brand-primary/20',
    error: 'bg-glass border-system-red/30 ring-1 ring-system-red/20',
    success: 'bg-glass border-system-green/30 ring-1 ring-system-green/20',
  };

  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-lg',
    lg: 'backdrop-blur-xl',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const hoverClasses = hover ? 'hover:bg-glass-hover hover:border-glass-border-hover hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-primary/10' : '';
  
  const interactiveClasses = interactive ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:ring-offset-2 focus:ring-offset-bg-primary' : '';

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    blurClasses[blur],
    paddingClasses[padding],
    hoverClasses,
    interactiveClasses,
    className
  ].filter(Boolean).join(' ');

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (interactive && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={combinedClasses}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={role || (interactive ? 'button' : undefined)}
      tabIndex={tabIndex || (interactive ? 0 : undefined)}
      aria-label={ariaLabel}
      data-testid="glass-card"
    >
      {children}
    </div>
  );
};

export default GlassCard;
