"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { PlusCircle, MessageSquare, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { User } from 'firebase/auth'
import { logger } from '@/lib/logger'

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

    logger.debug("Fetching chat sessions for user:", user.uid);
    
    const fetchChatSessions = async () => {
      setLoading(true);
      try {
        const db = getFirebaseFirestore()
        logger.debug("Building Firestore query for user:", user.uid);
        
        const chatSessionQuery = query(
          collection(db, "conversations"),
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc")
        );

        logger.debug("Executing Firestore query...");
        const querySnapshot = await getDocs(chatSessionQuery);
        logger.debug(`Retrieved ${querySnapshot.size} chat sessions from Firestore`);
        
        if (querySnapshot.empty) {
          logger.debug("No chat sessions found for user ID:", user.uid);
        }
        
        const sessions: ChatSession[] = [];

        // Helper to check if value is a Firestore Timestamp
        function isFirestoreTimestamp(val: any): val is { toMillis: () => number } {
          return val && typeof val === 'object' && typeof val.toMillis === 'function';
        }

        querySnapshot.forEach((doc) => {
          const data = doc.data() as ChatSession;
          // Convert Firestore Timestamp to number if needed
          const updatedAt = isFirestoreTimestamp(data.updatedAt)
            ? data.updatedAt.toMillis()
            : data.updatedAt;
          const createdAt = isFirestoreTimestamp(data.createdAt)
            ? data.createdAt.toMillis()
            : data.createdAt;
          // Use the title field or fallback
          let displayTitle = data.title || "New chat";
            // Truncate long titles
            if (displayTitle.length > 60) {
              displayTitle = displayTitle.substring(0, 57) + '...';
            }
          logger.debug("Chat session document:", {
            id: doc.id,
            title: displayTitle,
            originalTitle: data.title,
            createdAt: createdAt ? new Date(createdAt).toISOString() : "undefined",
            updatedAt: updatedAt ? new Date(updatedAt).toISOString() : "undefined"
          });
          sessions.push({
            id: doc.id,
            title: displayTitle,
            createdAt,
            updatedAt,
            userId: data.userId,
            chatType: 'main'
          });
        });

        // Explicitly sort by updatedAt descending (newest first)
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        setChatSessions(sessions);
        logger.debug(`Finished processing ${sessions.length} chat sessions`);
      } catch (err) {
        logger.error("Error fetching chat sessions:", err);
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
    // Prevent navigation when clicking the delete button
    event.preventDefault();
    event.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this chat?")) {
      return;
    }
    
    try {
      logger.debug("Deleting chat session:", sessionId);
      const db = getFirebaseFirestore()
      await deleteDoc(doc(db, "conversations", sessionId));
      logger.debug("Chat session deleted successfully");
      
      // Update the UI by removing the deleted session
      setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    } catch (err) {
      logger.error("Error deleting chat session:", err);
      setError("Failed to delete chat. Please try again.");
    }
  };

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