"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from 'next/link'
import { collection, addDoc, query as firestoreQuery, where, orderBy, getDocs } from 'firebase/firestore'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { getSessionCookie } from '@/lib/auth-service'
import { getFirebaseFirestore } from '@/lib/firebase'
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { ArrowRight, X, Search } from "lucide-react"
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/lib/logger';
// Removed GoogleGenAI import - now using secure server-side API

// Define the interface for the message structure
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  questionType?: 'main' | 'follow-up';
}

// Initialize the Google AI
// Removed client-side Gemini API usage - now using secure server-side API

export default function Dashboard() {
  const router = useRouter()
  const [activeMode, setActiveMode] = useState<'instant' | 'research'>('research')
  const [searchTerm, setSearchTerm] = useState('')
  const [previousQueries, setPreviousQueries] = useState<string[]>([])
  const user = getSessionCookie()
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const lastQueryRef = useRef<string>("")
  const lastWordRef = useRef<string>("")

  // Check if there's a meaningful change in the query
  const hasMeaningfulChange = (newQuery: string) => {
    const lastQuery = lastQueryRef.current;
    
    // If query is empty, no meaningful change
    if (!newQuery.trim()) return false;
    
    // Check word count - don't send API queries if more than 49 words
    const wordCount = newQuery.trim().split(/\s+/).length;
    if (wordCount > 49) return false;
    
    // If this is the first query, it's meaningful
    if (!lastQuery) {
      lastQueryRef.current = newQuery;
      return true;
    }
    
    // Normalize both queries for comparison (trim and lowercase)
    const normalizedNewQuery = newQuery.trim().toLowerCase();
    const normalizedLastQuery = lastQuery.trim().toLowerCase();
    
    // If the new query is exactly the same as the last query, no change
    if (normalizedNewQuery === normalizedLastQuery) {
      return false;
    }
    
    // If the new query is just a subset of the last query (user is deleting), no change
    if (normalizedLastQuery.startsWith(normalizedNewQuery)) {
      return false;
    }
    
    // If the new query is just adding one character to the last query, no change
    if (normalizedNewQuery.startsWith(normalizedLastQuery) && 
        normalizedNewQuery.length - normalizedLastQuery.length <= 1) {
      return false;
    }
    
    // If we get here, there's a meaningful change
    lastQueryRef.current = newQuery;
    return true;
  };

  // Generate AI-powered suggestions
  const generateAISuggestions = async (input: string) => {
    if (!input.trim() || input.length < 3) return;
    
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: input, 
          previousQueries 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const aiSuggestions = data.suggestions || [];
      
      if (Array.isArray(aiSuggestions)) {
        // Get previous queries suggestions that start with the current input (autocomplete)
        const matchingQueries = previousQueries.filter(prevQuery => 
          prevQuery.toLowerCase().startsWith(input.toLowerCase())
        ).sort().slice(0, 2); // Limit to 2 autocomplete suggestions
        
        // Ensure we have exactly 3 AI suggestions, then add autocomplete
        const finalSuggestions = [...matchingQueries, ...aiSuggestions.slice(0, 3)];
        setSuggestions(finalSuggestions);
      }
    } catch (error) {
      logger.error("Error generating AI suggestions:", error);
      // Fallback to previous queries only (autocomplete)
      const matchingQueries = previousQueries.filter(prevQuery => 
        prevQuery.toLowerCase().startsWith(input.toLowerCase())
      ).sort();
      
      setSuggestions(matchingQueries.slice(0, 3));
    }
  };

  // Handle suggestions with debounce
  useEffect(() => {
    if (query.trim().length > 0) {
      // Clear any existing timeout
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }

      // Set a new timeout
      suggestionTimeoutRef.current = setTimeout(() => {
        // Only generate new suggestions if there's a meaningful change
        if (hasMeaningfulChange(query)) {
          logger.debug("Generating new suggestions for:", query);
          generateAISuggestions(query);
        } else {
          logger.debug("Using existing suggestions for:", query);
          // Keep showing existing suggestions that match
          const matchingQueries = previousQueries
            .filter(prevQuery => prevQuery.toLowerCase().startsWith(query.toLowerCase()))
            .sort()
            .slice(0, 3);
          
          // Only update suggestions if we have matching queries
          if (matchingQueries.length > 0) {
            setSuggestions(matchingQueries);
          }
          // If no matching queries, keep the current suggestions
        }
      }, 300); // 300ms debounce

      // Always show suggestions if we have them
      if (suggestions.length > 0) {
        setShowSuggestions(true);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      lastQueryRef.current = "";
    }

    // Cleanup timeout on unmount or when query changes
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [query, previousQueries]);

  // Fetch previous questions from Firebase to populate suggestions
  useEffect(() => {
    if (!user) return;

    const fetchPreviousQueries = async () => {
      try {
        const db = getFirebaseFirestore();
        const chatSessionQuery = firestoreQuery(
          collection(db, "chatSessions"),
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc")
        );

        const querySnapshot = await getDocs(chatSessionQuery);
        const queries = new Set<string>();

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            // Get user messages with 'main' question type
            const mainQuestions = data.messages
              .filter((msg: ChatMessage) => msg.type === 'user' && msg.questionType === 'main')
              .map((msg: ChatMessage) => msg.content);
            
            mainQuestions.forEach((q: string) => queries.add(q));
          }
        });

        setPreviousQueries(Array.from(queries) as string[]);
      } catch (err) {
        logger.error("Error fetching previous queries:", err);
      }
    };

    fetchPreviousQueries();
  }, [user]);

  // Add event listeners for user activity
  useEffect(() => {
    const handleUserActivity = () => {
      // No need for activity tracking anymore
    };

    // Remove these event listeners as they're no longer needed
    // document.addEventListener('mousemove', handleUserActivity);
    // document.addEventListener('keydown', handleUserActivity);
    // document.addEventListener('click', handleUserActivity);

    return () => {
      // document.removeEventListener('mousemove', handleUserActivity);
      // document.removeEventListener('keydown', handleUserActivity);
      // document.removeEventListener('click', handleUserActivity);
    };
  }, []);

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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim() || !user) return
    
    setIsLoading(true)
    logger.debug("[DASHBOARD] Creating new chat session for query:", query);
    
    try {
      // Create a new session ID using uuidv4
      const sessionId = uuidv4();
      logger.debug("[DASHBOARD] Generated new sessionId:", sessionId);
      
      // Create chat session in Firebase first
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: query,
        timestamp: Date.now(),
        questionType: 'main'
      };
      
      const newChatSession = {
        id: sessionId,
        title: query.substring(0, 100),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        userId: user.uid,
        messages: [userMessage],
        status: 'pending'
      }
      
      logger.debug("[DASHBOARD] Adding document to Firebase");
      
      // Add document to Firebase with the pre-generated sessionId
      const db = getFirebaseFirestore();
      await setDoc(doc(db, "conversations", sessionId), newChatSession);
      logger.debug("[DASHBOARD] Chat session created with ID:", sessionId);
      
      // Store the query in session storage so the chat page can use it
      sessionStorage.setItem(`chat_query_${sessionId}`, query);
      sessionStorage.setItem(`chat_needs_answer_${sessionId}`, "true");
      sessionStorage.setItem(`chat_mode_${sessionId}`, activeMode);
      logger.debug("[DASHBOARD] Stored query in session storage with key:", `chat_query_${sessionId}`);
      logger.debug("[DASHBOARD] Set flag to fetch answer:", `chat_needs_answer_${sessionId}`);
      logger.debug("[DASHBOARD] Stored mode:", activeMode);
      
      // Navigate to the dynamic chat page with the session ID
      logger.debug("[DASHBOARD] Redirecting to:", `/dashboard/${sessionId}`);
      router.push(`/dashboard/${sessionId}`);
    } catch (error) {
      logger.error("[DASHBOARD] Error creating chat session:", error);
      setIsLoading(false);
      alert("Failed to create chat. Please try again.");
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    
    // Force textarea to expand after state update
    const textarea = document.querySelector('textarea');
    if (textarea) {
      // First reset to minimum height
      textarea.style.height = '24px';
      // Force a reflow
      void textarea.offsetHeight;
      // Then set to the actual content height
      const newHeight = Math.max(24, textarea.scrollHeight);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-[calc(100vh-56px)] md:min-h-screen">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[1200px] px-4 md:px-6 py-8 md:py-16">
            <div className="flex flex-col items-center justify-center">
              <h1 className="text-[24px] md:text-[28px] lg:text-[36px] font-semibold text-[#204398] text-center mb-5 mx-1 md:mb-8">
                Redefining How <br/> Medicine Finds Answers
              </h1>
              <form onSubmit={handleSearch} className="w-full max-w-2xl">
                <div ref={searchRef} className="relative mx-auto">
                  <div className="w-full bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-3 md:p-4">
                    <div className="flex items-center">
                      <div className="relative flex-1">
                        <textarea
                          value={query}
                          className="w-full text-base md:text-[18px] text-[#223258] font-normal font-['DM_Sans'] outline-none resize-none min-h-[24px] whitespace-pre-wrap break-words"
                          onChange={(e) => {
                            setQuery(e.target.value);
                            // Auto-resize the textarea
                            const textarea = e.target;
                            textarea.style.height = '24px'; // Reset height
                            const scrollHeight = textarea.scrollHeight;
                            textarea.style.height = `${Math.max(24, scrollHeight)}px`;
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSearch(e);
                            }
                          }}
                          onFocus={(e) => {
                            if (query) setShowSuggestions(true);
                            // Resize on focus if there's content
                            const textarea = e.target;
                            textarea.style.height = '24px';
                            const scrollHeight = textarea.scrollHeight;
                            textarea.style.height = `${Math.max(24, scrollHeight)}px`;
                          }}
                          placeholder="Ask Your Medical Query..."
                          rows={1}
                          style={{ height: '24px' }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      {/* Toggle switch for Acute/Research mode */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={activeMode === 'instant'}
                          onChange={() => setActiveMode(activeMode === 'instant' ? 'research' : 'instant')}
                          className="toggle-checkbox hidden"
                        />
                        <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${activeMode === 'instant' ? 'bg-[#3771FE]' : 'bg-gray-300'}`}
                              style={{ transition: 'background 0.3s' }}>
                          <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${activeMode === 'instant' ? 'translate-x-4' : ''}`}></span>
                        </span>
                        <span className={`font-medium`} style={{ fontSize: '16px', color: activeMode === 'instant' ? '#3771FE' : '#6B7280', fontFamily: 'DM Sans, sans-serif' }}>
                          Acute
                        </span>
                      </label>
                      <button type="submit" className="flex-shrink-0">
                        {isLoading ? (
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <img src="search.svg" alt="Search" width={30} height={30} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Suggestions dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-50">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-[16px] text-[#223258]"
                          onClick={() => {
                            setQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="w-full py-3 md:py-4 text-center text-xs md:text-sm text-gray-400 px-4">
          <p>Do not insert protected health information or personal data.</p>
          <Link href="https://synduct.com/terms-and-conditions/" className="text-black hover:text-[#3771FE] underline inline-block" target="_blank" rel="noopener noreferrer">
            Terms and Conditions
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}