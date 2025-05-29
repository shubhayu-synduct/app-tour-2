"use client"

import React, { useState, useEffect, useRef } from 'react'
import { ArrowRight, ChevronDown, Copy, Search, ExternalLink, X, FileEdit } from 'lucide-react'
import { fetchDrInfoSummary, sendFollowUpQuestion, DrInfoSummaryData, Citation } from '@/lib/drinfo-summary-service'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { useRouter, usePathname } from 'next/navigation'
import AnswerFeedback from '../feedback/answer-feedback'
import { getStatusMessage, StatusType } from '@/lib/status-messages'
import { ReferencesSidebar } from "@/components/references/ReferencesSidebar"
import { ReferenceGrid } from "@/components/references/ReferenceGrid"
import { formatWithCitations, formatWithDummyCitations } from '@/lib/formatWithCitations'
import { createCitationTooltip } from '@/lib/citationTooltipUtils'
import { marked } from 'marked'

interface DrInfoSummaryProps {
  user: any;
  chatId?: string; // Optional chatId for loading a specific chat
  onChatCreated?: () => void; // Callback when a new chat is created
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  questionType?: 'main' | 'follow-up';
  answer?: {
    mainSummary: string;
    sections: Array<{
      id: string;
      title: string;
      content: string;
    }>;
    citations?: Record<string, Citation>;
  };
  feedback?: {
    likes: number;
    dislikes: number;
    userFeedback?: {
      id: string;
      userId: string;
      messageId: string;
      type: 'like' | 'dislike' | 'text';
      content?: string;
      timestamp: string;
    };
  };
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  messages: ChatMessage[];
}

