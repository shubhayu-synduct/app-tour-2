"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import Link from "next/link"
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { MessageSquare, Trash2, Search, ArrowUpDown, X, Clock } from 'lucide-react'
import { doc, deleteDoc } from 'firebase/firestore'
import { getSessionCookie } from '@/lib/auth-service'
import { logger } from '@/lib/logger'

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  questionType?: 'main' | 'follow-up';
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  messages?: ChatMessage[];
}

type SortOption = 'newest' | 'oldest' | 'alphabetical';

export default function ChatHistory() {
  const { user } = useAuth()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  
  // Handle clicks outside the search component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setChatSessions([])
      setLoading(false)
      return
    }

    const fetchChatSessions = async () => {
      setLoading(true)
      try {
        const db = getFirebaseFirestore()
        // Always sort by updatedAt in the Firebase query
        const chatSessionQuery = query(
          collection(db, "conversations"),
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc")
        )

        const querySnapshot = await getDocs(chatSessionQuery)
        
        const sessions: ChatSession[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as ChatSession
          
          // Find the main question to use as the title
          let displayTitle = data.title || "New chat"
          
          if (data.messages && data.messages.length > 0) {
            // First look for a message with questionType = 'main'
            const mainQuestion = data.messages.find(msg => 
              msg.type === 'user' && msg.questionType === 'main'
            )
            
            // If a main question is found, use it as the title
            if (mainQuestion) {
              displayTitle = mainQuestion.content
            } else {
              // Fallback to the first user message if no main question is found
              const firstUserMessage = data.messages.find(msg => msg.type === 'user')
              if (firstUserMessage) {
                displayTitle = firstUserMessage.content
              }
            }
            
            // Truncate long titles
            if (displayTitle.length > 60) {
              displayTitle = displayTitle.substring(0, 57) + '...'
            }
          }
          
          sessions.push({
            id: doc.id,
            title: displayTitle,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            userId: data.userId
          })
        })

        logger.debug("[LOAD] Loaded messages:", sessions);

        setChatSessions(sessions)
      } catch (err) {
        logger.error("Error fetching chat sessions:", err)
        setError("Failed to load chat history")
      } finally {
        setLoading(false)
      }
    }

    fetchChatSessions()
  }, [user])
  
  // Generate suggestions based on search term
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      // Get unique words from all titles
      const allTitles = chatSessions.map(session => session.title)
      const uniqueWords = new Set<string>()
      
      allTitles.forEach(title => {
        const words = title.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.length > 2 && word.includes(searchTerm.toLowerCase())) {
            uniqueWords.add(word)
          }
          
          // Also add whole titles that match
          if (title.toLowerCase().includes(searchTerm.toLowerCase())) {
            uniqueWords.add(title)
          }
        })
      })
      
      // Find titles that start with the search term
      const exactMatches = Array.from(uniqueWords)
        .filter(word => word.toLowerCase().startsWith(searchTerm.toLowerCase()))
        .sort()
      
      // Find other matches
      const otherMatches = Array.from(uniqueWords)
        .filter(word => !word.toLowerCase().startsWith(searchTerm.toLowerCase()))
        .sort()
      
      // Combine with exact matches first
      setSuggestions([...exactMatches, ...otherMatches].slice(0, 5))
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchTerm, chatSessions])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    
    if (e.target.value.trim()) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }
  
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    setShowSuggestions(false)
  }
  
  const clearSearch = () => {
    setSearchTerm('')
    setShowSuggestions(false)
  }

  const deleteChatSession = async (sessionId: string, event: React.MouseEvent) => {
    // Prevent navigation when clicking the delete button
    event.preventDefault()
    event.stopPropagation()
    
    if (!confirm("Are you sure you want to delete this chat?")) {
      return
    }
    
    try {
      const db = getFirebaseFirestore()
      await deleteDoc(doc(db, "conversations", sessionId))
      
      // Update the UI by removing the deleted session
      setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (err) {
      logger.error("Error deleting chat session:", err)
      setError("Failed to delete chat. Please try again.")
    }
  }

  // Filter and sort chats
  const filteredAndSortedSessions = chatSessions
    .filter(session => {
      // Apply search filter
      if (searchTerm) {
        return session.title.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return true
    })
    .sort((a, b) => {
      // Apply sorting
      switch (sortOption) {
        case 'newest':
          return b.updatedAt - a.updatedAt
        case 'oldest':
          return a.updatedAt - b.updatedAt
        case 'alphabetical':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 h-full flex flex-col">
        <div className="mb-6 w-full flex justify-center items-center">
          <h1 className="hidden md:block text-4xl font-bold text-center" style={{ fontFamily: 'DM Sans, sans-serif', color: '#214498' }}>History</h1>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 w-full flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto items-center justify-between">
          <div ref={searchRef} className="relative flex-grow min-w-[320px] max-w-xl w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchTerm) setShowSuggestions(true)
              }}
              className="pl-10 pr-10 h-11 w-full border rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-base border-[#3771fe44] shadow-[0px_0px_11px_#0000000c]"
              style={{ fontFamily: 'DM Sans, sans-serif', borderColor: 'rgba(55, 113, 254, 0.5)' }}
            />
            {searchTerm && (
              <button 
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
            {/* Autocomplete suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[2px] shadow-lg max-w-xl w-full" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                <ul className="py-1">
                  {suggestions.map((suggestion, index) => (
                    <li 
                      key={index} 
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer truncate text-base"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="appearance-none pl-10 pr-10 h-11 w-full border rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-base text-[#214498] font-normal"
              style={{ fontFamily: 'DM Sans, sans-serif', color: '#214498', fontWeight: 400, borderColor: 'rgba(55, 113, 254, 0.5)' }}
            >
              <option value="newest" style={{ color: '#214498', fontFamily: 'DM Sans, sans-serif', fontWeight: 'regular' }}>Newest First</option>
              <option value="oldest" style={{ color: '#214498', fontFamily: 'DM Sans, sans-serif', fontWeight: 'regular' }}>Oldest First</option>
              <option value="alphabetical" style={{ color: '#214498', fontFamily: 'DM Sans, sans-serif', fontWeight: 'regular' }}>Alphabetical</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </div>

        {/* Simple Table View */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
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
          ) : filteredAndSortedSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? (
                <p>No matching chat sessions found</p>
              ) : (
                <>
                  <p>No chat history found</p>
                  <p className="text-sm mt-1">Start a new conversation by clicking the New Search button</p>
                </>
              )}
            </div>
          ) : (
            (() => {
              const groups: Record<string, typeof filteredAndSortedSessions> = {};
              filteredAndSortedSessions.forEach(session => {
                const date = new Date(session.updatedAt);
                let groupLabel = format(date, 'MMMM d, yyyy');
                if (isToday(date)) groupLabel = 'Today';
                else if (isYesterday(date)) groupLabel = 'Yesterday';
                if (!groups[groupLabel]) groups[groupLabel] = [];
                groups[groupLabel].push(session);
              });
              return (
                <div className="space-y-8 max-w-4xl mx-auto">
                  {Object.entries(groups).map(([label, sessions]) => (
                    <div key={label}>
                      <div className="text-lg font-semibold text-[#214498] mb-3" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px' }}>{label}</div>
                      <div className="space-y-4">
                        {sessions.map(session => (
                          <div key={session.id} className="bg-[#F4F7FF] rounded-[2px] p-4 flex items-start shadow-sm hover:shadow-md transition-shadow relative border" style={{ borderColor: 'rgba(55, 113, 254, 0.5)' }}>
                            <Link href={`/dashboard/${session.id}`} className="flex-1 min-w-0 group pr-10">
                              <div className="text-base font-medium mb-2 group-hover:underline truncate overflow-hidden whitespace-nowrap" style={{ fontFamily: 'DM Sans, sans-serif', color: '#223258', fontSize: '16px' }}>
                                {session.title}
                              </div>
                              <div className="flex items-center text-xs text-[#7A8CA3] font-['DM_Sans']">
                                <Clock size={14} className="mr-1" />
                                {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                              </div>
                            </Link>
                            <button
                              onClick={e => deleteChatSession(session.id, e)}
                              className="ml-4 p-2 rounded-[2px] transition-colors text-[#223258] absolute top-3 right-3 bg-transparent hover:bg-red-50"
                              aria-label="Delete chat"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}