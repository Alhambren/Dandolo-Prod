import React from 'react';

interface LogoProps {
  onClick?: () => void;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ onClick, className = '' }) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center space-x-2 cursor-pointer ${className}`}
      data-testid="logo"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-red"
        data-testid="logo-icon"
      >
        <path
          d="M16 2L4 9V23L16 30L28 23V9L16 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 2V30"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M4 9L28 23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M28 9L4 23"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="text-xl font-bold bg-gradient-to-r from-red to-gold bg-clip-text text-transparent"
        data-testid="logo-text"
      >
        Dandolo.ai
      </span>
    </div>
  );
};

export default Logo; 