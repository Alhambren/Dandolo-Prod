/**
 * Frontend session management utility for chat sessions
 * Provides stable session IDs and manages session lifecycle
 */
import React from 'react';

const SESSION_STORAGE_KEY = 'dandolo_session_id';
// No timeout - sessions persist until explicitly ended by user

interface SessionInfo {
  sessionId: string;
  createdAt: number;
  lastUsed: number;
}

/**
 * Get or create a session ID for the current chat session
 * Sessions persist until explicitly ended by user
 */
export function getSessionId(): string {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const sessionInfo: SessionInfo = JSON.parse(stored);
      
      // Update last used timestamp and return existing session
      sessionInfo.lastUsed = Date.now();
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionInfo));
      return sessionInfo.sessionId;
    }
  } catch (error) {
    console.warn('Failed to retrieve stored session:', error);
  }

  // Create new session if none exists
  return createNewSession();
}

/**
 * Create a new session and store it
 */
export function createNewSession(): string {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  const sessionInfo: SessionInfo = {
    sessionId,
    createdAt: now,
    lastUsed: now,
  };

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionInfo));
  } catch (error) {
    console.warn('Failed to store session:', error);
  }

  return sessionId;
}

/**
 * Explicitly end the current session (e.g., when starting new chat)
 */
export function endSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to end session:', error);
  }
}

/**
 * Get current session info without updating last used time
 */
export function getCurrentSessionInfo(): SessionInfo | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to get session info:', error);
  }
  
  return null;
}

/**
 * Update the last used timestamp for the current session
 */
export function updateSessionActivity(): void {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const sessionInfo: SessionInfo = JSON.parse(stored);
      sessionInfo.lastUsed = Date.now();
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionInfo));
    }
  } catch (error) {
    console.warn('Failed to update session activity:', error);
  }
}

/**
 * Generate a unique session identifier
 */
function generateSessionId(): string {
  // Generate a unique session ID with timestamp and random component
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  const sessionId = `session_${timestamp}_${randomPart}`;
  
  return sessionId;
}

/**
 * Check if we're currently in an active session
 */
export function hasActiveSession(): boolean {
  return getCurrentSessionInfo() !== null;
}

/**
 * Get session age in minutes
 */
export function getSessionAge(): number | null {
  const sessionInfo = getCurrentSessionInfo();
  if (!sessionInfo) {
    return null;
  }
  
  return Math.floor((Date.now() - sessionInfo.createdAt) / (1000 * 60));
}

/**
 * Get time until session expires (sessions never expire now)
 */
export function getSessionTimeRemaining(): number | null {
  const sessionInfo = getCurrentSessionInfo();
  if (!sessionInfo) {
    return null;
  }
  
  // Sessions no longer have timeouts - they persist until explicitly ended
  return null;
}

/**
 * Hook for React components to manage session state
 */
export function useSession() {
  // Use useState with state updater to properly handle session changes
  const [sessionId, setSessionId] = React.useState(() => {
    return getSessionId();
  });
  
  // Custom endSession that updates the React state
  const endSessionWithUpdate = React.useCallback(() => {
    endSession();
    // Force a new session ID to be generated
    const newSessionId = createNewSession();
    setSessionId(newSessionId);
  }, []);
  
  // Custom createNewSession that updates the React state
  const createNewSessionWithUpdate = React.useCallback(() => {
    const newSessionId = createNewSession();
    setSessionId(newSessionId);
    return newSessionId;
  }, []);
  
  return {
    sessionId,
    hasActiveSession: hasActiveSession(),
    sessionAge: getSessionAge(),
    timeRemaining: getSessionTimeRemaining(),
    endSession: endSessionWithUpdate,
    createNewSession: createNewSessionWithUpdate,
    updateActivity: updateSessionActivity,
  };
}