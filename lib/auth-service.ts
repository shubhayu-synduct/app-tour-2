"use client"

import { User } from "firebase/auth"
import Cookies from "js-cookie"

// Cookie name for our session
const SESSION_COOKIE_NAME = "drinfo-session"

// Session duration in days
const SESSION_DURATION = 7

/**
 * Sets the session cookie after successful authentication
 */
export function setSessionCookie(user: User) {
  try {
    // Create a session object with essential user info
    const session = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      timestamp: Date.now()
    }
    
    // Store as a cookie with expiry
    Cookies.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
      expires: SESSION_DURATION,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production"
    })
    
    console.log("Session cookie set successfully")
    return true
  } catch (error) {
    console.error("Error setting session cookie:", error)
    return false
  }
}

/**
 * Retrieves the current session from the cookie
 */
export function getSessionCookie() {
  try {
    const cookie = Cookies.get(SESSION_COOKIE_NAME)
    if (!cookie) return null
    
    return JSON.parse(cookie)
  } catch (error) {
    console.error("Error parsing session cookie:", error)
    return null
  }
}

/**
 * Clears the session cookie on logout
 */
export function clearSessionCookie() {
  try {
    Cookies.remove(SESSION_COOKIE_NAME, { path: "/" })
    console.log("Session cookie cleared")
    return true
  } catch (error) {
    console.error("Error clearing session cookie:", error)
    return false
  }
}

/**
 * Checks if the user is authenticated based on the session cookie
 */
export function isAuthenticated() {
  const session = getSessionCookie()
  return !!session
} 