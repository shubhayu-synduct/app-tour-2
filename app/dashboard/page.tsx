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

// Define the interface for the message structure
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  questionType?: 'main' | 'follow-up';
}

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
        console.error("Error fetching previous queries:", err);
      }
    };

    fetchPreviousQueries();
  }, [user]);

  // Generate suggestions based on search term
  useEffect(() => {
    if (query.trim().length > 0) {
      // Filter previous queries that match the current query
      const matchingQueries = previousQueries.filter(prevQuery => 
        prevQuery.toLowerCase().includes(query.toLowerCase())
      );
      
      // Find queries that start with the search term first
      const exactMatches = matchingQueries.filter(q => 
        q.toLowerCase().startsWith(query.toLowerCase())
      ).sort();
      
      // Then add other matches
      const otherMatches = matchingQueries.filter(q => 
        !q.toLowerCase().startsWith(query.toLowerCase())
      ).sort();
      
      setSuggestions([...exactMatches, ...otherMatches].slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [query, previousQueries]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim() || !user) return
    
    setIsLoading(true)
    console.log("[DASHBOARD] Creating new chat session for query:", query);
    
    try {
      // Create a new session ID using uuidv4
      const sessionId = uuidv4();
      console.log("[DASHBOARD] Generated new sessionId:", sessionId);
      
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
      
      console.log("[DASHBOARD] Adding document to Firebase");
      
      // Add document to Firebase with the pre-generated sessionId
      const db = getFirebaseFirestore();
      await setDoc(doc(db, "conversations", sessionId), newChatSession);
      console.log("[DASHBOARD] Chat session created with ID:", sessionId);
      
      // Store the query in session storage so the chat page can use it
      sessionStorage.setItem(`chat_query_${sessionId}`, query);
      sessionStorage.setItem(`chat_needs_answer_${sessionId}`, "true");
      sessionStorage.setItem(`chat_mode_${sessionId}`, activeMode);
      console.log("[DASHBOARD] Stored query in session storage with key:", `chat_query_${sessionId}`);
      console.log("[DASHBOARD] Set flag to fetch answer:", `chat_needs_answer_${sessionId}`);
      console.log("[DASHBOARD] Stored mode:", activeMode);
      
      // Navigate to the dynamic chat page with the session ID
      console.log("[DASHBOARD] Redirecting to:", `/dashboard/${sessionId}`);
      router.push(`/dashboard/${sessionId}`);
    } catch (error) {
      console.error("[DASHBOARD] Error creating chat session:", error);
      setIsLoading(false);
      alert("Failed to create chat. Please try again.");
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
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
              <h1 className="text-3xl md:text-4xl lg:text-[48px] font-semibold text-[#204398] text-center mb-5 mx-1 md:mb-8">
                Redefining How Medicine Finds Answers
              </h1>
              <form onSubmit={handleSearch} className="w-full max-w-2xl">
                <div ref={searchRef} className="relative mx-auto">
                  <div className="w-full bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-3 md:p-4">
                    <div className="flex items-center">
                      <div className="relative flex-1">
                        <Search className="text-gray-400 h-5 w-5 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <textarea
                          value={query}
                          className="w-full pl-7 text-base md:text-[18px] text-[#223258] font-normal font-['DM_Sans'] outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto"
                          onChange={(e) => {
                            setQuery(e.target.value);
                            // Auto-resize the textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onFocus={() => {
                            if (query) setShowSuggestions(true)
                          }}
                          placeholder="How to treat atopic dermatitis in adults..?"
                          rows={1}
                          style={{ height: 'auto' }}
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <button
                        type="button"
                        className={`px-3 py-1 rounded border text-sm flex items-center gap-1 ${
                          activeMode === 'instant'
                            ? 'bg-[#eef4ff] text-[#003ecb] border-[#003ecb]'
                            : 'bg-white text-gray-500 border-gray-300'
                        }`}
                        onClick={() => setActiveMode(activeMode === 'instant' ? 'research' : 'instant')}
                      >
                        <img src="instant.svg" alt="Instant Mode Icon" className="w-4 h-4" />
                        Acute
                      </button>
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
                    <div className="absolute w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <span className="truncate">{suggestion}</span>
                          <ArrowRight className="h-4 w-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="w-full py-3 md:py-4 text-center text-xs md:text-sm text-gray-400 px-4">
          <p>Dr.info can make mistakes, please double check. Do not enter patients information.</p>
          <Link href="/terms" className="text-black hover:underline inline-block">
            Terms and Conditions
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}