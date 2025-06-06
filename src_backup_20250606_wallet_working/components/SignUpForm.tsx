import React from 'react';
import { useSignUp } from '@clerk/clerk-react';
import GlassCard from './GlassCard';

const SignUpForm: React.FC = () => {
  const { signUp, isLoaded } = useSignUp();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
      });

      if (result.status === 'complete') {
        window.location.href = '/dashboard';
      } else {
        setError('Please check your email for verification.');
      }
    } catch (err) {
      setError('Error creating account. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 flex items-center justify-center p-4" data-testid="sign-up-form">
      <GlassCard className="w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6" data-testid="sign-up-title">Create Account</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg p-4 mb-6" data-testid="sign-up-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red"
              required
              data-testid="email-input"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red"
              required
              data-testid="password-input"
            />
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-gradient-to-r from-red to-gold text-white rounded-lg hover:shadow-lg transition-all"
            disabled={!isLoaded}
            data-testid="sign-up-button"
          >
            {isLoaded ? 'Create Account' : 'Loading...'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/sign-in"
            className="text-sm text-gray-300 hover:text-white transition-colors"
            data-testid="sign-in-link"
          >
            Already have an account? Sign in
          </a>
        </div>
      </GlassCard>
    </div>
  );
};

export default SignUpForm; 