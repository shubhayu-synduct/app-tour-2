"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, ExternalLink, ChevronRight, ChevronLeft, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
  isOpen: boolean;
  onClose: () => void;
  guidelineId: number;
  guidelineTitle: string;
  year?: string;
  society?: string;
  link?: string;
  url?: string;
}

function decodeUnicode(str: string): string {
  if (!str) return str;
  const singleEscaped = str.replace(/\\u/g, '\\u');
  return singleEscaped.replace(/\\u([0-9a-fA-F]{4})/g, (_, grp) =>
    String.fromCharCode(parseInt(grp, 16))
  );
}

export default function GuidelineSummaryModal({ 
  isOpen, 
  onClose, 
  guidelineId, 
  guidelineTitle,
  year,
  society,
  link,
  url
}: GuidelineSummaryModalProps) {
  const router = useRouter();
  const effectiveLink = link || url;
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
            title: guidelineTitle,
            guidelines_index: guidelineId
          })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch summary: ${response.status}`)
        }
        
        const data = await response.json()
        // Decode unicode in summary before using it
        const decodedSummary = decodeUnicode(data.summary)
        console.log('Summary API response:', decodedSummary)
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
        console.error('Error fetching summary:', err)
        setError(err.message || 'Failed to fetch summary')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (isOpen && guidelineId && !summary) {
      fetchSummary()
    }
  }, [isOpen, guidelineId, guidelineTitle, summary])

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
          title: guidelineTitle,
          guidelines_index: guidelineId,
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
      console.error('Error asking followup question:', err)
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

  const MarkdownWithReferences = ({ content }: { content: string }) => {
    const processedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/__REF_(\d+)_(\d+)__/g, ' __REF_$1_$2__');
      
    const paragraphs = processedContent.split('\n\n');
    
    return (
      <div id="markdown-content">
        {paragraphs.map((paragraph, paragraphIndex) => {
          const isHeading = paragraph.match(/^#+\s/);
          const parts = paragraph.split(/__REF_(\d+)_(\d+)__/g);
          const blockClassName = isHeading 
            ? `heading-${paragraph.match(/^(#+)\s/)?.[1].length || 1}` 
            : 'markdown-paragraph';
          
          return (
            <div key={paragraphIndex} className={blockClassName}>
              {parts.map((part, index) => {
                if (index % 3 === 0) {
                  return <ReactMarkdown key={`text-${index}`} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>;
                } else if (index % 3 === 1) {
                  const refNumber = part;
                  const occurrenceIndex = parseInt(parts[index + 1]);
                  
                  return (
                    <span
                      key={`ref-${index}`}
                      className="reference-number"
                      data-ref-number={refNumber}
                      data-occurrence-index={occurrenceIndex}
                      onClick={() => handleReferenceClick(refNumber, occurrenceIndex)}
                    >
                      {refNumber}
                    </span>
                  );
                }
                return null;
              })}
            </div>
          );
        })}
      </div>
    );
  };

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
              fontSize: '1rem',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-end z-50 p-0">
      <div className="bg-white rounded-lg shadow-lg w-[90%] h-full flex overflow-hidden relative">
        {/* Back Button above modal */}
        <button
          className="absolute left-6 top-4 bg-[#214498] text-white font-medium rounded px-3 py-1 text-sm flex items-center gap-1 shadow z-50"
          style={{ border: '1px solid #3771FE' }}
          onClick={onClose}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>&laquo;</span> Back
        </button>
        {/* Summary Panel */}
        <div
          className="flex flex-col overflow-hidden transition-all duration-300 ease-in-out relative"
          style={{ width: isCitationPanelOpen ? '60%' : '97%' }}
        >
          {/* Blue padding area on top, now wraps both header and content */}
          <div className={isCitationPanelOpen ? 'bg-[#F4F7FF] pt-14 px-6 flex-1 flex flex-col min-h-0' : 'bg-[#F4F7FF] pt-14 px-6 flex-1 flex flex-col min-h-0'}>
            <div className={isCitationPanelOpen ? 'bg-white rounded-lg shadow-sm border border-gray-300 border-b-0 px-8 pt-6' : 'bg-white rounded-lg shadow-sm border border-gray-300 border-b-0 px-8 pt-6'}>
              <div className="flex justify-between items-center" style={{ minHeight: 0, paddingTop: 0, paddingBottom: 0}}>
                <div className="ml-10 w-full">
                  <h2 className="font-medium text-gray-800" style={{ fontSize: '28px', margin: 0 }}>Guideline Summary</h2>
                  <div>
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
                      {effectiveLink ? (
                        <a
                          href={effectiveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="guideline-title-link"
                          style={{ color: '#273561', cursor: 'pointer', transition: 'color 0.2s' }}
                        >
                          {summary?.title || guidelineTitle}
                        </a>
                      ) : (
                        summary?.title || guidelineTitle
                      )}
                    </h1>
                    {/* Tags */}
                    <div className="flex gap-2 mb-6">
                      {year && (
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
                          {year}
                        </span>
                      )}
                      {society && (
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
                          {society}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Main Heading, Title, and Tags aligned with answer icon */}
            </div>
            {/* Scrollable summary content, no gap below header, same px-6 as header */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto px-6 pb-40 bg-white rounded-lg border border-gray-300 border-t-0 min-h-0" style={{paddingTop: 0}}>
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
                            <div style={{ marginLeft: 40 }}>
                              <div className="prose prose-sm max-w-none" style={{ fontFamily: 'DM Sans, sans-serif', color: '#1F2937', fontSize: '20px' }}>
                                <MarkdownWithReferences content={processMarkdown(message.answer)} />
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
                    {/* Spacer to ensure content is visible above the follow-up bar */}
                    <div style={{ height: '120px' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Follow-up bar: fixed at the bottom, only show after summary is loaded */}
          {(!isLoading && summary) && (
            <div className="absolute left-1/2 transform -translate-x-1/2 shadow-lg rounded-xl border" style={{ bottom: '32px', zIndex: 50, maxWidth: 'calc(100% - 48px)', width: '800px', borderColor: 'rgba(55, 113, 254, 0.27)', background: 'white', padding: '0' }}>
              <div className="relative w-full">
                <input
                  ref={questionInputRef}
                  type="text"
                  placeholder="Ask a question about this guideline..."
                  className="w-full h-20 p-4 pl-12 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg bg-transparent"
                  value={followupQuestion}
                  onChange={(e) => setFollowupQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      askFollowupQuestion()
                    }
                  }}
                  disabled={isAskingFollowup}
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <Search className="w-7 h-7" />
                </div>
                <button 
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-white bg-[#3771FE] rounded-lg w-12 h-12 flex items-center justify-center transition-colors ${isAskingFollowup ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={askFollowupQuestion}
                  disabled={isAskingFollowup}
                >
                  {isAskingFollowup ? (
                    <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Original Source Panel (side by side, always shows content) */}
        <div
          className="flex flex-col h-full transition-all duration-300 ease-in-out bg-white shadow-lg border-l border-gray-200"
          style={{ width: isCitationPanelOpen ? '40%' : '3%' }}
        >
          {/* Blue padding area on top */}
          <div className={isCitationPanelOpen ? 'bg-[#F4F7FF] pt-14 px-6 w-full' : 'bg-[#F4F7FF] pt-14 px-0 w-full'}>
            <div className={isCitationPanelOpen ? 'bg-white rounded-lg shadow-sm border border-gray-300 border-b-0 px-6 pt-6 w-full' : 'bg-white rounded-lg shadow-sm border border-gray-300 border-b-0 pt-6 w-56 mx-auto'}>
              <div className="flex items-center px-0 py-0" style={{ minHeight: 0 }}>
                <button
                  type="button"
                  className="flex items-center gap-2 focus:outline-none bg-transparent border-none p-0 m-0"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (isCitationPanelOpen) {
                      setIsCitationPanelOpen(false);
                      setActiveReference(null);
                    } else {
                      setIsCitationPanelOpen(true);
                    }
                  }}
                >
                  <Image
                    src="/Original Source.svg"
                    alt="Original Source icon"
                    width={40}
                    height={40}
                  />
                  <h2 className="text-2xl font-medium text-gray-800" style={{ margin: 0 }}>
                    Original Source
                  </h2>
                </button>
                {effectiveLink && (
                  <a
                    href={effectiveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginLeft: 'auto',
                      color: '#3771FE',
                      display: 'inline-flex',
                      alignItems: 'center',
                      zIndex: 2,
                    }}
                    title="Open original source"
                  >
                    <ExternalLink size={32} />
                  </a>
                )}
              </div>
              {/* Page Number label at the same level as icon/label row */}
              {isCitationPanelOpen && activeReference && (
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
            </div>
          </div>
          {/* Only show content area when expanded */}
          {isCitationPanelOpen && (
            <div className="flex-1 flex flex-col min-h-0">
              <div
                className={`px-6 pt-0 pb-6 bg-[#F4F7FF] transition-all duration-300 ease-in-out flex-1 min-h-0`}
                style={{ pointerEvents: 'auto', overflow: 'hidden', maxHeight: '100%' }}
              >
                <div className="prose prose-sm max-w-none bg-white h-full rounded-lg p-6 border border-gray-300 border-t-0 flex items-center justify-center">
                  {activeReference ? (
                    <>{formatReferenceContent({ hidePageLabel: true })}</>
                  ) : (
                    <span className="text-gray-500 text-base" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Click on a reference number to view the original source
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
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
          background-color: #f8f9fa;
          overflow-y: auto;
          word-break: break-word;
          width: 100%;
          font-size: 1rem;
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

        /* Add this to your global styles for a nice fade/blur effect */
        .minimized-original-source { filter: blur(2px); opacity: 0.5; pointer-events: none; overflow: hidden; }

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
} 