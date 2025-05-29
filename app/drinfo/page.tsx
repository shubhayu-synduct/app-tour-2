"use client"

import React, { useState, useEffect } from 'react'
import { DrInfoSummary } from '@/components/drinfo-summary/drinfo-summary'
import { ChatHistory } from '@/components/chat-history/chat-history'
import { Menu, X } from 'lucide-react'
import { getFirebaseAuth } from '@/lib/firebase'
import { User } from 'firebase/auth'

export default function DrInfoPage() {
  const [showSidebar, setShowSidebar] = useState(true)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [user, setUser] = useState<User | null>(null)
  
  // Listen for auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth()
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      console.log("Auth state changed:", authUser ? "User logged in" : "No user");
      if (authUser) {
        console.log("User ID:", authUser.uid);
        setUser(authUser);
      } else {
        setUser(null);
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  const toggleSidebar = () => {
    setShowSidebar(prev => !prev)
  }
  
  const handleNewChat = () => {
    // If already on main page, just refresh and create a new trigger
    window.location.href = '/drinfo'
    setRefreshTrigger(prev => prev + 1)
  }
  
  return (
    <div className="h-screen flex overflow-hidden">
      {/* Chat History Sidebar */}
      {showSidebar && (
        <div className="w-80 h-full flex-shrink-0 border-r">
          <ChatHistory 
            user={user} 
            onNewChat={handleNewChat}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}
      
      {/* Sidebar Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-100"
        aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
      >
        {showSidebar ? <X size={20} /> : <Menu size={20} />}
      </button>
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <DrInfoSummary 
          user={user}
          onChatCreated={() => setRefreshTrigger(prev => prev + 1)}
        />
      </div>
    </div>
  )
} 