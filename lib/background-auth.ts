"use client"

import { getFirebaseAuth } from './firebase';
import { logger } from './logger';

export interface UserAuthStatus {
  isAuthenticated: boolean;
  country?: string;
  database: 'english' | 'portuguese';
  source: 'user_preference' | 'geo_location' | 'fallback';
}

/**
 * Background authentication verification with timeout and fallback
 * - Tries to authenticate and get user country for 1 minute
 * - Falls back to English database if authentication fails or times out
 * - Only Portugal gets Portuguese database, all others get English
 */
export async function verifyAuthenticationBackground(timeoutMs: number = 60000): Promise<UserAuthStatus> {
  const fallbackResult: UserAuthStatus = {
    isAuthenticated: false,
    database: 'english',
    source: 'fallback'
  };

  try {
    // Create a promise that resolves with authentication status
    const authPromise = new Promise<UserAuthStatus>(async (resolve) => {
      try {
        const auth = await getFirebaseAuth();
        const user = auth.currentUser;
        
        if (!user) {
          resolve(fallbackResult);
          return;
        }

        // Get ID token
        const idToken = await user.getIdToken();
        
        // Make request to backend to get user status
        const response = await fetch('http://localhost:8002/api/user-status', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          resolve(fallbackResult);
          return;
        }

        const data = await response.json();
        
        // Apply our business logic: Only Portugal gets Portuguese, everything else gets English
        const database = (data.country?.toLowerCase() === 'portugal') ? 'portuguese' : 'english';
        
        resolve({
          isAuthenticated: true,
          country: data.country,
          database,
          source: data.country ? 'user_preference' : 'geo_location'
        });

      } catch (error) {
        logger.warn('Background authentication failed:', error);
        resolve(fallbackResult);
      }
    });

    // Create a timeout promise
    const timeoutPromise = new Promise<UserAuthStatus>((resolve) => {
      setTimeout(() => {
        logger.warn('Authentication verification timed out, falling back to English database');
        resolve(fallbackResult);
      }, timeoutMs);
    });

    // Race between authentication and timeout
    const result = await Promise.race([authPromise, timeoutPromise]);
    
    logger.authLog('Background authentication result:', result);
    return result;

  } catch (error) {
    logger.warn('Background authentication error:', error);
    return fallbackResult;
  }
}

/**
 * Quick authentication check without timeout (for immediate use)
 */
export async function getQuickAuthStatus(): Promise<UserAuthStatus> {
  try {
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      return {
        isAuthenticated: false,
        database: 'english',
        source: 'fallback'
      };
    }

    return {
      isAuthenticated: true,
      database: 'english', // Default to English, will be updated by background verification
      source: 'fallback'
    };

  } catch (error) {
    return {
      isAuthenticated: false,
      database: 'english',
      source: 'fallback'
    };
  }
}

/**
 * Cache for authentication status to avoid repeated calls
 */
let authStatusCache: UserAuthStatus | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedAuthStatus(): Promise<UserAuthStatus> {
  const now = Date.now();
  
  // Return cached result if still valid
  if (authStatusCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return authStatusCache;
  }

  // Get fresh authentication status
  const authStatus = await verifyAuthenticationBackground();
  
  // Cache the result
  authStatusCache = authStatus;
  cacheTimestamp = now;
  
  return authStatus;
}