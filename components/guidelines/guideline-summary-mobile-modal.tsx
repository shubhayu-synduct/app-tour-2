import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Search, ExternalLink, FileText } from 'lucide-react';
import Image from 'next/image';
import { GuidelineMarkdown } from './guideline-markdown';

interface Citation {
  title: string;
  url?: string;
  authors?: string[];
  year?: string | number;
  journal?: string;
  doi?: string;
  source_type?: string;
  guidelines_index?: string;
  society?: string;
  link?: string;
}

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

interface GuidelineSummaryMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  guidelineId: number;
  guidelineTitle: string;
  year: string;
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

export default function GuidelineSummaryMobileModal({ 
  isOpen, 
  onClose, 
  guidelineId, 
  guidelineTitle,
  year,
  link,
  url 
}: GuidelineSummaryMobileModalProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeReference, setActiveReference] = useState<{ 
    number: string; 
    text: string; 
    index: number; 
    fullText: string | null; 
    highlightedRange: { start: number; end: number } | null; 
    isError: boolean; 
    errorMessage: string | null | undefined 
  } | null>(null);
  const [processedMarkdown, setProcessedMarkdown] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [followupQuestion, setFollowupQuestion] = useState<string>('');
  const [isAskingFollowup, setIsAskingFollowup] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);
  
  const referenceOccurrences = useRef<Map<string, number>>(new Map());
  const questionInputRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
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
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/guidelines/summarize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: guidelineTitle,
            guidelines_index: guidelineId.toString()
          })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch summary: ${response.status}`);
        }
        
        const data = await response.json();
        const decodedSummary = decodeUnicode(data.summary);
        setSummary({ ...data, summary: decodedSummary });
        
        setChatHistory([{
          type: 'main',
          answer: decodedSummary,
          sources: data.sources,
          page_references: data.page_references
        }]);
        
        referenceOccurrences.current.clear();
        
        if (data && data.summary) {
          setProcessedMarkdown(processMarkdown(decodedSummary));
        }
      } catch (err: any) {
        console.error('Error fetching summary:', err);
        setError(err.message || 'Failed to fetch summary');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen && !summary) {
      fetchSummary();
    }
  }, [isOpen, guidelineId, guidelineTitle, summary]);

  const extractReferenceText = useCallback((refNumber: string, refIndex: number) => {
    if (!summary) return null;
    
    const pageRef = summary.page_references[refNumber];
    if (!pageRef || !pageRef[refIndex]) {
      return `Reference extract not available for citation [${refNumber}] (occurrence ${refIndex + 1}).`;
    }
    
    const { start_word, end_word } = pageRef[refIndex];
    const sourceText = summary.sources[refNumber];
    
    if (!sourceText) {
      return `Source text not available for reference [${refNumber}].`;
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
  }, [summary]);

  const handleReferenceClick = useCallback((refNumber: string, occurrenceIndex: number) => {
    setActiveTab('original');
    const result = extractReferenceText(refNumber, occurrenceIndex);
    
    if (!result) {
      setActiveReference({
        number: refNumber,
        text: `The text extract for reference [${refNumber}] (occurrence ${occurrenceIndex + 1}) is not available.`,
        index: occurrenceIndex,
        fullText: null,
        highlightedRange: null,
        isError: true,
        errorMessage: `Could not find text for reference [${refNumber}], occurrence ${occurrenceIndex + 1}.`
      });
    } else if (typeof result === 'string') {
      setActiveReference({
        number: refNumber,
        text: result,
        index: occurrenceIndex,
        fullText: null,
        highlightedRange: null,
        isError: true,
        errorMessage: null
      });
    } else {
      const { fullText, highlightedRange, isError, errorMessage } = result;
      
      setActiveReference({
        number: refNumber,
        text: fullText || "",
        index: occurrenceIndex,
        fullText: fullText,
        highlightedRange: highlightedRange,
        isError: isError || false,
        errorMessage: errorMessage
      });
    }
  }, [extractReferenceText]);

  const askFollowupQuestion = async () => {
    if (!followupQuestion.trim() || isAskingFollowup) return;
    
    setIsAskingFollowup(true);
    setFollowupError(null);
    
    try {
      setChatHistory(prev => [
        ...prev, 
        { type: 'followup', question: followupQuestion, answer: '', sources: {}, page_references: {} }
      ]);
      
      const response = await fetch('/api/guidelines/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: guidelineTitle,
          guidelines_index: guidelineId.toString(),
          question: followupQuestion
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get answer: ${response.status}`);
      }
      
      const data = await response.json();
      
      setChatHistory(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        
        if (lastIndex >= 0) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            answer: data.answer,
            sources: data.sources || {},
            page_references: data.page_references || {}
          };
        }
        
        return updated;
      });
      
      setFollowupQuestion('');
    } catch (err: any) {
      console.error('Error asking followup question:', err);
      setFollowupError(err.message || 'Failed to get answer');
      setChatHistory(prev => prev.slice(0, -1));
    } finally {
      setIsAskingFollowup(false);
    }
  };

  const processMarkdown = (markdown: string) => {
    if (!markdown) return '';
    
    referenceOccurrences.current.clear();
    
    let processedText = markdown.replace(/```markdown|```/g, '');
    
    processedText = processedText.replace(/\[(\d+)\]/g, (match, number) => {
      const occurrenceIndex = referenceOccurrences.current.get(number) || 0;
      referenceOccurrences.current.set(number, occurrenceIndex + 1);
      return `__REF_${number}_${occurrenceIndex}__`;
    });
    
    return processedText;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50">
      <div className="h-full w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 bg-[#214498] text-white rounded-lg hover:bg-[#1B3B8B] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Guideline Summary</h1>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Search size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'text-[#3771FE] border-b-2 border-[#3771FE] bg-[#F4F7FF]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Guideline Summary
          </button>
          <button
            onClick={() => setActiveTab('original')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'original'
                ? 'text-[#3771FE] border-b-2 border-[#3771FE] bg-[#F4F7FF]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Original Source
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 h-full">
          {activeTab === 'summary' ? (
            <div className="space-y-6">
              {/* Title and Meta */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                  {summary?.title || guidelineTitle}
                </h2>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
                  {year && (
                    <span className="px-2 sm:px-3 py-1 bg-[#E0E9FF] text-[#3771FE] rounded-full text-xs sm:text-sm font-medium">
                      {year}
                    </span>
                  )}
                </div>
              </div>

              {/* Summary Section */}
              <div>
                {isLoading ? (
                  <div className="flex flex-col justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-t-2 border-b-2 border-[#3771FE] mb-3 sm:mb-4"></div>
                    <div className="text-sm sm:text-base text-gray-500" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Generating AI Summary for this Guideline ...
                    </div>
                  </div>
                ) : error ? (
                  <div className="text-red-500 text-sm sm:text-base">{error}</div>
                ) : (
                  <div className="space-y-4">
                    {chatHistory.map((message, index) => (
                      <div key={index} className={`mb-3 sm:mb-4 ${index > 0 ? 'mt-6 sm:mt-8 border-t pt-4 sm:pt-6' : ''}`}>
                        {message.question && (
                          <div className="mb-3 sm:mb-4">
                            <div className="bg-[#F4F7FF] p-2 sm:p-3 rounded-lg">
                              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px sm:text-lg md:text-xl', color: '#223258', margin: 0 }}>
                                {message.question}
                              </p>
                            </div>
                          </div>
                        )}
                        {message.answer && (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center text-[#3771FE]">
                                <Image
                                  src="/answer-icon.svg"
                                  alt="Answer icon"
                                  width={20}
                                  height={20}
                                  className="sm:w-6 sm:h-6"
                                />
                              </div>
                              <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: '14px sm:text-base md:text-lg', color: '#262F4D' }}>
                                {message.type === 'main' ? 'Summary' : 'Answer'}
                              </span>
                            </div>
                            <div>
                              <div className="prose prose-sm sm:prose-base max-w-none" style={{ fontFamily: 'DM Sans, sans-serif', color: '#1F2937', fontSize: '14px sm:text-base md:text-lg' }}>
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
                      <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded mb-3 sm:mb-4 text-sm sm:text-base">
                        {followupError}
                      </div>
                    )}
                    <div ref={answerEndRef} />
                  </div>
                )}
                
                {/* Search Bar */}
                {(!isLoading && summary) && (
                  <div className="relative mt-4 sm:mt-6">
                    <div className="flex items-center border-2 border-[#3771FE] rounded-lg p-2 sm:p-4 bg-[#F4F7FF]">
                      <Search size={18} className="text-gray-400 mr-2 sm:mr-3" />
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
                        className="flex-1 bg-transparent border-none outline-none text-sm sm:text-base text-gray-700 placeholder-gray-400"
                      />
                      <button 
                        className={`ml-2 sm:ml-3 p-1.5 sm:p-2 bg-[#3771FE] text-white rounded-lg hover:bg-[#1B3B8B] transition-colors ${isAskingFollowup ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={askFollowupQuestion}
                        disabled={isAskingFollowup}
                      >
                        {isAskingFollowup ? (
                          <div className="h-4 w-4 sm:h-5 sm:w-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                        ) : (
                          <ExternalLink size={14} className="sm:w-4 sm:h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex items-center gap-3 mb-6">
                <FileText size={20} className="text-[#3771FE]" />
                <span className="text-lg font-semibold text-[#3771FE]">
                  Page {activeReference?.number || '1'}
                </span>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {activeReference ? (
                  <div className="p-4 rounded-lg bg-white">
                    {activeReference.highlightedRange ? (
                      <>
                        <span>{activeReference.fullText?.substring(0, activeReference.highlightedRange.start)}</span>
                        <span className="bg-yellow-200" ref={highlightRef}>
                          {activeReference.fullText?.substring(
                            activeReference.highlightedRange.start,
                            activeReference.highlightedRange.end
                          )}
                        </span>
                        <span>{activeReference.fullText?.substring(activeReference.highlightedRange.end)}</span>
                      </>
                    ) : (
                      <p className="text-gray-800 leading-relaxed">
                        {activeReference.fullText}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-white">
                    <p className="text-gray-500 text-base" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                      Click on a reference number to view the original source
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .reference-number {
          text-decoration: none;
          color: #1F2937;
          background: #E0E9FF;
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.7rem;
          font-family: 'DM Sans', sans-serif;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          padding: 0;
          margin: 0 2px;
          gap: 2px;
          vertical-align: super;
          position: relative;
          top: -2px;
        }
        
        @media (min-width: 640px) {
          .reference-number {
            font-size: 0.75rem;
            width: 18px;
            height: 18px;
          }
        }
        
        /* Heading styles */
        .heading-1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #333;
        }
        
        .heading-2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #444;
        }
        
        .heading-3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #555;
        }
        
        .heading-4, .heading-5, .heading-6 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: #666;
        }
        
        @media (min-width: 640px) {
          .heading-1 {
            font-size: 1.75rem;
            margin-top: 2rem;
            margin-bottom: 1rem;
          }
          
          .heading-2 {
            font-size: 1.5rem;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
          }
          
          .heading-3 {
            font-size: 1.25rem;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
          }
          
          .heading-4, .heading-5, .heading-6 {
            font-size: 1.1rem;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
          }
        }
        
        /* Make sure paragraph and inline elements display properly */
        .markdown-paragraph {
          display: block;
          margin-bottom: 0.75rem;
        }
        
        @media (min-width: 640px) {
          .markdown-paragraph {
            margin-bottom: 1rem;
          }
        }
        
        #markdown-content p {
          display: inline !important;
          margin: 0;
          font-size: 14px;
        }
        
        @media (min-width: 640px) {
          #markdown-content p {
            font-size: 16px;
          }
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
          font-size: 14px;
        }
        
        @media (min-width: 640px) {
          #markdown-content ul,
          #markdown-content ol {
            font-size: 16px;
          }
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

        /* Set bullet color for markdown lists */
        #markdown-content ul > li::marker,
        #markdown-content ol > li::marker {
          color: #214498;
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