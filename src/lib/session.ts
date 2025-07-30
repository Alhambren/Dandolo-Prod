/**
 * Frontend session management utility for chat sessions
 * Provides stable session IDs and manages session lifecycle
 */
import React from 'react';

const SESSION_STORAGE_KEY = 'dandolo_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes (matches backend)

interface SessionInfo {
  sessionId: string;
  createdAt: number;
  lastUsed: number;
}

/**
 * Get or create a session ID for the current chat session
 * Returns the same session ID for 30 minutes of inactivity
 */
export function getSessionId(): string {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      const sessionInfo: SessionInfo = JSON.parse(stored);
      const now = Date.now();
      
      // Check if session is still valid (within 30 minutes of last use)
      if (now - sessionInfo.lastUsed < SESSION_TIMEOUT) {
        // Update last used timestamp
        sessionInfo.lastUsed = now;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionInfo));
        return sessionInfo.sessionId;
      } else {
        // Session expired, clean it up
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } else {
      // No stored session found
    }
  } catch (error) {
    console.warn('Failed to retrieve stored session:', error);
  }

  // Create new session
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
      const sessionInfo: SessionInfo = JSON.parse(stored);
      const now = Date.now();
      
      // Check if session is still valid
      if (now - sessionInfo.lastUsed < SESSION_TIMEOUT) {
        return sessionInfo;
      }
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
 * Get time until session expires (in minutes)
 */
export function getSessionTimeRemaining(): number | null {
  const sessionInfo = getCurrentSessionInfo();
  if (!sessionInfo) {
    return null;
  }
  
  const timeElapsed = Date.now() - sessionInfo.lastUsed;
  const timeRemaining = SESSION_TIMEOUT - timeElapsed;
  
  return Math.max(0, Math.floor(timeRemaining / (1000 * 60)));
}

/**
 * Hook for React components to manage session state
 */
export function useSession() {
  // Use useState to ensure sessionId is stable across renders
  const [sessionId] = React.useState(() => {
    return getSessionId();
  });
  
  return {
    sessionId,
    hasActiveSession: hasActiveSession(),
    sessionAge: getSessionAge(),
    timeRemaining: getSessionTimeRemaining(),
    endSession,
    createNewSession,
    updateActivity: updateSessionActivity,
  };
}