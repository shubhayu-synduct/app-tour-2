"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import Link from "next/link"
import { format } from 'date-fns'
import { MessageSquare, Trash2, Search, ArrowUpDown, X } from 'lucide-react'
import { doc, deleteDoc } from 'firebase/firestore'
import { getSessionCookie } from '@/lib/auth-service'

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

        console.log("[LOAD] Loaded messages:", sessions);

        setChatSessions(sessions)
      } catch (err) {
        console.error("Error fetching chat sessions:", err)
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
      console.error("Error deleting chat session:", err)
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-800">Chat History</h1>
          <Link 
            href="/dashboard"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            New Chat
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div ref={searchRef} className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchTerm) setShowSuggestions(true)
              }}
              className="pl-10 pr-10 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                <ul className="py-1">
                  {suggestions.map((suggestion, index) => (
                    <li 
                      key={index} 
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer truncate"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="relative">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="appearance-none pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </div>

        {/* Simple Table View */}
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
          ) : filteredAndSortedSessions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? (
                <p>No matching chat sessions found</p>
              ) : (
                <>
                  <p>No chat history found</p>
                  <p className="text-sm mt-1">Start a new conversation by clicking the New Chat button</p>
                </>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-4 border-b border-gray-200 font-medium text-gray-700">Query</th>
                  <th className="text-left p-4 border-b border-gray-200 font-medium text-gray-700 hidden md:table-cell">Date</th>
                  <th className="text-right p-4 border-b border-gray-200 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredAndSortedSessions.map((session) => (
                  <tr 
                    key={session.id}
                    className="hover:bg-blue-50 group"
                  >
                    <td className="p-4">
                      <Link 
                        href={`/dashboard/${session.id}`}
                        className="flex items-start"
                      >
                        <MessageSquare 
                          size={18} 
                          className="mt-1 flex-shrink-0 mr-2 text-gray-500" 
                        />
                        <div>
                          <div className="font-medium text-gray-800">
                            {session.title}
                          </div>
                          <div className="text-xs text-gray-500 md:hidden">
                            {session.updatedAt
                              ? format(
                                  (session.updatedAt && typeof session.updatedAt === 'object' && 'toDate' in session.updatedAt)
                                    ? (session.updatedAt as { toDate: () => Date }).toDate()
                                    : new Date(session.updatedAt),
                                  'MMM d, yyyy h:mm a'
                                )
                              : '—'}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 hidden md:table-cell text-gray-600">
                      {session.updatedAt
                        ? format(
                            (session.updatedAt && typeof session.updatedAt === 'object' && 'toDate' in session.updatedAt)
                              ? (session.updatedAt as { toDate: () => Date }).toDate()
                              : new Date(session.updatedAt),
                            'MMM d, yyyy'
                          )
                        : '—'}
                      <div className="text-xs text-gray-500">
                        {session.updatedAt
                          ? format(
                              (session.updatedAt && typeof session.updatedAt === 'object' && 'toDate' in session.updatedAt)
                                ? (session.updatedAt as { toDate: () => Date }).toDate()
                                : new Date(session.updatedAt),
                              'h:mm a'
                            )
                          : '—'}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => deleteChatSession(session.id, e)}
                        className="p-1.5 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors"
                        aria-label="Delete chat"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
} 