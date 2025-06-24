"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { useParams } from 'next/navigation'
import { ArrowLeft, Search, ExternalLink, X, ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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

export default function GuidelineSummaryPage() {
  const { user } = useAuth()
  const params = useParams()
  const guidelineId = params.id as string
  
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
  const [showReferencePanel, setShowReferencePanel] = useState(true)
  
  // Chat and follow-up questions state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [followupQuestion, setFollowupQuestion] = useState<string>('')
  const [isAskingFollowup, setIsAskingFollowup] = useState(false)
  const [followupError, setFollowupError] = useState<string | null>(null)
  
  // Track all reference occurrences
  const referenceOccurrences = useRef<Map<string, number>>(new Map())
  const questionInputRef = useRef<HTMLInputElement>(null)

  // Add state for collapsed sidebar
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Add toggle function for sidebar
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

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
            title: "string",
            guidelines_index: parseInt(guidelineId)
          })
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch summary: ${response.status}`)
        }
        
        const data = await response.json()
        setSummary(data)
        
        // Add the initial summary to the chat history
        setChatHistory([{
          type: 'main',
          answer: data.summary,
          sources: data.sources,
          page_references: data.page_references
        }])
        
        // Reset reference occurrences for new summary
        referenceOccurrences.current.clear()
        
        if (data && data.summary) {
          setProcessedMarkdown(processMarkdown(data.summary))
        }
      } catch (err: any) {
        console.error('Error fetching summary:', err)
        setError(err.message || 'Failed to fetch summary')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (guidelineId) {
      fetchSummary()
    }
  }, [guidelineId])

  const extractReferenceText = useCallback((refNumber: string, refIndex: number) => {
    if (!summary) return null
    
    const pageRef = summary.page_references[refNumber]
    if (!pageRef || !pageRef[refIndex]) {
      // Return a fallback message if the specific reference extract is not found
      return `Reference extract not available for citation [${refNumber}] (occurrence ${refIndex + 1}). The reference exists but the specific extract could not be found.`
    }
    
    const { start_word, end_word } = pageRef[refIndex]
    const sourceText = summary.sources[refNumber]
    
    if (!sourceText) {
      // Return a fallback message if the source text is not found
      return `Source text not available for reference [${refNumber}]. This citation exists in the document but the source text was not provided by the API.`
    }

    // Clean the text by removing special characters that interfere with matching
    const cleanText = (text: string) => {
      return text
        .replace(/\\b/g, '') // Remove all backspace characters
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    };

    // Extract only alphabetical characters for more robust matching
    const getAlphaOnly = (text: string) => {
      return text.replace(/[^a-zA-Z\s]/g, '').trim().toLowerCase();
    };

    // Clean both the source text and the search terms
    const cleanedSourceText = cleanText(sourceText);
    const alphaSourceText = getAlphaOnly(cleanedSourceText);
    
    // Get cleaned and alpha-only versions of search terms
    const cleanedStartWord = cleanText(start_word);
    const cleanedEndWord = cleanText(end_word);
    const alphaStartWord = getAlphaOnly(cleanedStartWord);
    const alphaEndWord = getAlphaOnly(cleanedEndWord);
    
    console.log(`Searching for extract between "${alphaStartWord}" and "${alphaEndWord}" in reference [${refNumber}]`);
    
    // Look for match of alpha-only start_word
    const startPos = alphaSourceText.indexOf(alphaStartWord);
    
    if (startPos === -1) {
      console.error(`Could not find start_word "${alphaStartWord}" in reference [${refNumber}]`);
      // Return the full text with a note
      return {
        fullText: sourceText,
        highlightedRange: null,
        isError: true,
        errorMessage: `Could not locate the extract starting with "${start_word}" in reference [${refNumber}].`
      };
    }
    
    // Get the actual position in the original cleaned source text
    // We need to count the characters until our match position to find the real position
    const originalStartPos = findOriginalPosition(cleanedSourceText, alphaSourceText, startPos);
    
    // Search for end_word after the start_word position
    const remainingAlphaText = alphaSourceText.substring(startPos + alphaStartWord.length);
    const endPosInRemaining = remainingAlphaText.indexOf(alphaEndWord);
    
    if (endPosInRemaining === -1) {
      console.error(`Found start_word but could not find end_word "${alphaEndWord}" in reference [${refNumber}]`);
      // Return the full text but highlight from the start word to a reasonable point
      const excerptLength = 400; // A reasonable excerpt length
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
    
    // Calculate full end position in alpha text
    const endPos = startPos + alphaStartWord.length + endPosInRemaining;
    
    // Get the actual position in the original cleaned source text
    const originalEndPos = findOriginalPosition(cleanedSourceText, alphaSourceText, endPos) + alphaEndWord.length;
    
    // Helper function to find the position in the original text based on the alpha-only text position
    function findOriginalPosition(originalText: string, alphaText: string, alphaPosition: number) {
      // Count characters until we reach the alpha position
      let alphaCharCount = 0;
      let originalPos = 0;
      
      while (alphaCharCount < alphaPosition && originalPos < originalText.length) {
        // If the current character would be included in the alpha text, count it
        if (/[a-zA-Z\s]/.test(originalText[originalPos])) {
          alphaCharCount++;
        }
        originalPos++;
      }
      
      return originalPos;
    }
    
    // Return the full page text with information about the highlighted range
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
    console.log(`Reference clicked: ${refNumber}, Occurrence: ${occurrenceIndex}`)
    
    // Get the text for this reference and occurrence
    const result = extractReferenceText(refNumber, occurrenceIndex)
    
    if (!result) {
      console.error(`Could not find text for reference ${refNumber}, occurrence ${occurrenceIndex}`)
      // Provide a fallback text when extract is not found
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
      // Handle simple string result
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
      // Result is an object with more detailed information
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
  }, [extractReferenceText])

  const askFollowupQuestion = async () => {
    if (!followupQuestion.trim() || isAskingFollowup) return
    
    setIsAskingFollowup(true)
    setFollowupError(null)
    
    try {
      // Add user question to chat history
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
          title: "string",
          guidelines_index: parseInt(guidelineId),
          question: followupQuestion
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to get answer: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Update the last message in chat history with the answer
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
      
      // Clear the input field
      setFollowupQuestion('')
    } catch (err: any) {
      console.error('Error asking followup question:', err)
      setFollowupError(err.message || 'Failed to get answer')
      
      // Remove the last message if there was an error
      setChatHistory(prev => prev.slice(0, -1))
    } finally {
      setIsAskingFollowup(false)
    }
  }

  const processMarkdown = (markdown: string) => {
    if (!markdown) return ''
    
    // Clear any previous reference occurrences
    referenceOccurrences.current.clear()
    
    // Replace markdown code fences with plain text
    // This removes the triple backticks that surround markdown code blocks
    let processedText = markdown.replace(/```markdown|```/g, '')
    
    // Replace reference numbers with clickable spans
    processedText = processedText.replace(/\[(\d+)\]/g, (match, number) => {
      // Track occurrence of this reference number
      const occurrenceIndex = referenceOccurrences.current.get(number) || 0
      referenceOccurrences.current.set(number, occurrenceIndex + 1)
      
      // Return a special token that will be replaced with a clickable span
      return `__REF_${number}_${occurrenceIndex}__`
    })
    
    return processedText
  }

  const addReferenceClickHandlers = () => {
    const contentElement = document.getElementById('markdown-content')
    if (!contentElement) return
    
    // Find all spans that contain reference numbers
    const referenceSpans = contentElement.querySelectorAll('span.reference-number')
    
    // Add click handlers to each reference span
    referenceSpans.forEach(span => {
      // Extract reference number and occurrence index from the data attributes
      const refNumber = span.getAttribute('data-ref-number')
      const occurrenceIndex = span.getAttribute('data-occurrence-index')
      
      if (refNumber && occurrenceIndex) {
        span.addEventListener('click', () => handleReferenceClick(refNumber, parseInt(occurrenceIndex)))
      }
    })
  }

  useEffect(() => {
    // After the component renders and markdown is processed, add click handlers
    addReferenceClickHandlers()
    
    // Re-apply after any update to the markdown content
    return () => {
      // Cleanup if needed
      const contentElement = document.getElementById('markdown-content')
      if (contentElement) {
        const referenceSpans = contentElement.querySelectorAll('span.reference-number')
        referenceSpans.forEach(span => {
          span.replaceWith(span.cloneNode(true))
        })
      }
    }
  }, [processedMarkdown, handleReferenceClick])

  const MarkdownWithReferences = ({ content }: { content: string }) => {
    // Process content to ensure citation references stay inline with text
    // Handle paragraph breaks properly while keeping citations on the same line
    const processedContent = content
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Ensure there's a space before reference tokens
      .replace(/__REF_(\d+)_(\d+)__/g, ' __REF_$1_$2__');
      
    // Split by double newlines to get paragraphs
    const paragraphs = processedContent.split('\n\n');
    
    return (
      <div id="markdown-content">
        {paragraphs.map((paragraph, paragraphIndex) => {
          // Check if this paragraph is a heading
          const isHeading = paragraph.match(/^#+\s/);
          
          // Split each paragraph by reference tokens
          const parts = paragraph.split(/__REF_(\d+)_(\d+)__/g);
          
          // Determine proper class for this block based on content
          const blockClassName = isHeading 
            ? `heading-${paragraph.match(/^(#+)\s/)?.[1].length || 1}` 
            : 'markdown-paragraph';
          
          return (
            <div key={paragraphIndex} className={blockClassName}>
              {parts.map((part, index) => {
                if (index % 3 === 0) {
                  // Regular text part - render as markdown
                  return <ReactMarkdown key={`text-${index}`} remarkPlugins={[remarkGfm]}>{part}</ReactMarkdown>;
                } else if (index % 3 === 1) {
                  // Reference number
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
                      [{refNumber}]
                    </span>
                  );
                }
                return null; // Skip the occurrence index parts
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Format reference content with highlighted text
  const formatReferenceContent = () => {
    if (!activeReference || !activeReference.fullText) return null
    
    let formattedContent
    
    if (activeReference.highlightedRange) {
      const { fullText, highlightedRange } = activeReference
      const { start, end } = highlightedRange
      
      // Split the text into before, highlighted, and after sections
      const beforeHighlight = fullText.substring(0, start)
      const highlightedText = fullText.substring(start, end)
      const afterHighlight = fullText.substring(end)
      
      formattedContent = (
        <>
          {beforeHighlight && <span>{beforeHighlight}</span>}
          {highlightedText && <span className="reference-highlight">{highlightedText}</span>}
          {afterHighlight && <span>{afterHighlight}</span>}
        </>
      )
    } else {
      formattedContent = <span>{activeReference.fullText}</span>
    }
    
    return (
      <div className="reference-content">
        {activeReference.isError && activeReference.errorMessage && (
          <div className="reference-note mb-4">
            <p>{activeReference.errorMessage}</p>
          </div>
        )}
        
        {activeReference.highlightedRange && !activeReference.isError && (
          <div className="reference-highlight-note mb-4">
            <p><em>Note: The matching reference excerpt is highlighted in blue.</em></p>
          </div>
        )}
        
        <pre className="full-reference whitespace-pre-wrap">
          {formattedContent}
        </pre>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        <div className="mb-4 flex items-center">
          <Link href="/guidelines" className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span>Back to Guidelines</span>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="flex h-[calc(100vh-200px)] bg-gray-50">
            {/* Left Panel - Summary and Q&A */}
            <div className={`bg-white border-r border-gray-200 flex flex-col overflow-hidden ${sidebarCollapsed ? 'w-[calc(100%-40px)]' : 'w-1/2'} transition-width duration-300`}>
              <div className="p-6 border-b border-gray-200 overflow-y-auto flex-grow">
                <div className="mb-4">
                  <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                    {summary?.title || 'Guideline Summary'}
                  </h1>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span>ID: {guidelineId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-600"></div>
                  <span className="text-lg font-medium text-gray-800">Summary</span>
                </div>

                <div className="space-y-4">
                  {chatHistory.map((message, index) => (
                    <div key={index} className={`mb-4 ${index > 0 ? 'mt-8 border-t pt-6' : ''}`}>
                      {message.question && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-500 mb-2">Your question:</p>
                          <div className="bg-blue-50 p-3">
                            <p className="text-sm text-gray-800">{message.question}</p>
                          </div>
                        </div>
                      )}
                      
                      {message.answer && (
                        <div>
                          <p className="text-sm font-medium text-gray-500 mb-2">
                            {message.type === 'main' ? 'Summary:' : 'Answer:'}
                          </p>
                          <div className="prose prose-sm max-w-none text-gray-700">
                            <MarkdownWithReferences content={processMarkdown(message.answer)} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {followupError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-4">
                      {followupError}
                    </div>
                  )}
                </div>
              </div>

              {/* Search bar / Question input */}
              <div className="p-4 border-t border-gray-200 mt-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={questionInputRef}
                    type="text"
                    placeholder="Ask a question about this guideline..."
                    className="w-full pl-10 pr-12 py-3 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={followupQuestion}
                    onChange={(e) => setFollowupQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        askFollowupQuestion()
                      }
                    }}
                    disabled={isAskingFollowup}
                  />
                  <button 
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 bg-blue-600 hover:bg-blue-700 text-white ${isAskingFollowup ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={askFollowupQuestion}
                    disabled={isAskingFollowup}
                  >
                    {isAskingFollowup ? (
                      <div className="h-4 w-4 border-t-2 border-b-2 border-white animate-spin"></div>
                    ) : (
                      <Search className="h-4 w-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel - Citation Reference */}
            <div className={`${sidebarCollapsed ? 'w-10' : 'w-1/2'} bg-white flex flex-col transition-width duration-300`}>
              {/* Toggle button bar */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                {!sidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-800">Citation Reference</span>
                  </div>
                )}
                <button 
                  onClick={toggleSidebar} 
                  className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronLeft className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              </div>

              {!sidebarCollapsed && (
                <>
                  {activeReference ? (
                    <>
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-100 rounded">
                            <span className="text-sm text-blue-600">Reference [{activeReference.number}]</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto">
                        {formatReferenceContent()}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col justify-center items-center h-full text-gray-500 p-6">
                      <ExternalLink className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-center">Click on a citation number [1] in the summary to view the reference details.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
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
          background-color: #e7f5ff;
          border-left: 4px solid #74c0fc;
          padding: 1rem;
          color: #495057;
          font-size: 0.875rem;
          font-style: italic;
          margin: 1rem 0;
          border-radius: 0.25rem;
        }

        .full-reference {
          font-family: monospace;
          line-height: 1.5;
          padding: 1rem;
          background-color: #f8f9fa;
          overflow-x: auto;
        }

        .reference-highlight {
          background-color: #e7f5ff;
          border: 1px dashed #74c0fc;
          display: inline;
        }

        .reference-content strong {
          background-color: #e7f5ff;
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-weight: 600;
          color: #1971c2;
        }

        .reference-number {
          text-decoration: none;
          color: #1c7ed6;
          display: inline !important;
          cursor: pointer;
          font-weight: medium;
          font-size: 0.875rem;
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
        
        .transition-width {
          transition-property: width;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </DashboardLayout>
  )
} 