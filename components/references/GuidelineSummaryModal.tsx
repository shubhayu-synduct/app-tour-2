"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, ExternalLink, ChevronRight, ChevronLeft, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GuidelineMarkdown } from '../guidelines/guideline-markdown'
import { logger } from '@/lib/logger'

interface Summary {
  title: string;
  summary: string;
  sources: Record<string, string>;
  page_references: Record<string, Array<{ start_word: string; end_word: string }>>;
}

interface ChatMessage {
  type: 'main' | 'followup';
  question?: string;
  answer: string;
  sources?: Record<string, string>;
  page_references?: Record<string, Array<{ start_word: string; end_word: string }>>;
}

interface GuidelineSummaryModalProps {
  open: boolean;
  onClose: () => void;
  citation: any;
}

function decodeUnicode(str: string): string {
  if (!str) return str;
  const singleEscaped = str.replace(/\\u/g, '\\u');
  return singleEscaped.replace(/\\u([0-9a-fA-F]{4})/g, (_, grp) =>
    String.fromCharCode(parseInt(grp, 16))
  );
}

export const GuidelineSummaryModal: React.FC<GuidelineSummaryModalProps> = ({ open, onClose, citation }) => {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeReference, setActiveReference] = useState<{ 
    number: string; 
    text: string; 
    index: number; 
    fullText: string | null; 
    highlightedRange: { start: number; end: number } | null; 
    isError: boolean; 
    errorMessage: string | null | undefined 
  } | null>(null)
  const [processedMarkdown, setProcessedMarkdown] = useState<string>('')
  const [isCitationPanelOpen, setIsCitationPanelOpen] = useState(false)
  
  // Chat and follow-up questions state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [followupQuestion, setFollowupQuestion] = useState<string>('')
  const [isAskingFollowup, setIsAskingFollowup] = useState(false)
  const [followupError, setFollowupError] = useState<string | null>(null)
  
  // Track all reference occurrences
  const referenceOccurrences = useRef<Map<string, number>>(new Map())
  const questionInputRef = useRef<HTMLInputElement>(null)

  // Add highlightRef for auto-scroll
  const highlightRef = useRef<HTMLSpanElement>(null);

  // Ref for auto-scroll to latest answer
  const answerEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeReference?.highlightedRange, activeReference?.fullText]);

  useEffect(() => {
    if (answerEndRef.current) {
      answerEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [chatHistory.length]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('/api/guidelines/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: citation.title,
            guidelines_index: citation.guidelines_index
          })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch summary: ${response.status}`)
        }
        
        const data = await response.json()
        // Decode unicode in summary before using it
        const decodedSummary = decodeUnicode(data.summary)
        logger.debug('Summary API response:', decodedSummary)
        setSummary({ ...data, summary: decodedSummary })
        
        // Add the initial summary to the chat history
        setChatHistory([{
          type: 'main',
          answer: decodedSummary,
          sources: data.sources,
          page_references: data.page_references
        }])
        
        // Reset reference occurrences for new summary
        referenceOccurrences.current.clear()
        
        if (data && data.summary) {
          setProcessedMarkdown(processMarkdown(decodedSummary))
        }
      } catch (err: any) {
        logger.error('Error fetching summary:', err)
        setError(err.message || 'Failed to fetch summary')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (open && citation && !summary) {
      fetchSummary()
    }
  }, [open, citation, summary])

  const extractReferenceText = useCallback((refNumber: string, refIndex: number) => {
    if (!summary) return null
    
    const pageRef = summary.page_references[refNumber]
    if (!pageRef || !pageRef[refIndex]) {
      return `Reference extract not available for citation [${refNumber}] (occurrence ${refIndex + 1}). The reference exists but the specific extract could not be found.`
    }
    
    const { start_word, end_word } = pageRef[refIndex]
    const sourceText = summary.sources[refNumber]
    
    if (!sourceText) {
      return `Source text not available for reference [${refNumber}]. This citation exists in the document but the source text was not provided by the API.`
    }

    const cleanText = (text: string) => {
      return text
        .replace(/\\b/g, '')
        .replace(/\\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const getAlphaOnly = (text: string) => {
      return text.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase();
    };

    const cleanedSourceText = cleanText(sourceText);
    const alphaSourceText = getAlphaOnly(cleanedSourceText);
    
    const cleanedStartWord = cleanText(start_word);
    const cleanedEndWord = cleanText(end_word);
    const alphaStartWord = getAlphaOnly(cleanedStartWord);
    const alphaEndWord = getAlphaOnly(cleanedEndWord);
    
    const startPos = alphaSourceText.indexOf(alphaStartWord);
    
    if (startPos === -1) {
      return {
        fullText: sourceText,
        highlightedRange: null,
        isError: true,
        errorMessage: `Could not locate the extract starting with "${start_word}" in reference [${refNumber}].`
      };
    }
    
    const originalStartPos = findOriginalPosition(cleanedSourceText, alphaSourceText, startPos);
    
    const remainingAlphaText = alphaSourceText.substring(startPos + alphaStartWord.length);
    const endPosInRemaining = remainingAlphaText.indexOf(alphaEndWord);
    
    if (endPosInRemaining === -1) {
      const excerptLength = 400;
      const endOfExcerpt = Math.min(originalStartPos + excerptLength, cleanedSourceText.length);
      
      return {
        fullText: sourceText,
        highlightedRange: { 
          start: originalStartPos, 
          end: endOfExcerpt
        },
        isError: true,
        errorMessage: `Found the beginning of the reference but could not locate the end word "${end_word}" in reference [${refNumber}].`
      };
    }
    
    const endPos = startPos + alphaStartWord.length + endPosInRemaining;
    const originalEndPos = findOriginalPosition(cleanedSourceText, alphaSourceText, endPos) + alphaEndWord.length;
    
    function findOriginalPosition(originalText: string, alphaText: string, alphaPosition: number) {
      let alphaCharCount = 0;
      let originalPos = 0;
      
      while (alphaCharCount < alphaPosition && originalPos < originalText.length) {
        if (/[a-zA-Z\s]/.test(originalText[originalPos])) {
          alphaCharCount++;
        }
        originalPos++;
      }
      
      return originalPos;
    }
    
    return {
      fullText: sourceText,
      highlightedRange: { 
        start: originalStartPos, 
        end: originalEndPos
      },
      isError: false
    };
  }, [summary])

  const handleReferenceClick = useCallback((refNumber: string, occurrenceIndex: number) => {
    // Toggle: if the same reference is clicked again, close the panel and clear activeReference
    if (
      isCitationPanelOpen &&
      activeReference &&
      activeReference.number === refNumber &&
      activeReference.index === occurrenceIndex
    ) {
      setIsCitationPanelOpen(false);
      setActiveReference(null);
      return;
    }
    setIsCitationPanelOpen(true);
    const result = extractReferenceText(refNumber, occurrenceIndex)
    
    if (!result) {
      const fallbackText = `The text extract for reference [${refNumber}] (occurrence ${occurrenceIndex + 1}) is not available. This may be due to incomplete data from the API or a processing error.`
      
      setActiveReference({
        number: refNumber,
        text: fallbackText,
        index: occurrenceIndex,
        fullText: null,
        highlightedRange: null,
        isError: true,
        errorMessage: `Could not find text for reference [${refNumber}], occurrence ${occurrenceIndex + 1}.`
      })
    } else if (typeof result === 'string') {
      setActiveReference({
        number: refNumber,
        text: result,
        index: occurrenceIndex,
        fullText: null,
        highlightedRange: null,
        isError: true,
        errorMessage: null
      })
    } else {
      const { fullText, highlightedRange, isError, errorMessage } = result
      
      setActiveReference({
        number: refNumber,
        text: fullText || "",
        index: occurrenceIndex,
        fullText: fullText,
        highlightedRange: highlightedRange,
        isError: isError || false,
        errorMessage: errorMessage
      })
    }
  }, [extractReferenceText, isCitationPanelOpen, activeReference])

  const askFollowupQuestion = async () => {
    if (!followupQuestion.trim() || isAskingFollowup) return
    
    setIsAskingFollowup(true)
    setFollowupError(null)
    
    try {
      setChatHistory(prev => [
        ...prev, 
        { type: 'followup', question: followupQuestion, answer: '', sources: {}, page_references: {} }
      ])
      
      const response = await fetch('/api/guidelines/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: citation.title,
          guidelines_index: citation.guidelines_index,
          question: followupQuestion
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get answer: ${response.status}`)
      }
      
      const data = await response.json()
      
      setChatHistory(prev => {
        const updated = [...prev]
        const lastIndex = updated.length - 1
        
        if (lastIndex >= 0) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            answer: data.answer,
            sources: data.sources || {},
            page_references: data.page_references || {}
          }
        }
        
        return updated
      })
      
      setFollowupQuestion('')
    } catch (err: any) {
      logger.error('Error asking followup question:', err)
      setFollowupError(err.message || 'Failed to get answer')
      setChatHistory(prev => prev.slice(0, -1))
    } finally {
      setIsAskingFollowup(false)
    }
  }

  const processMarkdown = (markdown: string) => {
    if (!markdown) return ''
    
    referenceOccurrences.current.clear()
    
    let processedText = markdown.replace(/```markdown|```/g, '')
    
    processedText = processedText.replace(/\[(\d+)\]/g, (match, number) => {
      const occurrenceIndex = referenceOccurrences.current.get(number) || 0
      referenceOccurrences.current.set(number, occurrenceIndex + 1)
      return `__REF_${number}_${occurrenceIndex}__`
    })
    
    return processedText
  }

  const formatReferenceContent = (options: { hidePageLabel?: boolean } = {}) => {
    if (!activeReference || !activeReference.fullText) return null
    let formattedContent
    // Always show the full text, but highlight the excerpt if present
    if (activeReference.highlightedRange) {
      const { fullText, highlightedRange } = activeReference
      const { start, end } = highlightedRange
      const beforeHighlight = fullText.substring(0, start)
      const highlightedText = fullText.substring(start, end)
      const afterHighlight = fullText.substring(end)
      formattedContent = (
        <>
          {beforeHighlight && <span>{beforeHighlight}</span>}
          {highlightedText && <span className="reference-highlight" ref={highlightRef}>{highlightedText}</span>}
          {afterHighlight && <span>{afterHighlight}</span>}
        </>
      )
    } else {
      formattedContent = <span>{activeReference.fullText}</span>
    }
    return (
      <div
        className="reference-content"
        style={{
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Page Number Label with dynamic citation number - always visible, unless hidden by option */}
        {!options.hidePageLabel && (
          <div className="flex items-center gap-2 mb-0" style={{ marginTop: '24px' }}>
            <FileText size={20} className="text-blue-500" />
            <span
              style={{
                color: '#3771FE',
                fontWeight: 600,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '1.1rem'
              }}
            >
              Page {activeReference.number}
            </span>
          </div>
        )}
        {/* Scrollable source text only */}
        <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          <div
            className="full-reference"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.7,
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              overflowY: 'auto',
              wordBreak: 'break-word',
              width: '100%',
              fontSize: '16px',
              color: '#223258',
              background: 'none',
              border: 'none',
              boxShadow: 'none',
              margin: 0,
              whiteSpace: 'normal'
            }}
          >
            {formattedContent}
          </div>
        </div>
      </div>
    )
  }

  const toggleRightCollapse = () => {
    if (isCitationPanelOpen) {
      setIsCitationPanelOpen(false);
      setActiveReference(null);
    } else {
      setIsCitationPanelOpen(true);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-end z-50 p-0">
      <div className="bg-white rounded-lg shadow-lg w-[90%] h-full flex overflow-hidden relative">
        {/* Back Button above modal */}
        <button
          className="absolute left-6 top-4 font-medium rounded text-base flex items-center gap-1 shadow z-50"
          onClick={onClose}
        >
          <Image
            src="/double_back.svg"
            alt="Back"
            width={32}
            height={32}
          />
        </button>

        {/* Blue padding area wraps both panels */}
        <div className="bg-[#F4F7FF] pt-14 px-6 flex-1 flex gap-6 min-h-0">
          {/* Summary Panel - 1.3 times wider than source panel */}
          <div className={`bg-white rounded-xl shadow-sm border border-gray-300 flex flex-col min-h-0 ${isCitationPanelOpen ? 'flex-[1.3]' : 'flex-1'}`}>
            {/* Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-800" style={{ fontSize: '28px', margin: 0 }}>Guideline Summary</h2>
              {(citation.link || citation.url) && (
                <a
                  href={citation.link || citation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#3771FE',
                    display: 'inline-flex',
                    alignItems: 'center',
                    zIndex: 2,
                  }}
                  title="Open original source"
                >
                  <ExternalLink size={24} />
                </a>
              )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0" style={{paddingTop: 0}}>
              {isLoading ? (
                <div className="flex flex-col justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                  <div className="text-base text-gray-500" style={{ fontFamily: 'DM Sans, sans-serif', marginTop: 8 }}>
                    Generating AI Summary for this Guideline ...
                  </div>
                </div>
              ) : error ? (
                <div className="text-red-500">{error}</div>
              ) : (
                <div className="space-y-4">
                  {/* Title and Tags */}
                  <div className="pt-6 pb-4">
                    <h1 
                      className="mb-4"
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 600,
                        color: '#273561',
                        fontSize: '24px',
                        lineHeight: 1.2
                      }}
                    >
                      {(citation.link || citation.url) ? (
                        <a
                          href={citation.link || citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="guideline-title-link"
                          style={{ color: '#273561', cursor: 'pointer', transition: 'color 0.2s' }}
                        >
                          {summary?.title || citation.title}
                        </a>
                      ) : (
                        summary?.title || citation.title
                      )}
                    </h1>
                    {/* Tags */}
                    <div className="flex gap-2">
                      {citation.year && (
                        <span
                          className="px-3 py-1 text-sm"
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            color: '#3771FE',
                            background: 'rgba(148, 167, 214, 0.2)',
                            fontWeight: 400,
                            border: 'none',
                            borderRadius: 6,
                          }}
                        >
                          {citation.year}
                        </span>
                      )}
                      {citation.society && (
                        <span
                          className="px-3 py-1 text-sm"
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            color: '#3771FE',
                            background: 'rgba(148, 167, 214, 0.2)',
                            fontWeight: 400,
                            border: 'none',
                            borderRadius: 6,
                          }}
                        >
                          {citation.society}
                        </span>
                      )}
                    </div>
                  </div>

                  {chatHistory.map((message, index) => (
                    <div key={index} className={`mb-4 ${index > 0 ? 'mt-8 border-t pt-6' : ''}`}>
                      {message.question && (
                        <div className="mb-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '20px', color: '#223258', margin: 0 }}>{message.question}</p>
                          </div>
                        </div>
                      )}
                      {message.answer && (
                        <>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center text-blue-500">
                              <Image
                                src="/answer-icon.svg"
                                alt="Answer icon"
                                width={24}
                                height={24}
                              />
                            </div>
                            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: '18px', color: '#262F4D' }}>
                              {message.type === 'main' ? 'Summary' : 'Answer'}
                            </span>
                          </div>
                          <div className='mt-6'>
                            <div className="prose prose-sm max-w-none" style={{ fontFamily: 'DM Sans, sans-serif', color: '#1F2937', fontSize: '16px' }}>
                              <GuidelineMarkdown 
                                content={message.answer}
                                sources={message.sources || null}
                                pageReferences={message.page_references || null}
                                onCitationClick={(citation, index) => handleReferenceClick(citation, index || 0)}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {followupError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                      {followupError}
                    </div>
                  )}
                  <div ref={answerEndRef} />
                </div>
              )}
            </div>

            {/* Follow-up Input - Fixed at bottom inside the container */}
            {(!isLoading && summary) && (
              <div className="p-6">
                <div className="flex items-center border-2 rounded-lg p-4 w-full relative" style={{ borderColor: 'rgba(55, 113, 254, 0.27)', background: 'white' }}>
                  <input
                    ref={questionInputRef}
                    type="text"
                    placeholder="Ask a question about this guideline..."
                    value={followupQuestion}
                    onChange={(e) => setFollowupQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        askFollowupQuestion();
                      }
                    }}
                    disabled={isAskingFollowup}
                    className="flex-1 bg-transparent border-none outline-none text-lg text-gray-700 placeholder-gray-400 pr-12"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={askFollowupQuestion}>
                    {isAskingFollowup ? (
                      <div className="h-6 w-6 border-t-2 border-b-2 border-[#3771FE] rounded-full animate-spin"></div>
                    ) : (
                      <Image src="/search.svg" alt="Search" width={40} height={40} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Original Source Panel - Collapsible like reference */}
          <div className={`bg-white rounded-xl shadow-sm border border-gray-300 transition-all duration-300 ease-in-out flex flex-col ${isCitationPanelOpen ? 'flex-1 min-w-80' : 'w-16'}`}>
            {/* Header */}
            <div className={`flex items-center pt-6 pb-4 border-b border-gray-200 ${isCitationPanelOpen ? 'px-4' : 'px-1'}`} style={{ minHeight: '80px' }}>
              <button
                onClick={toggleRightCollapse}
                className={`rounded-md hover:bg-gray-100 transition-colors ${isCitationPanelOpen ? 'mr-2' : 'mx-auto'}`}
                title={isCitationPanelOpen ? "Collapse" : "Expand"}
              >
                <Image
                  src="/source-collapsible.png"
                  alt="Toggle Source Panel"
                  width={32}
                  height={32}
                />
              </button>
              {isCitationPanelOpen && (
                <span className="font-medium text-gray-900" style={{ fontSize: '28px' }}>Original Source</span>
              )}
            </div>

            {/* Content - Only show when expanded */}
            {isCitationPanelOpen && (
              <div className="flex-1 p-6 overflow-y-auto">
                {activeReference && (
                  <div className="flex items-center gap-2 mb-6">
                    <FileText size={16} className="text-blue-600" />
                    <span
                      className="text-blue-600 font-medium"
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '1.1rem'
                      }}
                    >
                      Page {activeReference.number}
                    </span>
                  </div>
                )}

                {activeReference ? (
                  <>{formatReferenceContent({ hidePageLabel: true })}</>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-gray-500 text-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Click on a reference number
                      <span 
                        className="reference-number"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#E0E9FF',
                          color: '#1F2937',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          fontSize: '0.75rem',
                          marginLeft: '4px',
                          verticalAlign: 'super',
                          position: 'relative',
                          top: '-2px'
                        }}
                      >
                        1
                      </span> to view the original source
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .reference-note {
          background-color: #f8f9fa;
          border-left: 4px solid #e9ecef;
          padding: 1rem;
          color: #495057;
          font-size: 0.875rem;
          margin: 1rem 0;
          border-radius: 0.25rem;
        }

        .reference-highlight-note {
          background-color: #fff3bf;
          border-left: 4px solid #ffd43b;
          padding: 1rem;
          color: #495057;
          font-size: 0.875rem;
          font-style: italic;
          margin: 1rem 0;
          border-radius: 0.25rem;
        }

        .full-reference {
          font-family: 'DM Sans', sans-serif;
          line-height: 1.7;
          padding: 1rem;
          backgroundColor: '#f8f9fa';
          overflow-y: auto;
          word-break: break-word;
          width: 100%;
          font-size: 16px;
          color: #223258;
          background: none;
          border: none;
          box-shadow: none;
          margin: 0;
          white-space: normal;
        }

        .reference-highlight {
          background-color: yellow !important;
          border-radius: 4px;
          font-family: 'Poppins' !important;
        }

        .reference-content strong {
          background-color: #fff3bf;
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-weight: 600;
          color: #e67700;
        }

        .reference-number {
          text-decoration: none;
          color: #1F2937;
          background: #E0E9FF;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.75rem;
          font-family: 'DM Sans', sans-serif;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          padding: 0;
          margin: 0 2px;
          gap: 2px;
          vertical-align: super;
          position: relative;
          top: -2px;
        }
        
        .reference-number:hover {
          text-decoration: underline;
          color: #1c7ed6;
        }
        
        /* Heading styles */
        .heading-1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #333;
        }
        
        .heading-2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #444;
        }
        
        .heading-3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #555;
        }
        
        .heading-4, .heading-5, .heading-6 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #666;
        }
        
        /* Make sure paragraph and inline elements display properly */
        .markdown-paragraph {
          display: block;
          margin-bottom: 1rem;
        }
        
        #markdown-content p {
          display: inline !important;
          margin: 0;
        }
        
        /* Ensure headings in markdown render properly */
        #markdown-content h1, 
        #markdown-content h2, 
        #markdown-content h3, 
        #markdown-content h4, 
        #markdown-content h5, 
        #markdown-content h6 {
          display: block;
          margin-top: 0;
          margin-bottom: 0;
          font-weight: bold;
          color: #214498;
        }
        
        /* Fix list items to display properly with inline citations */
        #markdown-content ul,
        #markdown-content ol {
          display: block;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          padding-left: 1.5em;
        }
        
        #markdown-content li {
          display: list-item;
          margin-bottom: 0.5em;
        }
        
        #markdown-content li p {
          display: inline !important;
        }
        
        #markdown-content br {
          display: block;
          content: "";
          margin-top: 0.5em;
        }

        /* Add transition styles for smooth animation */
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }

        /* Set bullet color for markdown lists */
        #markdown-content ul > li::marker,
        #markdown-content ol > li::marker {
          color: #214498;
        }

        .guideline-title-link:hover {
          color: #3771FE !important;
        }

        /* Hide scrollbar but keep scrollable */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;     /* Firefox */
        }

        /* Override prose font weight for normal text */
        .prose p, .prose span, .prose li, .prose div {
          font-weight: 400 !important;
        }
        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
};