import { useState } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip = ({ content, children }: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform">
          <div className="rounded-lg bg-neutral-800 px-3 py-2 text-sm text-neutral-200 shadow-lg">
            {content}
            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 transform rotate-45 bg-neutral-800"></div>
          </div>
        </div>
      )}
    </div>
  );
}; 