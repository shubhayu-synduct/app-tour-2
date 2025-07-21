"use client"

import { User } from "firebase/auth"
import Cookies from "js-cookie"
import { logger } from '@/lib/logger';

// Cookie name for our session
const SESSION_COOKIE_NAME = "drinfo-session"

// Session duration in days
const SESSION_DURATION = 7

/**
 * Sets the session cookie and notifies other tabs only if needed.
 */
export async function setSessionCookie(user: User) {
  try {
    const newSession = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    }

    // Set the cookie (to refresh expiry)
    Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(newSession), {
      expires: SESSION_DURATION,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })

    // Only sync in production - disable in development to prevent Fast Refresh issues
    if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
      // Check if we already have the exact same session
      const existingSession = getSessionCookie()
      const sessionIsIdentical = existingSession && 
        existingSession.uid === newSession.uid &&
        existingSession.email === newSession.email &&
        existingSession.displayName === newSession.displayName &&
        existingSession.emailVerified === newSession.emailVerified

      if (!sessionIsIdentical) {
        logger.authLog("New/different session detected, notifying other tabs")
        window.localStorage.setItem("auth-sync", JSON.stringify({ 
          action: "login", 
          uid: user.uid,
          timestamp: new Date().getTime() 
        }))
      }
    } else if (process.env.NODE_ENV === "development") {
      logger.authLog("Cross-tab sync disabled in development mode")
    }
    
    logger.authLog("Session cookie set successfully")
  } catch (error) {
    logger.error("Error setting session cookie:", error)
  }
}

/**
 * Retrieves the current session from the cookie.
 */
export function getSessionCookie() {
  const cookie = Cookies.get(SESSION_COOKIE_NAME)
  if (!cookie) return null
  
  try {
    return JSON.parse(cookie)
  } catch (error) {
    logger.error("Error parsing session cookie:", error)
    return null
  }
}

/**
 * Clears the session cookie and notifies other tabs.
 */
export function clearSessionCookie() {
  try {
    // Remove the client-side cookie
    Cookies.remove(SESSION_COOKIE_NAME, { path: "/" })

    // Only sync in production
    if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
      window.localStorage.setItem("auth-sync", JSON.stringify({ 
        action: "logout", 
        timestamp: new Date().getTime() 
      }))
    } else if (process.env.NODE_ENV === "development") {
      logger.authLog("Cross-tab sync disabled in development mode")
    }
    
    logger.authLog("Session cookie cleared")
  } catch (error) {
    logger.error("Error clearing session cookie:", error)
  }
}

/**
 * Checks if the user is authenticated based on the session cookie
 */
export function isAuthenticated() {
  const session = getSessionCookie()
  return !!session
}