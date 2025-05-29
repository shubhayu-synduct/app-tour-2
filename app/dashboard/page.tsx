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
  const [query, setQuery] = useState("How to treat atopic dermatitis in adults")
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
      <div className="p-4 md:p-6 h-full flex flex-col relative">
        <div className="flex justify-end mb-6">
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="font-medium">{user?.displayName || "Dr. Thomas Müller"}</p>
              <p className="text-sm text-gray-500">Physician</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
              {user?.displayName?.[0] || "T"}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-[48px] font-semibold text-[#204398] text-center mb-2">
              Redefining How Medicine Finds Answers
            </h1>
            <p className="text-[20px] text-[#596c98] text-center mb-8">
                Instant access to evidence-based, trusted sources derived precision information
            </p>
            <form onSubmit={handleSearch} className="w-full max-w-2xl">
              <div ref={searchRef} className="relative mx-auto mt-4">
                <div className="w-full max-w-[853px] bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-4">
                  <div className="flex items-center">
                    <Search className="text-gray-400 h-5 w-5 mr-2" />
                    <input
                      type="text"
                      value={query}
                      className="ml-2 flex-1 text-[18px] text-[#9499a8] outline-none"
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => {
                        if (query) setShowSuggestions(true)
                      }}
                      placeholder="How to treat atopic dermatitis in adults"
                    />
                    <button type="submit">
                      {isLoading ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <img src="search.svg" alt="Search" width={30} height={30} />
                      )}
                    </button>
                  </div>

                  <div className="flex space-x-2 mt-1">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded border text-sm flex items-center gap-1 ${
                        activeMode === 'instant'
                          ? 'bg-[#eef4ff] text-[#003ecb] border-[#003ecb]'
                          : 'bg-white text-gray-500 border-gray-300'
                      }`}
                      onClick={() => setActiveMode('instant')}
                    >
                      <img src="instant.svg" alt="Instant Mode Icon" className="w-4 h-4" />
                      Acute
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded border text-sm flex items-center gap-1 ${
                        activeMode === 'research'
                          ? 'bg-[#eef4ff] text-[#003ecb] border-[#003ecb]'
                          : 'bg-white text-gray-500 border-gray-300'
                      }`}
                      onClick={() => setActiveMode('research')}
                    >
                      <img src="research.svg" alt="Research Mode Icon" className="w-4 h-4" />
                      Research
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}