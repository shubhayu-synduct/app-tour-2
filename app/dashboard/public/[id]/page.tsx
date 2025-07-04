"use client"

import React, { useState, useEffect, use } from 'react'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { ArrowRight, ChevronDown, Copy, Search, ExternalLink, X, FileEdit, ThumbsUp, ThumbsDown } from 'lucide-react'
import { getStatusMessage, StatusType } from '@/lib/status-messages'
import { ReferencesSidebar } from "@/components/references/ReferencesSidebar"
import { ReferenceGrid } from "@/components/references/ReferenceGrid"
import { formatWithCitations } from '@/lib/formatWithCitations'
import { createCitationTooltip } from '@/lib/citationTooltipUtils'
import { marked } from 'marked'
import Link from 'next/link'
import { Citation } from '@/lib/drinfo-summary-service'
import { PublicLayout } from '@/components/dashboard/public-layout'
import { getSessionCookie } from '@/lib/auth-service'

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
}

interface PublicChatData {
  original_session_id: string;
  user_id: string;
  user_email: string;
  title: string;
  created_at: any;
  updated_at: any;
  threads: Array<{
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
  }>;
  is_public: boolean;
}

function PublicChatContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [chatData, setChatData] = useState<PublicChatData | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCitationsSidebar, setShowCitationsSidebar] = useState(false)
  const [activeCitations, setActiveCitations] = useState<Record<string, Citation> | null>(null)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication status
    const session = getSessionCookie();
    setIsAuthenticated(!!session);
  }, []);

  useEffect(() => {
    const loadPublicChat = async () => {
      try {
        const db = getFirebaseFirestore();
        const chatDocRef = doc(db, "public_chats", id);
        const chatDoc = await getDoc(chatDocRef);
        
        if (!chatDoc.exists()) {
          setError("This shared chat is not available or has been removed.");
          setIsLoading(false);
          return;
        }

        const data = chatDoc.data() as PublicChatData;
        setChatData(data);

        // Convert threads to messages format
        const convertedMessages: ChatMessage[] = [];
        data.threads.forEach((thread, index) => {
          // Add user message
          convertedMessages.push({
            id: `user-${index}`,
            type: 'user',
            content: thread.user_message.content,
            timestamp: thread.user_message.timestamp,
            questionType: thread.context.parent_thread_id ? 'follow-up' : 'main',
            threadId: `thread-${index}`
          });

          // Add assistant message if it exists
          if (thread.bot_response.content) {
            convertedMessages.push({
              id: `assistant-${index}`,
              type: 'assistant',
              content: thread.bot_response.content,
              timestamp: thread.user_message.timestamp + 1,
              answer: {
                mainSummary: thread.bot_response.content,
                sections: [],
                citations: thread.bot_response.citations
              },
              threadId: `thread-${index}`
            });
          }
        });

        setMessages(convertedMessages);

        // Set active citations from the last assistant message
        const lastAssistantMsg = convertedMessages.filter(msg => msg.type === 'assistant').pop();
        if (lastAssistantMsg?.answer?.citations) {
          setActiveCitations(lastAssistantMsg.answer.citations);
        }

      } catch (err) {
        console.error("Error loading public chat:", err);
        setError("Failed to load the shared chat. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPublicChat();
  }, [id]);

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

      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
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
              setSelectedCitation(citationObj);
              setShowCitationsSidebar(true);
            }
          }
        });
        
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

  if (isLoading) {
    return (
      <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-blue-600 font-medium">Loading shared chat...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-red-600 text-center">
              <h2 className="text-xl font-semibold mb-2">Chat Not Available</h2>
              <p className="text-gray-600">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
      {/* Login Button - Only show if not authenticated */}
      {!isAuthenticated && (
        <div className="flex justify-end mb-4 px-2 sm:px-4">
          <Link 
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-4 max-w-4xl mx-auto w-full font-sans px-2 sm:px-4">
          <div className="space-y-6 sm:space-y-8">
            {messages.map((msg, idx) => (
              <div key={msg.id} className="mb-4">
                {msg.type === 'user' ? (
                  <div className="p-3 sm:p-4 border rounded-5px" style={{ borderColor: 'rgba(55, 113, 254, 0.5)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px sm:text-[18px]', color: '#223258', backgroundColor: '#E4ECFF' }}>
                    <p className="m-0">{msg.content}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2 mb-3 sm:mb-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                          <img src="/answer-icon.svg" alt="Answer" className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-blue-900 font-['DM_Sans'] mt-1 text-base">Answer</span>
                      </div>
                    </div>
                    {msg.content && (
                      <div className="mb-4 sm:mb-6">
                        <div
                          className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                          dangerouslySetInnerHTML={{
                            __html: formatWithCitations(
                              marked.parse(msg.content, { async: false }),
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
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReferencesSidebar
        open={showCitationsSidebar}
        citations={activeCitations}
        onClose={() => setShowCitationsSidebar(false)}
      />
      
      {/* Print-only reference list at the bottom */}
      {activeCitations && Object.keys(activeCitations).length > 0 && (
        <div className="print-reference-list">
          <h3>References</h3>
          <ol>
            {Object.values(activeCitations).map((citation, idx) => (
              <li key={idx}>
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
  );
}

export default function PublicChatPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PublicLayout>
      <PublicChatContent params={params} />
    </PublicLayout>
  );
} 