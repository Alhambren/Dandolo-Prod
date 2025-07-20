import { useState, useEffect, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';

interface AuthState {
  sessionToken: string | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  address: string | null;
}

const SESSION_STORAGE_KEY = 'dandolo_wallet_session';
const SESSION_EXPIRY_KEY = 'dandolo_session_expiry';

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [authState, setAuthState] = useState<AuthState>({
    sessionToken: null,
    isAuthenticated: false,
    isAuthenticating: false,
    address: null
  });

  const generateChallenge = useMutation(api.auth.generateAuthChallenge);
  const verifySignature = useMutation(api.auth.verifyWalletSignature);
  const renewSession = useMutation(api.auth.renewSession);
  
  // Query to validate existing session
  const sessionValidation = useQuery(
    api.auth.getAuthenticatedUser,
    authState.sessionToken ? { sessionToken: authState.sessionToken } : 'skip'
  );

  // Load and validate stored session on mount and when wallet connects
  useEffect(() => {
    if (!isConnected || !address) {
      return;
    }

    const storedToken = localStorage.getItem(SESSION_STORAGE_KEY);
    const storedExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    const storedAddress = localStorage.getItem('dandolo_wallet_address');
    
    if (storedToken && storedExpiry && storedAddress) {
      const expiry = parseInt(storedExpiry, 10);
      const normalizedStoredAddress = storedAddress.toLowerCase();
      const normalizedCurrentAddress = address.toLowerCase();
      
      // Check if session is valid for current wallet
      if (normalizedStoredAddress === normalizedCurrentAddress && expiry > Date.now()) {
        console.log('Restoring valid session for', address);
        setAuthState({
          sessionToken: storedToken,
          isAuthenticated: true,
          isAuthenticating: false,
          address: address
        });
      } else {
        // Clear invalid session
        console.log('Clearing invalid or expired session');
        clearStoredSession();
      }
    }
  }, [isConnected, address]);

  // Validate session token with backend
  useEffect(() => {
    if (sessionValidation !== undefined) {
      if (sessionValidation.authenticated) {
        console.log('Session validated successfully');
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          address: sessionValidation.address
        }));
        
        // Auto-renew if needed
        if (sessionValidation.shouldRenew && authState.sessionToken) {
          renewSession({ sessionToken: authState.sessionToken })
            .then((result) => {
              if (result.success && result.newExpires) {
                localStorage.setItem(SESSION_EXPIRY_KEY, result.newExpires.toString());
                console.log('Session auto-renewed');
              }
            })
            .catch(console.error);
        }
      } else {
        console.log('Session validation failed, clearing session');
        clearStoredSession();
        setAuthState({
          sessionToken: null,
          isAuthenticated: false,
          isAuthenticating: false,
          address: null
        });
      }
    }
  }, [sessionValidation, authState.sessionToken, renewSession]);

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem('dandolo_wallet_address');
  }, []);

  // Clear session when wallet disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      clearStoredSession();
      setAuthState({
        sessionToken: null,
        isAuthenticated: false,
        isAuthenticating: false,
        address: null
      });
    }
  }, [isConnected, address, clearStoredSession]);

  const authenticate = useCallback(async () => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    try {
      setAuthState(prev => ({ ...prev, isAuthenticating: true }));

      // Generate challenge
      const challengeResult = await generateChallenge({ address });

      // Sign challenge
      const signature = await signMessageAsync({
        message: challengeResult.challenge
      });

      // Verify signature and get session token
      const sessionResult = await verifySignature({
        address,
        challenge: challengeResult.challenge,
        signature
      });

      // Store session
      localStorage.setItem(SESSION_STORAGE_KEY, sessionResult.sessionToken);
      localStorage.setItem(SESSION_EXPIRY_KEY, sessionResult.expires.toString());
      localStorage.setItem('dandolo_wallet_address', address.toLowerCase());

      setAuthState({
        sessionToken: sessionResult.sessionToken,
        isAuthenticated: true,
        isAuthenticating: false,
        address
      });

      toast.success('Wallet authenticated successfully');
      return true;

    } catch (error) {
      console.error('Authentication failed:', error);
      toast.error('Authentication failed. Please try again.');
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticating: false
      }));
      
      return false;
    }
  }, [address, isConnected, generateChallenge, signMessageAsync, verifySignature]);

  const logout = useCallback(() => {
    clearStoredSession();
    setAuthState({
      sessionToken: null,
      isAuthenticated: false,
      isAuthenticating: false,
      address: null
    });
    toast.success('Logged out successfully');
  }, [clearStoredSession]);

  const requireAuth = useCallback(async (): Promise<string | null> => {
    if (authState.isAuthenticated && authState.sessionToken) {
      return authState.sessionToken;
    }
    
    const success = await authenticate();
    if (success) {
      // Wait for state to update
      return new Promise((resolve) => {
        setTimeout(() => {
          const token = localStorage.getItem(SESSION_STORAGE_KEY);
          resolve(token);
        }, 100);
      });
    }
    return null;
  }, [authState.isAuthenticated, authState.sessionToken, authenticate]);

  return {
    ...authState,
    authenticate,
    logout,
    requireAuth,
    isConnected: isConnected && !!address
  };
}