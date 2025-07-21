"use client"

import React, { useState, useEffect, useRef } from 'react'
import { ArrowRight, ChevronDown, Copy, Search, ExternalLink, X, FileEdit, ThumbsUp, ThumbsDown, Share2, Check, Mail, RotateCcw } from 'lucide-react'
import { fetchDrInfoSummary, sendFollowUpQuestion, Citation } from '@/lib/drinfo-summary-service'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query as firestoreQuery, where, orderBy, serverTimestamp, FieldPath, setDoc, deleteDoc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { useRouter, usePathname } from 'next/navigation'
import AnswerFeedback from '../feedback/answer-feedback'
import { getStatusMessage, StatusType } from '@/lib/status-messages'
import { ReferencesSidebar } from "@/components/references/ReferencesSidebar"
import { ReferenceGrid } from "@/components/references/ReferenceGrid"
import { DrugInformationModal } from "@/components/references/DrugInformationModal"
import { formatWithCitations, formatWithDummyCitations } from '@/lib/formatWithCitations'
import { createCitationTooltip } from '@/lib/citationTooltipUtils'
import { marked } from 'marked'
import Link from 'next/link'
import { MovingBorder } from "@/components/ui/moving-border"
import { cn } from "@/lib/utils"
import { logger } from '@/lib/logger'

interface DrInfoSummaryProps {
  user: any;
  sessionId?: string; // Optional sessionId for loading a specific chat
  onChatCreated?: () => void; // Callback when a new chat is created
  initialMode?: 'instant' | 'research'; // Add this prop
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  questionType?: 'main' | 'follow-up';
  threadId: string;
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

interface ParsedContent {
  mainSummary: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  citations?: Record<string, Citation>;
}

interface ThreadData {
  user_message: {
    content: string;
    timestamp: number;
  };
  bot_response: {
    content: string;
    citations: Record<string, Citation>;
    search_data: Record<string, any>;
  };
  context: {
    parent_thread_id: string | null;
  };
}

interface MessageFeedback {
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
}

interface DrInfoSummaryData {
  short_summary?: string;
  processed_content?: string;
  citations?: Record<string, Citation>;
  status?: string;
  references?: any[];
  feedback?: MessageFeedback;
  thread_id?: string;
  sections?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

const KNOWN_STATUSES: StatusType[] = ['processing', 'searching', 'summarizing', 'formatting', 'complete'];

// Helper: map backend → frontend source_type values
const normalizeSourceType = (src: string | undefined): string => {
  if (!src) return "internet";
  const s = src.toLowerCase();
  if (s.includes("guideline")) return "guidelines_database";
  if (s.includes("drug"))      return "drug_database";
  return "internet";           // journals / web
};

export function DrInfoSummary({ user, sessionId, onChatCreated, initialMode = 'research' }: DrInfoSummaryProps) {
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
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [showGuidelineModal, setShowGuidelineModal] = useState(false)
  const [showDrugModal, setShowDrugModal] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userCountry, setUserCountry] = useState<string>('')
  const router = useRouter()
  const pathname = usePathname()
  const [activeMode, setActiveMode] = useState<'instant' | 'research'>(initialMode);
  const answerIconRef = useRef<HTMLDivElement>(null);

  // Modal state and timer
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [hasShownInitialModal, setHasShownInitialModal] = useState(false)

  // Share functionality state
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const inputAnchorRef = useRef<HTMLDivElement>(null)

  // Feedback modal behavior:
  // 1. Initial modal appears after 75 seconds (only once)
  // 2. Subsequent modals appear after every 4 questions (4th, 8th, 12th, 16th, etc.) with 75-second delay
  // 3. Question count is incremented only for user-initiated searches, not loaded queries

  // Modal timer effect - only show initial modal after 75 seconds
  useEffect(() => {
    if (!hasShownInitialModal) {
      modalTimerRef.current = setTimeout(() => {
        setShowFeedbackModal(true)
        setHasShownInitialModal(true)
      }, 75000)
    }

    // Cleanup function
    return () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
    }
  }, [hasShownInitialModal])

  // Handle modal close
  const handleModalClose = () => {
    setShowFeedbackModal(false)
  }

  // Function to check if feedback modal should be shown based on question count
  const shouldShowFeedbackModal = (count: number) => {
    if (count === 0) return false
    const shouldShow = count % 4 === 0 && count > 0; // Show at 4th, 8th, 12th, 16th, etc.
    logger.debug("[FEEDBACK] shouldShowFeedbackModal check:", { count, shouldShow });
    return shouldShow;
  }

  // Effect to show feedback modal based on question count with 75-second delay
  useEffect(() => {
    logger.debug("[FEEDBACK] Question count:", questionCount, "Has shown initial modal:", hasShownInitialModal);
    if (hasShownInitialModal && shouldShowFeedbackModal(questionCount)) {
      logger.debug("[FEEDBACK] Scheduling modal for question count:", questionCount, "with 75-second delay");
      // Clear any existing timer
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
      // Set new timer for 75 seconds
      modalTimerRef.current = setTimeout(() => {
        setShowFeedbackModal(true)
      }, 75000)
    }
  }, [questionCount, hasShownInitialModal])

