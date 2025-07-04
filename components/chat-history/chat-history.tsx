"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { PlusCircle, MessageSquare, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { User } from 'firebase/auth'

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  messages?: Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: number;
    questionType?: 'main' | 'follow-up';
  }>;
  chatType: 'main' | 'legacy';
}

interface ChatHistoryProps {
  user: User | null;
  onNewChat?: () => void;
  refreshTrigger?: number;
}

export function ChatHistory({ user, onNewChat, refreshTrigger = 0 }: ChatHistoryProps) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch chat sessions for the current user when user auth changes
  useEffect(() => {
    // If no user, clear sessions and set not loading
    if (!user) {
      setChatSessions([]);
      setLoading(false);
      return;
    }

    console.log("Fetching chat sessions for user:", user.uid);
    
    const fetchChatSessions = async () => {
      if (!user?.uid) return

      try {
        setLoading(true)
        // console.log("Fetching chat sessions for user:", user.uid);
        
        const db = getFirebaseFirestore()
        const conversationsRef = collection(db, "conversations")
        
        // console.log("Building Firestore query for user:", user.uid);
        const q = query(
          conversationsRef,
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc")
        )
        
        // console.log("Executing Firestore query...");
        const querySnapshot = await getDocs(q)
        // console.log(`Retrieved ${querySnapshot.size} chat sessions from Firestore`);
        
        if (querySnapshot.empty) {
          // console.log("No chat sessions found for user ID:", user.uid);
          setChatSessions([])
          return
        }
        
        const sessions: ChatSession[] = []
        
        // Helper to check if value is a Firestore Timestamp
        function isFirestoreTimestamp(val: any): val is { toMillis: () => number } {
          return val && typeof val === 'object' && typeof val.toMillis === 'function';
        }
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          // console.log("Chat session document:", {
          //   id: doc.id,
          //   title: data.title,
          //   createdAt: data.createdAt,
          //   updatedAt: data.updatedAt,
          //   userId: data.userId,
          //   messages: data.messages?.length || 0
          // });
          
          // Convert Firestore timestamps to numbers
          let createdAt = 0
          let updatedAt = 0
          
          if (data.createdAt) {
            createdAt = isFirestoreTimestamp(data.createdAt) 
              ? data.createdAt.toMillis() 
              : data.createdAt
          }
          
          if (data.updatedAt) {
            updatedAt = isFirestoreTimestamp(data.updatedAt) 
              ? data.updatedAt.toMillis() 
              : data.updatedAt
          }
          
          sessions.push({
            id: doc.id,
            title: data.title || 'Untitled Chat',
            createdAt,
            updatedAt,
            userId: data.userId,
            messages: data.messages || [],
            chatType: data.chatType || 'main'
          })
        })
        
        // console.log(`Finished processing ${sessions.length} chat sessions`);
        setChatSessions(sessions)
      } catch (err) {
        console.error("Error fetching chat sessions:", err);
        setError("Failed to load chat history");
      } finally {
        setLoading(false);
      }
    };

    fetchChatSessions();
  }, [user, refreshTrigger]);

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    } else {
      router.push('/dashboard');
    }
  };

  const deleteChatSession = async (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    try {
      // console.log("Deleting chat session:", sessionId);
      const db = getFirebaseFirestore()
      await deleteDoc(doc(db, "conversations", sessionId))
      // console.log("Chat session deleted successfully");
      
      // Refresh the list by removing from state
      setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (error) {
      console.error("Error deleting chat session:", error)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white border-r">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-center" style={{ fontFamily: 'DM Sans, sans-serif', color: '#214498' }}>History</h2>
      </div>

      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-3 bg-blue-600 text-white rounded-md flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={18} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-red-600">{error}</div>
        ) : !user ? (
          <div className="p-4 text-center text-gray-500">
            <p>Please log in to see your chat history</p>
          </div>
        ) : chatSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No chat history found</p>
            <p className="text-sm mt-1">Start a new conversation by clicking the button above</p>
          </div>
        ) : (
          <ul className="space-y-1 p-2">
            {chatSessions.map((session) => (
              <li key={session.id}>
                <Link 
                  href={`/dashboard/${session.id}`}
                  className={`flex items-start gap-3 p-3 hover:bg-gray-100 rounded-md transition-colors group relative ${
                    session.chatType === 'main' ? 'border-l-2 border-blue-500' : ''
                  }`}
                >
                  <MessageSquare 
                    size={18} 
                    className={`mt-1 flex-shrink-0 ${
                      session.chatType === 'main' ? 'text-blue-500' : 'text-gray-500'
                    }`} 
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${
                      session.chatType === 'main' ? 'text-blue-800' : 'text-gray-800'
                    }`}>
                      {session.title}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}</span>
                      {session.chatType === 'main' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Main</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteChatSession(session.id, e)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-red-100"
                    aria-label="Delete chat"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
} 