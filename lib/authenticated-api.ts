"use client"

import { getFirebaseAuth } from './firebase';
import { logger } from './logger';

// Backend API base URL - update this to match your backend
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'https://synduct-drugsummary.drinfo.ai';

export interface ApiOptions {
  requireAuth?: boolean;
  database?: 'english' | 'portuguese';
}

/**
 * Make an authenticated API request to the backend
 * @param endpoint - API endpoint (e.g., '/api/search')
 * @param options - Request options
 * @param apiOptions - Additional API configuration
 */
export async function makeAuthenticatedRequest(
  endpoint: string,
  options: RequestInit = {},
  apiOptions: ApiOptions = {}
): Promise<Response> {
  const url = `${BACKEND_API_URL}${endpoint}`;
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };

  // Get authentication - REQUIRED for medical application
  try {
    const auth = await getFirebaseAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Authentication required. Please sign in to access drug information.');
    }
    
    const idToken = await user.getIdToken();
    headers['Authorization'] = `Bearer ${idToken}`;
    logger.apiLog(`Making authenticated request to ${endpoint} for user: ${user.email}`);
  } catch (error) {
    logger.error('Authentication error:', error);
    throw new Error('Authentication required. Please sign in to access drug information.');
  }

  // Add database parameter if specified
  if (apiOptions.database) {
    const urlObj = new URL(url);
    urlObj.searchParams.set('database', apiOptions.database);
    return fetch(urlObj.toString(), {
      ...options,
      headers
    });
  }

  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Search for drugs using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function searchDrugs(
  query: string, 
  limit: number = 10,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/search?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database }
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Enhanced search for drugs using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function enhancedSearchDrugs(
  query: string,
  limit: number = 10,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString()
  });
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/enhanced-search?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database }
  );

  if (!response.ok) {
    throw new Error(`Enhanced search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get drug information using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function getDrugInfo(
  drugName: string,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams();
  
  if (database) {
    params.set('database', database);
  }

  const queryString = params.toString();
  const endpoint = `/api/drugs/${encodeURIComponent(drugName)}${queryString ? `?${queryString}` : ''}`;

  const response = await makeAuthenticatedRequest(
    endpoint,
    { method: 'GET' },
    { requireAuth: true, database }
  );

  if (!response.ok) {
    throw new Error(`Failed to get drug info: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get drug library using the authenticated backend API
 * REQUIRES AUTHENTICATION
 */
export async function getDrugLibrary(
  letter?: string,
  limit?: number,
  offset: number = 0,
  database?: 'english' | 'portuguese'
): Promise<any> {
  const params = new URLSearchParams({
    offset: offset.toString()
  });
  
  if (letter) {
    params.set('letter', letter);
  }
  
  if (limit) {
    params.set('limit', limit.toString());
  }
  
  if (database) {
    params.set('database', database);
  }

  const response = await makeAuthenticatedRequest(
    `/api/library/drugs?${params.toString()}`,
    { method: 'GET' },
    { requireAuth: true, database }
  );

  if (!response.ok) {
    throw new Error(`Failed to get drug library: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get user status and database preference
 * REQUIRES AUTHENTICATION
 */
export async function getUserStatus(): Promise<any> {
  const response = await makeAuthenticatedRequest(
    '/api/user-status',
    { method: 'GET' },
    { requireAuth: true }
  );

  if (!response.ok) {
    throw new Error(`Failed to get user status: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get geo-location information
 * This endpoint can work without authentication for fallback purposes
 */
export async function getGeoLocation(): Promise<any> {
  const response = await fetch(`${BACKEND_API_URL}/api/geo-location`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get geo-location: ${response.status} ${response.statusText}`);
  }

  return response.json();
}