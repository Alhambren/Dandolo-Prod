import React from 'react';
import { useSignOut } from '@clerk/clerk-react';

const SignOutButton: React.FC = () => {
  const { signOut, isLoaded } = useSignOut();

  const handleSignOut = async () => {
    if (!isLoaded) return;
    try {
      await signOut();
      window.location.href = '/';
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
      disabled={!isLoaded}
      data-testid="sign-out-button"
    >
      Sign Out
    </button>
  );
};

export default SignOutButton; 