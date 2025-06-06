import React from 'react';
import { useAuth } from '@clerk/clerk-react';

interface UnauthenticatedProps {
  children: React.ReactNode;
}

const Unauthenticated: React.FC<UnauthenticatedProps> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center" data-testid="loading-state">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (isSignedIn) {
    window.location.href = '/dashboard';
    return null;
  }

  return <>{children}</>;
};

export default Unauthenticated; 