// Add this interface for parsed content
interface ParsedContent {
  mainSummary: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

const KNOWN_STATUSES: StatusType[] = ['processing', 'searching', 'summarizing', 'formatting', 'complete'];

export function DrInfoSummary({ user, chatId, onChatCreated }: DrInfoSummaryProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamedContent, setStreamedContent] = useState<ParsedContent>({ mainSummary: '', sections: [] })
  const [status, setStatus] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [completeData, setCompleteData] = useState<DrInfoSummaryData | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [searchPosition, setSearchPosition] = useState<"middle" | "bottom">("middle")
  const [showCitationsSidebar, setShowCitationsSidebar] = useState(false)
  const [activeCitations, setActiveCitations] = useState<Record<string, Citation> | null>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('');
  const router = useRouter()
  const pathname = usePathname()

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatId) {
      // If a chat ID is provided, load that specific chat session
      loadChatSession(chatId);
    } else {
      // For a new chat, clear the chat history 
      // We'll create a new ID when the user makes the first search
      setCurrentChatId(null);
      setChatHistory([]);
      console.log("Ready for new chat session");
    }
  }, [chatId]);

  useEffect(() => {
    // Check for Firebase user presence and log info
    if (user) {
      const userId = user.uid || user.id;
      console.log("DrInfoSummary component initialized with user:", {
        userId,
        hasUid: !!user.uid,
        hasId: !!user.id,
        authenticationType: user.uid ? "Firebase Auth" : "Custom Auth",
      });
    } else {
      console.log("DrInfoSummary component initialized with NO USER");
    }
  }, [user]);

  const loadChatSession = async (chatId: string) => {
    setIsChatLoading(true);
    try {
      console.log("[LOAD] Loading chat session with ID:", chatId);
      const db = getFirebaseFirestore()
      const chatDocRef = doc(db, "chatSessions", chatId);
      const chatDoc = await getDoc(chatDocRef);
      
      if (chatDoc.exists()) {
        console.log("[LOAD] Chat document exists, getting data...");
        const chatData = chatDoc.data() as ChatSession;
        console.log("[LOAD] Chat data retrieved:", {
          title: chatData.title,
          messageCount: chatData.messages?.length || 0,
          updatedAt: new Date(chatData.updatedAt).toISOString(),
        });

        // Set chat history
        setChatHistory(chatData.messages || []);
        setCurrentChatId(chatId); // Use the Firestore document ID
        setSearchPosition("bottom");
        
        // Check if this is a newly created session without an assistant response
        const hasUserMessage = chatData.messages?.some(msg => msg.type === 'user');
        const hasAssistantMessage = chatData.messages?.some(msg => msg.type === 'assistant');
        
        console.log("[LOAD] Messages check - has user:", hasUserMessage, "has assistant:", hasAssistantMessage);
        
        if (hasUserMessage && !hasAssistantMessage) {
          // Get the user's question
          const userMessage = chatData.messages?.find(msg => msg.type === 'user');
          
          if (userMessage) {
            console.log("[LOAD] Found user message without assistant response, will trigger API call:", userMessage.content);
            setQuery(userMessage.content);
          }
        }
      } else {
        console.error("[LOAD] Chat session not found for ID:", chatId);
        setError("The chat session is being created. If this message persists, please try refreshing the page.");
        
        // Check if we have a query in session storage as a fallback
        const storedQuery = typeof window !== 'undefined' ? sessionStorage.getItem(`chat_query_${chatId}`) : null;
        if (storedQuery) {
          // We have a query but no document yet, set up a minimal state to allow the search to proceed
          console.log("[LOAD] No document yet, but found stored query, setting up minimal state");
          setCurrentChatId(chatId);
          setSearchPosition("bottom");
          
          // Create initial user message
          const userMessage = {
            id: `user-${Date.now()}`,
            type: 'user' as const,
            content: storedQuery,
            timestamp: Date.now(),
            questionType: 'main' as const
          };
          
          setChatHistory([userMessage]);
          setQuery(storedQuery);
          setLastQuestion(storedQuery); // <-- Set lastQuestion from session storage fallback
          
          // Clear stored query to avoid reusing it
          sessionStorage.removeItem(`chat_query_${chatId}`);
        }
      }
    } catch (err) {
      console.error("[LOAD] Error loading chat session:", err);
      setError("Failed to load chat session. Please try refreshing the page.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveChatSession = async (messages: ChatMessage[]): Promise<string | null> => {
    console.log("Attempting to save chat session...");
    console.log("User object:", user);
    console.log("Current chatId:", chatId);
    console.log("Current currentChatId:", currentChatId);
    
    // Check for user - prioritize Firebase auth user ID if available
    // Firebase auth users have uid property instead of id
    const userId = user?.uid || user?.id;
    
    if (!userId) {
      console.warn("User not authenticated (no uid/id), chat history not saved");
      return null;
    }

    try {
      const firstUserMessage = messages.find(m => m.type === 'user');
      const title = firstUserMessage ? firstUserMessage.content.substring(0, 100) : "New chat";
      
      // If we're on a chat page with a chatId, use that ID
      if (chatId) {
        console.log("Updating chat session from URL chatId:", chatId);
        
        try {
          const db = getFirebaseFirestore()
          const chatDocRef = doc(db, "chatSessions", chatId);
          const updateData = {
            title,
            updatedAt: Date.now(),
            messages
          };
          
          await updateDoc(chatDocRef, updateData);
          console.log("Document successfully updated with URL chatId");
          return chatId;
        } catch (updateError) {
          console.error("Error updating document with URL chatId:", updateError);
          throw updateError;
        }
      }
      // If we have a currentChatId set in state, use that
      else if (currentChatId) {
        console.log("Updating existing chat session with currentChatId:", currentChatId);
        
        try {
          const db = getFirebaseFirestore()
          const chatDocRef = doc(db, "chatSessions", currentChatId);
          const updateData = {
            title,
            updatedAt: Date.now(),
            messages
          };
          
          await updateDoc(chatDocRef, updateData);
          console.log("Document successfully updated with currentChatId");
          return currentChatId;
        } catch (updateError) {
          console.error("Error updating document with currentChatId:", updateError);
          throw updateError;
        }
      } 
      // Otherwise create a new document with the given chatId from the URL
      else {
        console.log("Creating new chat session...");
        
        const newChatSession: ChatSession = {
          id: chatId || uuidv4(), // Use URL chatId if available
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          userId: userId,
          messages
        };
        
        try {
          const db = getFirebaseFirestore()
          const docRef = await addDoc(collection(db, "chatSessions"), newChatSession);
          console.log("Document successfully written with ID:", docRef.id);
          
          // Update the current chat ID with the Firestore document ID
          setCurrentChatId(docRef.id);
          
          if (onChatCreated) {
            onChatCreated();
          }
          
          return docRef.id;
        } catch (addError) {
          console.error("Error adding document:", addError);
          throw addError;
        }
      }
    } catch (err) {
      console.error("Error saving chat session:", err);
      return null;
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [streamedContent, chatHistory])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showCitationsSidebar && 
          !target.closest('.citations-sidebar') && 
          !target.closest('.show-all-citations-btn')) {
        setShowCitationsSidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCitationsSidebar]);

  const resetState = () => {
    setStreamedContent({ mainSummary: '', sections: [] })
    setStatus(null)
    setStatusMessage(null)
    setCompleteData(null)
    setError(null)
    setShowCitationsSidebar(false)
    setIsStreaming(true)
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  useEffect(() => {
    console.log("[SEARCH] Component state update:", {
      chatID: chatId,
      isChatLoading,
      query,
      hasFetched,
      chatHistory
    });
    if (chatId && !isChatLoading) {
      const hasAssistantMessage = chatHistory.some(msg => msg.type === 'assistant');
      // Only trigger if streamedContent.mainSummary is empty
      if (!hasAssistantMessage && !hasFetched && query && streamedContent.mainSummary === '') {
        setHasFetched(true);
        handleSearchWithContent(query);
      }
    }
  }, [chatId, isChatLoading, query, hasFetched, chatHistory, streamedContent.mainSummary]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    console.log("[SEARCH] Search initiated with state:", {
      chatID: chatId,
      isChatLoading,
      query,
      hasFetched
    });
    
    if (!query.trim()) {
      console.log("[SEARCH] Empty query, aborting search");
      return;
    }
    setLastQuestion(query);
    handleSearchWithContent(query);
  }

  const handleFollowUpQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!followUpQuestion.trim()) return
    
    setLastQuestion(followUpQuestion);
    resetState()
    setIsLoading(true)
    setIsStreaming(true)
    
    // Create user message with 'follow-up' question type
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user' as const,
      content: followUpQuestion,
      timestamp: Date.now(),
      questionType: 'follow-up' as const
    };
    
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory as ChatMessage[]);
    console.log("[FOLLOWUP] Added follow-up question to chat history:", followUpQuestion);
    
    try {
      const previousQuestion = chatHistory.filter(msg => msg.type === 'user').pop()?.content || '';
      const followUpContent = followUpQuestion; // Store in variable in case state changes
      
      console.log("[FOLLOWUP] Previous question:", previousQuestion);
      console.log("[FOLLOWUP] Follow-up question:", followUpContent);
      
      let finalContent = '';
      
      await sendFollowUpQuestion(
        previousQuestion,
        followUpContent,
        (chunk) => {
          console.log("[FOLLOWUP] Received chunk length:", chunk.length);
          finalContent += chunk;
          // Parse the content as it comes in for better user experience
          try {
            const parsedContent = parseContent(finalContent);
            console.log("[FOLLOWUP] Parsed content, main summary length:", parsedContent.mainSummary.length);
            setStreamedContent(parsedContent);
          } catch (e) {
            console.error("[FOLLOWUP] Error parsing streaming content:", e);
          }
        },
        (newStatus, message) => {
          console.log("[FOLLOWUP] Status update:", newStatus, message);
          setStatus(newStatus)
          if (message) setStatusMessage(message)
        },
        async (data) => {
          console.log("[FOLLOWUP] API call complete, processing final result");
          
          const { mainSummary, sections } = parseContent(finalContent);
          console.log("[FOLLOWUP] Final parsed content - main summary length:", mainSummary.length);
          
          const assistantMessage = {
            id: `assistant-${Date.now()}`,
            type: 'assistant' as const,
            content: mainSummary,
            timestamp: Date.now(),
            answer: {
              mainSummary,
              sections,
              citations: data.citations
            }
          };
          
          const updatedHistoryWithResponse = [...updatedHistory, assistantMessage];
          
          // Update chat history with answer
          setChatHistory(updatedHistoryWithResponse as ChatMessage[]);
          setCompleteData(data);
          
          try {
            // Save chat session with the current chat ID
            await saveChatSession(updatedHistoryWithResponse as ChatMessage[]);
            console.log("[FOLLOWUP] Chat session saved successfully");
          } catch (error) {
            console.error("[FOLLOWUP] Error saving chat session:", error);
          }
          
          setIsLoading(false)
          setFollowUpQuestion('')
          setStatus(null)
          setStatusMessage(null)
          
          // Give more time before turning off streaming to ensure content is visible
          console.log("[FOLLOWUP] Delaying turning off streaming flag to ensure content displays");
          setTimeout(() => {
            console.log("[FOLLOWUP] Now turning off streaming flag");
            setIsStreaming(false)
          }, 2000);
        }
      )
    } catch (err: any) {
      console.error('[FOLLOWUP] Error handling follow-up question:', err)
      setError('Failed to fetch results for follow-up question. Please try again.')
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const parseContent = (content: string) => {
    console.log("Parsing content length:", content.length);
    
    if (!content || content.trim() === '') {
      console.log("Empty content received");
      return { mainSummary: '', sections: [] };
    }
    
    const sections = [];
    let mainSummary = content;
    
    try {
      const headerMatch = content.match(/#{2,3}\s.+/g);
      
      if (headerMatch && headerMatch.length > 0) {
        console.log("Found sections in content:", headerMatch.length);
        const parts = content.split(/(?=#{2,3}\s.+)/);
        
        mainSummary = parts[0];
        
        for (let i = 1; i < parts.length; i++) {
          const section = parts[i];
          const lines = section.split('\n');
          
          const title = lines[0].replace(/^#{2,3}\s/, '');
          
          const content = lines.slice(1).join('\n').trim();
          
          if (content) {
            sections.push({ id: `section-${Date.now()}-${i}`, title, content });
          }
        }
      } else {
        console.log("No sections found in content");
      }
      
      mainSummary = mainSummary.replace(/---+\s*$/, '').trim();
      
      return { mainSummary, sections };
    } catch (error) {
      console.error("Error parsing content:", error);
      // Return the original content as mainSummary if parsing fails
      return { 
        mainSummary: content.trim(), 
        sections: [] 
      };
    }
  }

  const getCitationCount = (citations?: Record<string, Citation>) => {
    return citations ? Object.keys(citations).length : 0;
  }

  const handleShowAllCitations = (citations?: Record<string, Citation>) => {
    if (citations) {
      setActiveCitations(citations);
      setShowCitationsSidebar(true);
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .citation-reference {
        position: relative;
        display: inline-block;
        cursor: pointer;
      }
      
      .citation-reference-group {
        display: inline-flex;
        align-items: baseline;
      }
      
      .citation-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        background-color: #e0f2fe;
        color: #0284c7;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 0 4px;
        box-sizing: border-box;
      }
      
      .citation-tooltip {
        position: fixed;
        z-index: 9999;
        width: 350px;
        padding: 12px 16px;
        border-radius: 8px;
        background-color: white;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        color: #1e293b;
        font-size: 14px;
        line-height: 1.5;
        border: 1px solid #e2e8f0;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        pointer-events: none;
      }
      
      .citation-reference:hover .citation-tooltip {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      
      .citation-tooltip-title {
        color: #0284c7;
        font-weight: 600;
        margin-bottom: 4px;
        text-decoration: none;
        display: block;
      }
      
      .citation-tooltip-title:hover {
        text-decoration: underline;
      }
      
      .citation-tooltip-meta {
        color: #64748b;
        font-size: 12px;
        margin-bottom: 8px;
      }
      
      .citation-tooltip-source {
        color: #64748b;
        font-size: 12px;
        font-weight: 500;
      }
      
      .bullet-list {
        margin: 8px 0;
      }
      
      .bullet-item {
        margin: 4px 0;
        padding-left: 20px;
        text-indent: -20px;
      }
    `;
    document.head.appendChild(style);
    
    function attachTooltips() {
      const citationRefs = document.querySelectorAll('.citation-reference');
      
      citationRefs.forEach(ref => {
        if (ref.querySelector('.citation-tooltip')) return;
        
        // Get citation number from ref
        const citationNumber = ref.getAttribute('data-citation-number');
        let citationObj = null;
        if (citationNumber && activeCitations && activeCitations[citationNumber]) {
          citationObj = activeCitations[citationNumber];
        }

        const title = ref.getAttribute('data-citation-title');
        const authors = ref.getAttribute('data-citation-authors');
        const year = ref.getAttribute('data-citation-year');
        const source = ref.getAttribute('data-citation-source');
        const url = ref.getAttribute('data-citation-url');
        const journal = ref.getAttribute('data-citation-journal') || undefined;
        const doi = ref.getAttribute('data-citation-doi') || undefined;
        // Instead of destructuring, pass the full citationObj to the utility
        const tooltip = citationObj
          ? createCitationTooltip({
              ...citationObj,
              authors: Array.isArray(citationObj.authors) ? citationObj.authors.join(', ') : citationObj.authors,
              journal: citationObj.journal,
              doi: citationObj.doi
            })
          : createCitationTooltip({
              source: source || undefined,
              title: title || undefined,
              authors: authors || undefined,
              journal: journal || undefined,
              doi: doi || undefined,
              url: url || undefined
            });
        ref.appendChild(tooltip);
        
        ref.addEventListener('mouseenter', () => {
          const tooltipEl = ref.querySelector('.citation-tooltip');
          if (!tooltipEl) return;
          
          const rect = ref.getBoundingClientRect();
          
          let top = rect.top - 10;
          let left = rect.left;
          
          const tempTooltip = (tooltipEl as HTMLElement).cloneNode(true) as HTMLElement;
          tempTooltip.style.visibility = 'hidden';
          tempTooltip.style.position = 'absolute';
          document.body.appendChild(tempTooltip);
          const tooltipHeight = tempTooltip.offsetHeight;
          const tooltipWidth = tempTooltip.offsetWidth;
          document.body.removeChild(tempTooltip);
          
          top = rect.top - tooltipHeight - 10;
          
          left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          
          if (left < 10) left = 10;
          if (left + tooltipWidth > window.innerWidth - 10) {
            left = window.innerWidth - tooltipWidth - 10;
          }
          
          if (top < 10) {
            top = rect.bottom + 10;
          }
          
          (tooltipEl as HTMLElement).style.top = `${top}px`;
          (tooltipEl as HTMLElement).style.left = `${left}px`;
        });
      });
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const hoveredElement = e.target as Element;
      const activeTooltip = document.querySelector('.citation-tooltip[style*="opacity: 1"]');
      
      if (activeTooltip) {
        if (hoveredElement.closest('.citation-tooltip') === activeTooltip || 
            hoveredElement.closest('.citation-reference')?.contains(activeTooltip)) {
          (activeTooltip as HTMLElement).style.pointerEvents = 'auto';
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    const observer = new MutationObserver((mutations) => {
      let shouldAttach = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && 
            mutation.addedNodes.length > 0) {
          shouldAttach = true;
        }
      });
      
      if (shouldAttach) {
        attachTooltips();
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    attachTooltips();
    
    return () => {
      document.head.removeChild(style);
      observer.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeCitations]);

  // Add a new function that takes content directly instead of relying on state
  const handleSearchWithContent = async (content: string) => {
    console.log("[SEARCH] Running search with state:", {
      chatID: chatId,
      isChatLoading,
      query: content,
      hasFetched
    });
    
    if (!content.trim()) {
      console.log("[SEARCH] Empty content provided, aborting search");
      return;
    }
    
    resetState();
    setIsLoading(true);
    
    // Set the current chat ID from the URL parameter if available
    if (chatId && !currentChatId) {
      console.log("[SEARCH] Using chat ID from URL:", chatId);
      setCurrentChatId(chatId);
    }
    
    // Check if we already have this question in the chat history
    const existingQueryIndex = chatHistory.findIndex(msg => 
      msg.type === 'user' && msg.content === content
    );
    
    let updatedHistory;
    
    if (existingQueryIndex >= 0) {
      // The query is already in the history, we don't need to add it again
      console.log("[SEARCH] Query already exists in chat history at index:", existingQueryIndex);
      updatedHistory = [...chatHistory];
      
      // Check if we already have an assistant response for this query
      const hasAssistantResponse = chatHistory.some((msg, index) => 
        msg.type === 'assistant' && index > existingQueryIndex
      );
      
      if (hasAssistantResponse) {
        console.log("[SEARCH] Assistant response already exists for this query, no need to fetch again");
        return; // No need to fetch again
      }
      
      console.log("[SEARCH] No assistant response found for existing query, will fetch answer");
    } else {
      // Create user message with 'main' question type
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'user' as const,
        content: content,
        timestamp: Date.now(),
        questionType: 'main' as const
      };
      console.log("[SEARCH] Adding user message to chat history:", userMessage.id);
      updatedHistory = [...chatHistory, userMessage];
      
      setChatHistory(updatedHistory as ChatMessage[]);
      console.log("[SEARCH] Updated chat history, now contains", updatedHistory.length, "messages");
    }
    
    // Initialize empty streamed content
    setStreamedContent({ mainSummary: '', sections: [] });
    
    try {
      let finalContent = '';
      let hasCompleted = false; // Add guard flag

      console.log("[SEARCH] Starting API call to fetch summary for:", content);
      console.log("[SEARCH] isStreaming state before API call:", isStreaming);

      fetchDrInfoSummary(
        content,
        (chunk) => {
          if (hasCompleted) return; // Skip if already completed

          // Only start streaming after we receive the first chunk
          if (!isStreaming) {
            console.log("[SEARCH] First chunk received, starting stream");
            setIsStreaming(true);
            setSearchPosition("bottom");
          }

          console.log("[SEARCH] Received chunk length:", chunk.length);
          finalContent += chunk;
          try {
            const parsedContent = parseContent(finalContent);
            console.log("[SEARCH] Parsed content, main summary length:", parsedContent.mainSummary.length);
            setStreamedContent(parsedContent);
          } catch (e) {
            console.error("[SEARCH] Error parsing streaming content:", e);
          }
        },
        (newStatus, message) => {
          if (hasCompleted) return; // Skip if already completed

          console.log("[BACKEND RESPONSE] Full status update:", {
            status: newStatus,
            message: message,
            rawResponse: { newStatus, message }
          });
          setStatus(newStatus as StatusType);
        },
        async (data) => {
          if (hasCompleted) return; // Skip if already completed
          hasCompleted = true; // Mark as completed

          // Create the assistant message with the final content
          const { mainSummary, sections } = parseContent(finalContent);
          const assistantMessage = {
            id: `assistant-${Date.now()}`,
            type: 'assistant' as const,
            content: mainSummary,
            timestamp: Date.now(),
            answer: {
              mainSummary,
              sections,
              citations: data.citations
            }
          };

          // Replace previous assistant message for this user query if it exists
          const existingUserIndex = chatHistory.findIndex(msg => msg.type === 'user' && msg.content === content);
          const assistantExists = chatHistory.some((msg, index) => msg.type === 'assistant' && index > existingUserIndex);

          const updatedHistoryWithResponse = assistantExists
            ? chatHistory.map((msg, index) => {
                if (msg.type === 'assistant' && index > existingUserIndex) {
                  return assistantMessage;
                }
                return msg;
              })
            : [...chatHistory, assistantMessage];

          setChatHistory(updatedHistoryWithResponse as ChatMessage[]);

          // Update final state
          setCompleteData(data);
          setIsLoading(false);
          // setQuery(''); // Do not clear the query after streaming is complete
          setStatus("complete");

          try {
            // Save chat session with the current chat ID
            await saveChatSession(updatedHistoryWithResponse as ChatMessage[]);
            console.log("[SEARCH] Chat session saved successfully");
          } catch (error) {
            console.error("[SEARCH] Error saving chat session:", error);
          }

          // Give more time before turning off streaming to ensure content is visible
          console.log("[SEARCH] Delaying turning off streaming flag to ensure content displays");
          setTimeout(() => {
            if (hasCompleted) {
              console.log("[SEARCH] Now turning off streaming flag");
              setIsStreaming(false);
              setStatusMessage(null);
            }
          }, 2000);
        }
      );
    } catch (err: any) {
      console.error('[SEARCH] Search error:', err);
      setError('Failed to fetch results. Please try again.');
      setIsLoading(false);
      setIsStreaming(false);
    }
  }

  const handleFeedbackUpdate = (messageId: string, newFeedback: any) => {
    setChatHistory(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, feedback: newFeedback }
        : msg
    ));
  };

  // Find the last user question to display
  const lastUserQuestion = query || (chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].content : '');

  return (
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

      <div className="flex-1 flex flex-col">
        {isChatLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-blue-600 font-medium">Loading ...</span>
            </div>
          </div>
        ) : (
          <>
            {searchPosition === "middle" && !streamedContent.mainSummary && chatHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                {/* Removed search form and its containing elements */}
              </div>
            ) : (
              <div className="flex-1 overflow-auto mb-4 max-w-3xl mx-auto w-full font-sans overflow-visible" ref={contentRef}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-8">
                  {lastQuestion && (
                    <div className="mb-4">
                      <div className="p-4 border rounded-md"
                        style={{
                          borderColor: '#e5e7eb',
                          fontFamily: 'DM Sans, sans-serif',
                          fontWeight: 500,
                          fontSize: '18px',
                          color: '#223258'
                        }}>
                        <p className="m-0">{lastQuestion}</p>
                      </div>
                    </div>
                  )}
                  {(status || streamedContent.mainSummary) && (
                    <div className={status && status !== 'complete' ? 'animate-in fade-in duration-300' : ''}>
                      <div className="flex items-start gap-2 mb-4">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-6 h-6 flex items-center justify-center">
                            <img src="/answer-icon.svg" alt="Answer" className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="flex items-center">
                          {status === 'complete' ? (
                            <span className="font-semibold text-blue-900 text-base">Answer</span>
                          ) : (
                            KNOWN_STATUSES.includes(status as StatusType) && status !== 'complete' ? (
                              <span className="text-gray-500 italic">{getStatusMessage(status as StatusType)}</span>
                            ) : null
                          )}
                        </div>
                      </div>
                      {/* Render streamed markdown as HTML during streaming, and with citations after complete */}
                      {streamedContent.mainSummary && (
                        <div className="mb-6 ml-8">
                          <div 
                            className="text-slate-700"
                            dangerouslySetInnerHTML={{ 
                              __html: status === 'complete' && completeData?.citations && Object.keys(completeData.citations).length > 0
                                ? formatWithCitations(marked.parse(streamedContent.mainSummary, { async: false }), completeData.citations)
                                : formatWithDummyCitations(marked.parse(streamedContent.mainSummary, { async: false }))
                            }}
                          />
                        </div>
                      )}
                      {streamedContent.sections.length > 0 && (
                        <div className="space-y-6 ml-8">
                          {streamedContent.sections.map((section) => (
                            <div key={section.id}>
                              <h3 className="text-lg font-semibold text-slate-800 mb-2">{section.title}</h3>
                              <div 
                                className="text-slate-700"
                                dangerouslySetInnerHTML={{ 
                                  __html: status === 'complete' && completeData?.citations && Object.keys(completeData.citations).length > 0
                                    ? formatWithCitations(marked.parse(section.content, { async: false }), completeData.citations)
                                    : formatWithDummyCitations(marked.parse(section.content, { async: false }))
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Only show citations when complete and only once */}
                      {status === 'complete' && completeData?.citations && Object.keys(completeData.citations).length > 0 && (
                        <div className="mt-6 ml-8">
                          <div className="flex items-center mb-2">
                            <div className="border rounded border-slate-300 flex items-center p-2">
                              <Copy className="text-slate-500 h-5 w-5 mr-1" />
                              <span className="text-slate-500 text-sm">Copy</span>
                            </div>
                          </div>
                          <p className="text-slate-500 text-sm">
                            Used {getCitationCount(completeData.citations)} references
                          </p>
                          <ReferenceGrid
                            citations={completeData.citations}
                            onShowAll={handleShowAllCitations}
                            getCitationCount={getCitationCount}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(searchPosition === "bottom" || chatHistory.length > 0 || streamedContent.mainSummary) && (
              <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4">
                <div className="max-w-3xl mx-auto">
                  <div className="border rounded-full p-2 pl-4 pr-4 flex items-center bg-white">
                    <Search className="text-slate-400 h-5 w-5 mr-2" />
                    <input
                      type="text"
                      value={followUpQuestion}
                      onChange={(e) => setFollowUpQuestion(e.target.value)}
                      placeholder="Follow up question"
                      className="flex-grow border-none focus:outline-none focus:ring-0 text-slate-700"
                      onKeyDown={(e) => e.key === 'Enter' && handleFollowUpQuestion(e as any)}
                    />
                    <button 
                      onClick={handleFollowUpQuestion}
                      className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ArrowRight size={16} className="text-white" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ReferencesSidebar
        open={showCitationsSidebar}
        citations={activeCitations}
        onClose={() => setShowCitationsSidebar(false)}
      />
    </div>
  )
} 