  // Cleanup effect to clear timers on unmount
  useEffect(() => {
    return () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
    }
  }, [])

  // Handle modal button clicks to open feedback forms
  const handleModalFeedbackClick = (type: 'helpful' | 'not_helpful') => {
    // Close the modal
    handleModalClose()
    
    // Find the latest assistant message with feedback
    const latestAssistantMessage = [...messages].reverse().find(msg => 
      msg.type === 'assistant' && msg.content && msg.answer?.citations
    )
    
    if (latestAssistantMessage) {
      // Scroll to the bottom to show the feedback forms
      setTimeout(() => {
        if (inputAnchorRef.current) {
          inputAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
        
        // Find the AnswerFeedback component for the latest message and trigger the feedback form
        setTimeout(() => {
          const feedbackButtons = document.querySelectorAll('.flex.flex-row.items-center.gap-2.sm\\:gap-3.mb-3.sm\\:mb-4')
          const lastFeedbackButton = feedbackButtons[feedbackButtons.length - 1]
          
          if (lastFeedbackButton) {
            const targetButton = lastFeedbackButton.querySelector(
              type === 'helpful' 
                ? 'button[aria-label="Helpful"]' 
                : 'button[aria-label="Not helpful"]'
            ) as HTMLButtonElement
            
            if (targetButton && !targetButton.disabled) {
              targetButton.click()
            }
          }
        }, 500) // Small delay to ensure scroll is complete
      }, 100)
    }
  }

  useEffect(() => {
    logger.debug("[EFFECT] Session loading effect triggered, sessionId:", sessionId);
    
    if (sessionId) {
      loadChatSession(sessionId);
      // Read the mode from sessionStorage
      const storedMode = sessionStorage.getItem(`chat_mode_${sessionId}`);
      if (storedMode === 'instant' || storedMode === 'research') {
        setActiveMode(storedMode);
      }
    } else {
      setChatHistory([]);
      logger.debug("Ready for new chat session");
    }
  }, [sessionId]);

  useEffect(() => {
    if (user) {
      const userId = user.uid || user.id;
      logger.debug("DrInfoSummary component initialized with user:", {
        userId,
        hasUid: !!user.uid,
        hasId: !!user.id,
        authenticationType: user.uid ? "Firebase Auth" : "Custom Auth",
      });
    } else {
      logger.debug("DrInfoSummary component initialized with NO USER");
    }
  }, [user]);

  useEffect(() => {
    if (isChatLoading === false && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [isChatLoading, chatHistory]);

  // Add useEffect to fetch user's country when component mounts
  useEffect(() => {
    const fetchUserCountry = async () => {
      if (user) {
        try {
          const db = getFirebaseFirestore();
          const userId = user.uid || user.id;
          const userDoc = await getDoc(doc(db, "users", userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const country = userData?.profile?.country;
            if (country) {
              setUserCountry(country);
            }
          }
        } catch (error) {
          logger.error("Error fetching user country:", error);
        }
      }
    };

    fetchUserCountry();
  }, [user]);

  // Add this new useEffect after the existing useEffects
  useEffect(() => {
    if (messages.length > 0) {
      const lastAssistantMsg = [...messages].reverse().find(msg => msg.type === 'assistant');
      if (lastAssistantMsg?.answer?.citations) {
        logger.debug('[CITATIONS] Setting citations from messages:', lastAssistantMsg.answer.citations);
        setActiveCitations(lastAssistantMsg.answer.citations);
      }
    }
  }, [messages]);

  const loadChatSession = async (sessionId: string) => {
    setIsChatLoading(true);
    try {
      logger.debug("[LOAD] Loading chat session with ID:", sessionId);
      const db = getFirebaseFirestore();
      
      const sessionDocRef = doc(db, "conversations", sessionId);
      const sessionDoc = await getDoc(sessionDocRef);
      
      if (sessionDoc.exists()) {
        logger.debug("[LOAD] Session document exists, loading threads...");
        
        const threadsRef = collection(db, "conversations", sessionId, "threads");
        const threadsQueryRef = firestoreQuery(threadsRef, orderBy("user_message.timestamp"));
        const threadsSnapshot = await getDocs(threadsQueryRef);
        
        const messages: ChatMessage[] = [];
        
        threadsSnapshot.forEach((threadDoc) => {
          const threadData = threadDoc.data() as ThreadData;
          
          messages.push({
            id: `user-${threadDoc.id}`,
            type: 'user',
            content: threadData.user_message.content,
            timestamp: threadData.user_message.timestamp,
            questionType: threadData.context.parent_thread_id ? 'follow-up' : 'main',
            threadId: threadDoc.id
          });

          if (threadData.bot_response.content) {
            messages.push({
              id: `assistant-${threadDoc.id}`,
              type: 'assistant',
              content: threadData.bot_response.content,
              timestamp: threadData.user_message.timestamp + 1,
              answer: {
                mainSummary: threadData.bot_response.content,
                sections: [],
                citations: threadData.bot_response.citations
              },
              threadId: threadDoc.id
            });
          }
        });
        
        setChatHistory(messages);
        setSearchPosition("bottom");
        
        // Initialize question count based on loaded messages
        const userMessageCount = messages.filter(msg => msg.type === 'user').length;
        logger.debug("[FEEDBACK] Initializing question count from loaded messages:", userMessageCount);
        setQuestionCount(userMessageCount);
        
        if (messages.length > 0) {
          const lastUserMsg = [...messages].reverse().find(msg => msg.type === 'user');
          if (lastUserMsg) {
            setLastQuestion(lastUserMsg.content);
          }
        }
        
        const lastAssistantMsg = [...messages].reverse().find(msg => msg.type === 'assistant');
        if (lastAssistantMsg && lastAssistantMsg.answer) {
          const citations = (lastAssistantMsg.answer.citations && typeof lastAssistantMsg.answer.citations === 'object')
            ? lastAssistantMsg.answer.citations
            : {};
          
          // Set activeCitations immediately when loading from history
          logger.debug('[LOAD] Setting citations from history:', citations);
          setActiveCitations(citations);
          
          setStreamedContent({
            mainSummary: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || []
          });
          setCompleteData({
            processed_content: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || [],
            citations,
            status: 'complete',
            references: []
          });
          
          if (citations && Object.keys(citations).length > 0) {
            setStatus('complete');
          }
          
          logger.debug('[LOAD] Raw assistant content:', lastAssistantMsg.answer.mainSummary);
          logger.debug('[LOAD] Raw assistant citations:', citations);
          logger.debug('[LOAD] streamedContent:', {
            mainSummary: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || []
          });
          logger.debug('[LOAD] completeData:', {
            processed_content: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || [],
            citations,
            status: 'complete',
            references: []
          });
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === 'user') {
          logger.debug("[LOAD] Found user message without assistant response, will trigger API call:", lastMessage.content);
          setQuery(lastMessage.content);
          setLastQuestion(lastMessage.content);
        } else {
          const storedQuery = sessionStorage.getItem(`chat_query_${sessionId}`);
          const needsAnswer = sessionStorage.getItem(`chat_needs_answer_${sessionId}`);
          
          if (storedQuery && needsAnswer === 'true') {
            logger.debug("[LOAD] Found stored query in sessionStorage:", storedQuery);
            setQuery(storedQuery);
            setLastQuestion(storedQuery);
            sessionStorage.removeItem(`chat_query_${sessionId}`);
            sessionStorage.removeItem(`chat_needs_answer_${sessionId}`);
          }
        }
      } else {
        logger.error("[LOAD] Session not found for ID:", sessionId);
        setError("The chat session is being created. If this message persists, please try refreshing the page.");
        
        if (typeof window !== 'undefined') {
          const storedQuery = sessionStorage.getItem(`chat_query_${sessionId}`);
          if (storedQuery) {
            setQuery(storedQuery);
            setLastQuestion(storedQuery);
            sessionStorage.removeItem(`chat_query_${sessionId}`);
          }
        }
      }
    } catch (err) {
      logger.error("[LOAD] Error loading chat session:", err);
      setError("Failed to load chat session. Please try refreshing the page.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveChatSession = async (messages: ChatMessage[]): Promise<string | null> => {
    logger.debug("Attempting to save chat session...");
    logger.debug("User object:", user);
    logger.debug("Current sessionId:", sessionId);
    
    const userId = user?.uid || user?.id;
    
    if (!userId || !sessionId) {
      logger.warn("User not authenticated or no session ID, chat history not saved");
      return null;
    }

    try {
      const db = getFirebaseFirestore();

      for (let i = 0; i < messages.length; i += 2) {
        const userMessage = messages[i];
        const assistantMessage = messages[i + 1];

        if (userMessage && userMessage.type === 'user') {
          const threadData = {
            user_message: {
              content: userMessage.content,
              timestamp: userMessage.timestamp
            },
            bot_response: {
              content: assistantMessage?.content || '',
              citations: assistantMessage?.answer?.citations || {},
              search_data: {}
            },
            context: {
              parent_thread_id: userMessage.questionType === 'follow-up' ? 
                messages[i - 2]?.id : null
        }
          };

          await addDoc(
            collection(db, "conversations", sessionId, "threads"),
            threadData
          );
        }
      }

      await updateDoc(doc(db, "conversations", sessionId), {
        updatedAt: serverTimestamp()
      });

      logger.debug("Successfully saved chat session and threads");
      return sessionId;
    } catch (err) {
      logger.error("Error saving chat session:", err);
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
    logger.debug("[SEARCH] Component state update:", {
      sessionID: sessionId,
      isChatLoading,
      query,
      hasFetched,
      chatHistory: chatHistory.length,
      lastQuestion
    });
    
    if (!isChatLoading && query && !hasFetched) {
      logger.debug("[SEARCH] Triggering search with query:", query);
      logger.debug("[SEARCH] Using mode:", activeMode === 'instant' ? 'swift' : 'study');
      setHasFetched(true);
      setTimeout(() => {
          handleSearchWithContent(query, false, activeMode === 'instant' ? 'swift' : 'study');
      }, 0);
    }
  }, [sessionId, isChatLoading, query, hasFetched, lastQuestion]);

  // Add new controlled scroll effect
  useEffect(() => {
    if (isStreaming && status !== 'complete') {
      // During streaming, scroll to the bottom of the content
      const contentDiv = document.querySelector('.prose');
      if (contentDiv) {
        contentDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    } else if (!isStreaming && status === 'complete') {
      // After streaming is complete, scroll to bottom
      if (inputAnchorRef.current) {
        inputAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [isStreaming, status, messages, streamedContent]);

  // Add a separate effect to handle content container scrolling
  useEffect(() => {
    if (contentRef.current && isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamedContent, isStreaming]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLastQuestion(query);
    setQuestionCount(prev => {
      const newCount = prev + 1;
      logger.debug("[FEEDBACK] Incrementing question count from", prev, "to", newCount, "via handleSearch");
      if (newCount % 4 === 0) {
        logger.debug("[FEEDBACK] Question", newCount, "reached - modal will appear in 45 seconds");
      }
      return newCount;
    });
    handleSearchWithContent(query, false, activeMode === 'instant' ? 'swift' : 'study');
    setFollowUpQuestion(''); // Clear follow-up input after main search
  };

  const handleFollowUpQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;
    setLastQuestion(followUpQuestion);
    setQuestionCount(prev => {
      const newCount = prev + 1;
      logger.debug("[FEEDBACK] Incrementing question count from", prev, "to", newCount, "via handleFollowUpQuestion");
      if (newCount % 4 === 0) {
        logger.debug("[FEEDBACK] Question", newCount, "reached - modal will appear in 45 seconds");
      }
      return newCount;
    });
    
    // Start the search/streaming first to create the answer icon
    handleSearchWithContent(followUpQuestion, true, activeMode === 'instant' ? 'swift' : 'study');
    setFollowUpQuestion(''); // Clear follow-up input after follow-up

    // Wait for the DOM to update with the new answer icon
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now scroll to the answer icon
    const answerIcons = document.querySelectorAll('.flex.items-start.gap-2.mb-4');
    const lastAnswerIcon = answerIcons[answerIcons.length - 1];
    if (lastAnswerIcon) {
      lastAnswerIcon.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const parseContent = (content: string) => {
    logger.debug("Parsing content length:", content.length);
    
    if (!content || content.trim() === '') {
      logger.debug("Empty content received");
      return { mainSummary: '', sections: [] };
    }
    
    const sections = [];
    let mainSummary = content;
    
    try {
      const headerMatch = content.match(/#{2,3}\s.+/g);
      
      if (headerMatch && headerMatch.length > 0) {
        logger.debug("Found sections in content:", headerMatch.length);
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
        logger.debug("No sections found in content");
      }
      
      mainSummary = mainSummary.replace(/---+\s*$/, '').trim();
      
      return { mainSummary, sections };
    } catch (error) {
      logger.error("Error parsing content:", error);
      return { 
        mainSummary: content.trim(), 
        sections: [] 
      };
    }
  }

  const getCitationCount = (citations?: Record<string, Citation>) => {
    if (!citations) return 0;
    
    // Filter out implicit drug citations
    const visibleCitations = Object.entries(citations).filter(([key, citation]) => {
      // If it's a drug citation and has drug_citation_type === 'implicit', exclude it
      if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
        return false;
      }
      // Otherwise, include it
      return true;
    });
    
    return visibleCitations.length;
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
      
      @media (hover: hover) {
        .citation-reference:hover .citation-tooltip {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .citation-reference:not(:hover) .citation-tooltip {
          transition-delay: 0.4s;
        }
      }
      
      @media (hover: none) {
        .citation-tooltip {
          display: none;
        }
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

      .answer-fade {
        transition: opacity 0.3s;
        opacity: 1;
      }
      .answer-fade.answer-fade-out {
        opacity: 0.5;
      }

      .drug-name-clickable {
        text-decoration: underline !important;
        color: #214498 !important;
        cursor: pointer;
        transition: color 0.2s ease;
        font-weight: bold !important;
        display: inline;
      }
      
      .drug-name-clickable:hover {
        color: #3771FE !important;
        text-decoration: underline !important;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Hide follow-up bar and branding */
        .sticky.bottom-0,
        .w-full.py-3.text-center,
        .flex.justify-between.items-center.mt-2 {
          display: none !important;
        }
        /* Hide sidebar/modal references in print */
        .citations-sidebar, .modal, .sidebar, .ReferencesSidebar {
          display: none !important;
        }
        /* Show print-only reference list */
        .print-reference-list {
          display: block !important;
          margin-top: 2em;
          font-size: 1em;
          color: #222;
        }
        /* Ensure all main content prints, not just visible area */
        .overflow-auto,
        .flex-1,
        .max-w-4xl,
        .h-full {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
      }
      @media screen {
        .print-reference-list {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    function attachTooltips() {
      const citationRefs = document.querySelectorAll('.citation-reference');
      const drugNameRefs = document.querySelectorAll('.drug-name-clickable');
      
      // Handle citation references
      citationRefs.forEach(ref => {
        if (ref.querySelector('.citation-tooltip')) return;
        
        const citationNumber = ref.getAttribute('data-citation-number');
        let citationObj = null;
        if (citationNumber && activeCitations && activeCitations[citationNumber]) {
          citationObj = activeCitations[citationNumber];
        }

        const title = ref.getAttribute('data-citation-title');
        const authors = ref.getAttribute('data-citation-authors');
        const year = ref.getAttribute('data-citation-year');
        const source = ref.getAttribute('data-citation-source');
        const source_type = ref.getAttribute('data-citation-source-type');
        const url = ref.getAttribute('data-citation-url');
        const journal = ref.getAttribute('data-citation-journal') || undefined;
        const doi = ref.getAttribute('data-citation-doi') || undefined;
        const tooltip = citationObj
          ? createCitationTooltip({
              ...citationObj,
              authors: Array.isArray(citationObj.authors) ? citationObj.authors.join(', ') : citationObj.authors,
              journal: citationObj.journal,
              doi: citationObj.doi
            })
          : createCitationTooltip({
              source: source || undefined,
              source_type: source_type || undefined,
              title: title || undefined,
              authors: authors || undefined,
              journal: journal || undefined,
              doi: doi || undefined,
              url: url || undefined
            });
        ref.appendChild(tooltip);
        
        // Add click handler for mobile devices
        ref.addEventListener('click', (e) => {
          // Check if it's a mobile device (no hover capability)
          if (window.matchMedia('(hover: none)').matches) {
            e.preventDefault();
            e.stopPropagation();
            if (citationObj) {
              // Only open citations sidebar for non-drug citations
              if (citationObj.source_type !== 'drug_database') {
                setSelectedCitation(citationObj);
                setShowCitationsSidebar(true);
              }
              // For drug citations, do nothing on click (keep hover tooltip only)
            }
          }
        });
        
        // Remove the click handler for desktop devices - citation numbers should only show tooltips, not open modals
        
        ref.addEventListener('mouseenter', () => {
          // Only handle hover on devices that support hover
          if (window.matchMedia('(hover: hover)').matches) {
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
          }
        });
      });
      
      // Handle drug name clicks
      drugNameRefs.forEach(ref => {
        const citationNumber = ref.getAttribute('data-citation-number');
        let citationObj = null;
        if (citationNumber && activeCitations && activeCitations[citationNumber]) {
          citationObj = activeCitations[citationNumber];
        }
        
        logger.debug('Found drug name span:', { citationNumber, citationObj, element: ref });
        
        // Add click handler for drug names
        ref.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          logger.debug('Drug name clicked:', { citationNumber, citationObj });
          if (citationObj && citationObj.source_type === 'drug_database') {
            logger.debug('Opening drug modal for:', citationObj.title);
            setSelectedCitation(citationObj);
            setShowDrugModal(true);
          }
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
        } else {
          // Add timeout to close tooltip after 1 second
          setTimeout(() => {
            const currentTooltip = document.querySelector('.citation-tooltip[style*="opacity: 1"]');
            if (currentTooltip && !currentTooltip.matches(':hover')) {
              (currentTooltip as HTMLElement).style.opacity = '0';
              (currentTooltip as HTMLElement).style.visibility = 'hidden';
              (currentTooltip as HTMLElement).style.pointerEvents = 'none';
            }
          }, 1000);
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    const observer = new MutationObserver((mutations) => {
      let shouldAttach = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && 
            mutation.addedNodes.length > 0) {
          // Check if any added nodes contain citation references or drug names
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.querySelector('.citation-reference') || 
                  element.querySelector('.drug-name-clickable') ||
                  element.classList.contains('citation-reference') ||
                  element.classList.contains('drug-name-clickable')) {
                shouldAttach = true;
              }
            }
          });
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

  const handleSearchWithContent = async (content: string, isFollowUp: boolean = false, mode?: string) => {
    let hasCompleted = false;
    if (!content.trim()) return;
    if (!sessionId) {
      setError('No session ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const userId = user?.uid || user?.id;
    if (!userId) {
      setError('User not authenticated.');
      setIsLoading(false);
      return;
    }

    // Determine parent_thread_id for Firebase thread-based follow-up detection
    const parentThreadId = isFollowUp && messages.length > 0 
      ? messages[messages.length - 1]?.threadId  // Get the last assistant message's thread ID
      : undefined;

    // Add user message
    const tempThreadId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        id: `user-${tempThreadId}`,
        type: 'user',
        content: content, 
        timestamp: Date.now(),
        questionType: isFollowUp ? 'follow-up' : 'main',
        threadId: tempThreadId
      }
    ]);

    // Add assistant message placeholder
    setMessages(prev => [
      ...prev,
      {
        id: `assistant-${tempThreadId}`,
        type: 'assistant',
        content: '',
        timestamp: Date.now() + 1,
        answer: {
          mainSummary: '',
          sections: [],
          citations: {}
        },
        threadId: tempThreadId
      }
    ]);
    let streamedContent = '';
    fetchDrInfoSummary(
      content,
      (chunk: string) => {
        if (hasCompleted) return;
        streamedContent += chunk;
        // Update the last assistant message with streamed content
        setMessages(prev => prev.map((msg, idx) =>
          idx === prev.length - 1 && msg.type === 'assistant'
            ? { ...msg, content: streamedContent, answer: { ...msg.answer, mainSummary: streamedContent, sections: [] } }
            : msg
        ));
      },
      (newStatus: string, message?: string) => {
        if (hasCompleted) return;
        setStatus(newStatus as StatusType);
      },
      async (data: DrInfoSummaryData) => {
        if (hasCompleted) return;
        hasCompleted = true;
        
        try {
          if (!data.thread_id) {
            throw new Error('Thread ID not received from backend');
          }

          // Update messages with the thread ID from backend
          setMessages(prev => prev.map((msg, idx) =>
            msg.threadId === tempThreadId
              ? { ...msg, threadId: data.thread_id! }
              : msg
          ));

          // Update the last assistant message with final content, citations, etc.
          setMessages(prev => prev.map((msg, idx) =>
            idx === prev.length - 1 && msg.type === 'assistant'
              ? {
                  ...msg,
                  content: data?.processed_content || '',
                  answer: {
                    mainSummary: data?.processed_content || '',
                    sections: [],
                    citations: data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
                      ...acc,
                      [key]: {
                        ...citation,
                        source_type: citation.source_type || 'internet'
                      }
                    }), {}) : {},
                  },
                }
              : msg
          ));

          setActiveCitations(data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
            ...acc,
            [key]: {
              ...citation,
              source_type: citation.source_type || 'internet'
            }
          }), {}) : {});
          setStatus('complete');
          setIsLoading(false);
          setTimeout(() => {
            if (hasCompleted) {
              setIsStreaming(false);
              setStatusMessage(null);
            }
          }, 2000);
        } catch (error) {
          logger.error('Error updating messages:', error);
          setError('Failed to update messages. Please try again.');
          setIsLoading(false);
        }
      },
      { 
        sessionId: sessionId, 
        userId, 
        parent_thread_id: parentThreadId, 
        mode: activeMode === 'instant' ? 'swift' : 'study',
        country: userCountry // Add country to the options
      }
    );
  };

  const handleFeedbackUpdate = (feedback: MessageFeedback) => {
    if (completeData) {
      setCompleteData({
        ...completeData,
        feedback
      });
    }
  };

  // Share functionality
  const handleShare = async () => {
    if (!sessionId || !user) {
      logger.error('Cannot share: missing sessionId or user');
      return;
    }

    setIsSharing(true);
    setShowSharePopup(true);

    try {
      const db = getFirebaseFirestore();
      const userId = user.uid || user.id;

      // Get the current chat session data
      const sessionDocRef = doc(db, "conversations", sessionId);
      const sessionDoc = await getDoc(sessionDocRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data();
      
      // Get all threads for this session
      const threadsRef = collection(db, "conversations", sessionId, "threads");
      const threadsQueryRef = firestoreQuery(threadsRef, orderBy("user_message.timestamp"));
      const threadsSnapshot = await getDocs(threadsQueryRef);
      
      const threads: any[] = [];
      threadsSnapshot.forEach((threadDoc) => {
        const threadData = threadDoc.data();
        // Clean the data to remove any undefined or null values
        const cleanThread = {
          user_message: {
            content: threadData.user_message?.content || '',
            timestamp: threadData.user_message?.timestamp || Date.now()
          },
          bot_response: {
            content: threadData.bot_response?.content || '',
            citations: threadData.bot_response?.citations || {},
            search_data: threadData.bot_response?.search_data || {}
          },
          context: {
            parent_thread_id: threadData.context?.parent_thread_id || null
          }
        };
        threads.push(cleanThread);
      });

      // Create public chat document
      const publicChatData = {
        original_session_id: sessionId,
        user_id: userId,
        user_email: user.email || '',
        title: sessionData.title || 'Shared Chat',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        threads: threads,
        is_public: true
      };

      const publicChatRef = await addDoc(collection(db, "public_chats"), publicChatData);
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/dashboard/public/${publicChatRef.id}`;
      setShareLink(shareableLink);
      
      logger.debug('Chat shared successfully:', publicChatRef.id);
    } catch (error) {
      logger.error('Error sharing chat:', error);
      setShareLink('');
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
    }
  };

  const shareOnLinkedIn = () => {
    if (!shareLink) return;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank');
  };

  const shareOnWhatsApp = () => {
    if (!shareLink) return;
    const url = `https://wa.me/?text=${encodeURIComponent(`Check out this chat: ${shareLink}`)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    if (!shareLink) return;
    const subject = 'Shared Chat from DrInfo';
    const body = `I wanted to share this chat with you: ${shareLink}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };

  const addDummyCitations = (content: string) => {
    // Add dummy citation numbers in the format [1], [2], etc.
    let citationCount = 1;
    return content.replace(/\[citation\]/g, () => `[${citationCount++}]`);
  };

  // Add useEffect for scrolling to answer icon when status changes
  useEffect(() => {
    if (status && status !== 'complete' && answerIconRef.current) {
      answerIconRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [status]);

  const [reloadingMessageId, setReloadingMessageId] = useState<string | null>(null);

  const handleReload = async (assistantMessageId: string) => {
    if (!sessionId || !user) return;

    // Find the assistant message and its corresponding user message
    const assistantMsgIndex = messages.findIndex(msg => msg.id === assistantMessageId);
    if (assistantMsgIndex === -1) return;

    const assistantMsg = messages[assistantMsgIndex];
    const userMsg = messages[assistantMsgIndex - 1];
    
    if (!userMsg || userMsg.type !== 'user') return;

    setReloadingMessageId(assistantMessageId);
    logger.debug('[RELOAD] Starting complete reload - deleting thread:', assistantMsg.threadId);
    logger.debug('[RELOAD] Question to reload:', userMsg.content);
    
    try {
      const userId = user.uid || user.id;
      const db = getFirebaseFirestore();

      // Step 1: Delete the entire thread from Firebase (both question and answer)
      if (assistantMsg.threadId) {
        const threadRef = doc(db, "conversations", sessionId, "threads", assistantMsg.threadId);
        await deleteDoc(threadRef);
        logger.debug('[RELOAD] Successfully deleted thread from Firebase:', assistantMsg.threadId);
      }

      // Step 2: Remove both user and assistant messages from UI state
      setMessages(prev => prev.filter(msg => 
        msg.id !== userMsg.id && msg.id !== assistantMessageId
      ));
      logger.debug('[RELOAD] Removed messages from UI');

      // Step 3: Create fresh messages for the reload
      const tempThreadId = Date.now().toString();
      const freshUserMsg = {
        id: `user-${tempThreadId}`,
        type: 'user' as const,
        content: userMsg.content, 
        timestamp: Date.now(),
        questionType: userMsg.questionType || 'main' as const,
        threadId: tempThreadId
      };

      const freshAssistantMsg = {
        id: `assistant-${tempThreadId}`,
        type: 'assistant' as const,
        content: '',
        timestamp: Date.now() + 1,
        answer: {
          mainSummary: '',
          sections: [],
          citations: {}
        },
        threadId: tempThreadId
      };

      // Add fresh messages to UI
      setMessages(prev => [...prev, freshUserMsg, freshAssistantMsg]);
      logger.debug('[RELOAD] Added fresh messages to UI');

      // Step 4: Start fresh API call
      let hasCompleted = false;
      let streamedContent = '';

      fetchDrInfoSummary(
        userMsg.content,
        (chunk: string) => {
          if (hasCompleted) return;
          streamedContent += chunk;
          // Update the fresh assistant message with streamed content
          setMessages(prev => prev.map(msg =>
            msg.id === `assistant-${tempThreadId}`
              ? { 
                  ...msg, 
                  content: streamedContent, 
                  answer: { ...msg.answer, mainSummary: streamedContent, sections: [] }
                }
              : msg
          ));
        },
        (newStatus: string, message?: string) => {
          if (hasCompleted) return;
          setStatus(newStatus as StatusType);
          logger.debug('[RELOAD] Status update:', newStatus);
        },
        async (data: DrInfoSummaryData) => {
          if (hasCompleted) return;
          hasCompleted = true;
          
          try {
            logger.debug('[RELOAD] Received fresh data:', data);
            
            if (!data.thread_id) {
              throw new Error('Thread ID not received from backend');
            }

            // Update messages with the thread ID from backend
            setMessages(prev => prev.map(msg =>
              msg.threadId === tempThreadId
                ? { ...msg, threadId: data.thread_id! }
                : msg
            ));

            // Update the assistant message with final content
            setMessages(prev => prev.map(msg =>
              msg.id === `assistant-${tempThreadId}`
                ? {
                    ...msg,
                    content: data?.processed_content || '',
                    answer: {
                      mainSummary: data?.processed_content || '',
                      sections: [],
                      citations: data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
                        ...acc,
                        [key]: {
                          ...citation,
                          source_type: normalizeSourceType(citation.source_type)
                        }
                      }), {}) : {},
                    },
                    status: 'complete', // Reset status
                  }
                : msg
            ));

            // Update active citations
            setActiveCitations(data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
              ...acc,
              [key]: {
                ...citation,
                source_type: normalizeSourceType(citation.source_type)
              }
            }), {}) : {});

            setStatus('complete');
            setIsLoading(false);
            
            logger.debug('[RELOAD] Successfully completed reload with new thread:', data.thread_id);

          } catch (error) {
            logger.error('[RELOAD] Error updating messages:', error);
            setError('Failed to complete reload. Please try again.');
          } finally {
            setReloadingMessageId(null);
            setTimeout(() => {
              if (hasCompleted) {
                setIsStreaming(false);
                setStatusMessage(null);
              }
            }, 2000);
          }
        },
        { 
          sessionId: sessionId, 
          userId, 
          parent_thread_id: userMsg.questionType === 'follow-up' ? 
            messages.find(m => m.id === userMsg.id && m.type === 'user')?.threadId : undefined,
          mode: activeMode === 'instant' ? 'swift' : 'study',
          country: userCountry
        }
      );

    } catch (error) {
      logger.error('[RELOAD] Error during complete reload:', error);
      setError('Failed to reload. Please try again.');
      setReloadingMessageId(null);
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
      {/* Top Bar with Share Button */}
      <div className="flex justify-between items-center mb-4 px-2 sm:px-4">
        <div className="flex-1"></div>
        <button
          onClick={handleShare}
          disabled={!sessionId || messages.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#C8C8C8] text-[#223258] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
                      <img src="/Share icon.svg" alt="Share" className="w-5 h-5" />
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">Share</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
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
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-4 max-w-4xl mx-auto w-full font-sans px-2 sm:px-4" ref={contentRef}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-lg mb-4">
                    {error}
                  </div>
                )}
                <div className="space-y-6 sm:space-y-8">
                  {messages.map((msg, idx) => (
                    <div key={msg.id} className="mb-4">
                      {msg.type === 'user' ? (
                        <div className="p-3 sm:p-4 border rounded-5px" style={{ borderColor: 'rgba(55, 113, 254, 0.5)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px sm:text-[18px]', color: '#223258', backgroundColor: '#E4ECFF' }}>
                          <p className="m-0">{msg.content}</p>
                        </div>
                      ) : (
                        <>
                          <div ref={idx === messages.length - 1 ? answerIconRef : null} className="flex items-start gap-2 mb-3 sm:mb-4">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                                <img src="/answer-icon.svg" alt="Answer" className="w-5 h-5 sm:w-6 sm:h-6" />
                              </div>
                            </div>
                            <div className="flex items-center">
                              {idx === messages.length - 1 && status !== 'complete' ? (
                                <span className="text-gray-500 italic text-sm sm:text-base">{getStatusMessage(status as StatusType)}</span>
                              ) : (
                                msg.type === 'assistant' && msg.content && (
                                  <span className="font-semibold text-blue-900 font-['DM_Sans'] mt-1 text-base">Answer</span>
                                )
                              )}
                            </div>
                          </div>
                          {/* Show content during streaming or when complete */}
                          {(msg.content || (idx === messages.length - 1 && isStreaming)) && (
                            <div className="mb-4 sm:mb-6">
                              <div
                                className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold"
                                style={{ fontFamily: 'DM Sans, sans-serif' }}
                                dangerouslySetInnerHTML={{
                                  __html:
                                    idx === messages.length - 1 && status !== 'complete'
                                      ? formatWithDummyCitations(
                                          marked.parse(addDummyCitations(msg.content || ''), { async: false })
                                        )
                                      : formatWithCitations(
                                          marked.parse(msg.content || '', { async: false }),
                                          msg.answer?.citations
                                        ),
                                }}
                              />
                            </div>
                          )}
                          {msg.answer?.citations && Object.keys(msg.answer.citations).length > 0 && (
                            <div className="mt-4 sm:mt-6">
                              <p className="text-slate-500 text-xs sm:text-sm">
                                Used {getCitationCount(msg.answer.citations)} references
                              </p>
                              <ReferenceGrid
                                citations={msg.answer.citations}
                                onShowAll={handleShowAllCitations}
                                getCitationCount={getCitationCount}
                              />
                              <div className="mt-3 sm:mt-4">
                                <AnswerFeedback
                                  conversationId={sessionId || ''}
                                  threadId={msg.threadId}
                                  answerText={msg.content || ''}
                                  // Only show retry for the last assistant message
                                  {...(idx === messages.length - 1 ? {
                                    onReload: () => handleReload(msg.id),
                                    isReloading: reloadingMessageId === msg.id
                                  } : {})}
                                  messageId={msg.id}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(searchPosition === "bottom" || chatHistory.length > 0 || streamedContent.mainSummary) && (
              <>
                <div ref={inputAnchorRef} style={{ marginBottom: '120px sm:140px' }} />
                <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4 z-10">
                  <div className="max-w-4xl mx-auto px-2 sm:px-4">
                    <div className="relative w-full bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-3 md:p-4">
                      <div className="relative">
                        <textarea
                          value={followUpQuestion}
                          onChange={(e) => {
                            setFollowUpQuestion(e.target.value);
                            // Auto-resize the textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="Ask a follow-up question..."
                          className="w-full text-base md:text-[16px] text-[#223258] font-normal font-['DM_Sans'] outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto"
                          onKeyDown={(e) => e.key === 'Enter' && handleFollowUpQuestion(e as any)}
                          rows={1}
                          style={{ height: '24px' }}
                        />
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
                          <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${activeMode === 'instant' ? 'bg-blue-500' : 'bg-gray-300'}`}
                                style={{ transition: 'background 0.3s' }}>
                            <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${activeMode === 'instant' ? 'translate-x-4' : ''}`}></span>
                          </span>
                          <span className={`text-sm font-medium ${activeMode === 'instant' ? 'text-[#3771FE]' : 'text-gray-500'}`}
                                style={{ fontSize: '16px', fontFamily: 'DM Sans, sans-serif' }}>
                            Acute
                          </span>
                        </label>
                        <button onClick={handleFollowUpQuestion} className="flex-shrink-0" disabled={isLoading}>
                          {isLoading ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <img src="/search.svg" alt="Search" width={30} height={30} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="w-full py-3 text-center text-[14px] text-gray-400">
                      <p>Generated by AI, apply professional/physicians' judgment. <a href="https://synduct.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="font-regular underline text-black hover:text-[#3771FE] transition-colors duration-200">Click here</a> for further information.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ReferencesSidebar
        open={showCitationsSidebar}
        citations={activeCitations}
        onClose={() => setShowCitationsSidebar(false)}
      />
      
      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFDFF] rounded-lg shadow-xl max-w-xl w-full mx-4 border border-[#C8C8C8]">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <h2 className="text-2xl font-medium text-blue-900">
                Shareable public link
              </h2>
              <button 
                onClick={() => setShowSharePopup(false)}
                className="text-[#263969] hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6">
              {/* Link Creation Status */}
              <div className="mb-6">
                {isSharing ? (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500">Creating Link...</span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-[#C8D8FF]">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      disabled={!shareLink}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-base rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCopied ? (
                        <>
                          <Check size={18} />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Border line */}
            <div className="border-t border-gray-200"></div>

            {/* Share Options */}
            <div className="px-6">
              <div className="flex justify-center space-x-8">
                {/* LinkedIn */}
                <button 
                  onClick={shareOnLinkedIn}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#0077B5] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-[70%] h-[70%] text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">LinkedIn</span>
                </button>

                {/* WhatsApp */}
                <button 
                  onClick={shareOnWhatsApp}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#25D366] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-[70%] h-[70%] text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.488"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                </button>

                {/* Mail */}
                <button 
                  onClick={shareViaEmail}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#214498] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <Mail className="w-[70%] h-[70%] text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Mail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Reminder Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FCFDFF] rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all border border-[#C8C8C8]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 font-['DM_Sans']">
                  Feedback Reminder
                </h3>
                <button
                  onClick={handleModalClose}
                  className="text-[#223258] hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 font-['DM_Sans'] leading-relaxed mb-4">
                  This is a reminder to give your valuable feedback. Your input helps us improve our service and provide better answers to your questions.
                </p>
                
                {/* Demo buttons showing the feedback UI */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 font-['DM_Sans'] mb-3">
                    Look for these buttons below each answer to provide feedback:
                  </p>
                  <div className="flex flex-row items-center gap-2 sm:gap-3">
                    <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
                      <div className="absolute inset-0">
                        <MovingBorder duration={3000} rx="8px" ry="8px" delay={0}>
                          <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
                        </MovingBorder>
                      </div>
                      <button
                        onClick={() => handleModalFeedbackClick('helpful')}
                        className={cn(
                          "relative flex h-full w-full items-center justify-center border border-[#C8C8C8] text-[#223258] bg-white rounded-lg transition-all hover:border-[#3771FE] hover:text-[#3771FE]"
                        )}
                      >
                        <ThumbsUp className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        <span className="text-xs sm:text-sm">Useful...</span>
                      </button>
                    </div>

                    <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
                      <div className="absolute inset-0">
                        <MovingBorder duration={3000} rx="8px" ry="8px" delay={1500}>
                          <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
                        </MovingBorder>
                      </div>
                      <button
                        onClick={() => handleModalFeedbackClick('not_helpful')}
                        className={cn(
                          "relative flex h-full w-full items-center justify-center border border-[#C8C8C8] text-[#223258] bg-white rounded-lg transition-all hover:border-[#3771FE] hover:text-[#3771FE]"
                        )}
                      >
                        <ThumbsDown className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        <span className="text-xs sm:text-sm">Not Useful...</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium font-['DM_Sans'] transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <DrugInformationModal
        open={showDrugModal}
        citation={selectedCitation}
        onClose={() => {
          setShowDrugModal(false);
          setSelectedCitation(null);
        }}
      />
      {/* Print-only reference list at the bottom */}
      {activeCitations && Object.keys(activeCitations).length > 0 && (
        <div className="print-reference-list">
          <h3>References</h3>
          <ol>
            {Object.entries(activeCitations)
              .filter(([key, citation]) => {
                // Filter out implicit drug citations from print references
                if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
                  return false;
                }
                return true;
              })
              .map(([key, citation], idx) => (
                <li key={key}>
                  {citation.title}
                  {citation.authors ? `, ${Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors}` : ''}
                  {citation.year ? `, ${citation.year}` : ''}
                  {citation.url ? (
                    <>
                      {', '}
                      <span style={{wordBreak: 'break-all'}}>{citation.url}</span>
                    </>
                  ) : ''}
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  )
}