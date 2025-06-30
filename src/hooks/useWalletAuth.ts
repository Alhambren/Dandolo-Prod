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

  // Load stored session on mount
  useEffect(() => {
    console.log('=== useWalletAuth: Loading stored session ===');
    
    const storedToken = localStorage.getItem(SESSION_STORAGE_KEY);
    const storedExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);
    const storedAddress = localStorage.getItem('dandolo_wallet_address');
    
    console.log('Stored data:', { 
      hasToken: !!storedToken, 
      hasExpiry: !!storedExpiry, 
      storedAddress,
      currentAddress: address 
    });
    
    if (storedToken && storedExpiry && storedAddress) {
      const expiryTime = parseInt(storedExpiry);
      const now = Date.now();
      
      // Normalize addresses for comparison (lowercase) and clean any prefixes
      const cleanCurrentAddress = address?.replace(/^eip155:\d+:/, '').toLowerCase();
      const cleanStoredAddress = storedAddress?.replace(/^eip155:\d+:/, '').toLowerCase();
      
      console.log('Address comparison:', {
        cleanCurrentAddress,
        cleanStoredAddress,
        match: cleanCurrentAddress === cleanStoredAddress,
        expired: now >= expiryTime
      });
      
      if (now < expiryTime && cleanCurrentAddress === cleanStoredAddress) {
        // Session is still valid and wallet matches
        console.log('✅ Loading stored session for address:', cleanCurrentAddress);
        setAuthState(prev => ({
          ...prev,
          sessionToken: storedToken,
          address: storedAddress,
          isAuthenticated: true
        }));
      } else {
        // Session expired or wallet changed - clear storage
        console.log('❌ Clearing stored session - expired or wallet changed:', {
          expired: now >= expiryTime,
          walletChanged: cleanCurrentAddress !== cleanStoredAddress,
          currentAddress: cleanCurrentAddress,
          storedAddress: cleanStoredAddress
        });
        clearStoredSession();
      }
    } else {
      console.log('❌ No complete stored session found');
    }
    console.log('=== End useWalletAuth session loading ===');
  }, [address]);

  // Validate session when token changes
  useEffect(() => {
    if (sessionValidation) {
      if (sessionValidation.authenticated) {
        console.log('Session validation successful for address:', sessionValidation.address);
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          address: sessionValidation.address
        }));
        
        // Auto-renew session if needed
        if (sessionValidation.shouldRenew && authState.sessionToken) {
          renewSession({ sessionToken: authState.sessionToken })
            .then((result) => {
              if (result.success && result.newExpires) {
                localStorage.setItem(SESSION_EXPIRY_KEY, result.newExpires.toString());
                console.log('Session auto-renewed successfully');
              }
            })
            .catch((error) => {
              console.warn('Failed to auto-renew session:', error);
            });
        }
      } else {
        // Session is invalid - clear it
        console.log('Session validation failed:', sessionValidation);
        clearStoredSession();
        setAuthState(prev => ({
          ...prev,
          sessionToken: null,
          isAuthenticated: false,
          address: null
        }));
      }
    }
  }, [sessionValidation, authState.sessionToken, renewSession]);

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
  }, [isConnected, address]);

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    localStorage.removeItem('dandolo_wallet_address');
  }, []);

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

      // Store session securely with cleaned and normalized address
      const cleanAddress = address.replace(/^eip155:\d+:/, '').toLowerCase();
      localStorage.setItem(SESSION_STORAGE_KEY, sessionResult.sessionToken);
      localStorage.setItem(SESSION_EXPIRY_KEY, sessionResult.expires.toString());
      localStorage.setItem('dandolo_wallet_address', cleanAddress);

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
    return success ? authState.sessionToken : null;
  }, [authState.isAuthenticated, authState.sessionToken, authenticate]);

  return {
    ...authState,
    authenticate,
    logout,
    requireAuth,
    isConnected: isConnected && !!address
  };
}