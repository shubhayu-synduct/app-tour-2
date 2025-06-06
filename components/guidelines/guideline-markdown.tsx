import ReactMarkdown from 'react-markdown';
import React, { useEffect, useState, useRef } from 'react';
import remarkGfm from "remark-gfm";

// Add type declaration for window.handleCitationClick
declare global {
  interface Window {
    handleCitationClick?: (citation: string, index?: number) => void;
  }
}

interface GuidelineMarkdownProps {
  content: string | null;
  sources: Record<string, string> | null;
  pageReferences?: Record<string, Array<{start_word: string, end_word: string}>> | null;
  onCitationClick?: (citation: string, index?: number) => void;
}

export const GuidelineMarkdown = ({ 
  content, 
  sources, 
  pageReferences,
  onCitationClick 
}: GuidelineMarkdownProps) => {
  const [citationCounts, setCitationCounts] = useState<Record<string, number>>({});
  const highlightRef = useRef<HTMLSpanElement>(null);
  
  // Track citation occurrences during rendering
  const formatTextWithCitations = (text: string) => {
    // Create a new citationCounts object that will be updated
    const newCitationCounts: Record<string, number> = {...citationCounts};
    
    return text.replace(/\[(\d+(?:,\s*\d+)*)\]/g, (match, nums) => {
      const numbers = nums.split(',').map((n: string) => n.trim());
      return numbers.map((num: string) => {
        if (!sources || !sources[num]) return num;
        
        // Increment the count for this citation
        if (!newCitationCounts[num]) {
          newCitationCounts[num] = 0;
        }
        newCitationCounts[num]++;
        
        // Index is the current count minus 1 (zero-based index)
        const index = newCitationCounts[num] - 1;
        
        return `<span 
          class="reference-number"
          data-ref-number="${num}"
          data-occurrence-index="${index}"
          onclick="window.handleCitationClick && window.handleCitationClick('${num}', ${index})"
          role="button"
          tabindex="0"
        >${num}</span>`;
      }).join(' ');
    });
  };

  useEffect(() => {
    // Reset citation counts whenever content changes
    setCitationCounts({});
    
    // Set up the global click handler
    window.handleCitationClick = (citation: string, index?: number) => {
      onCitationClick?.(citation, index);
    };
    
    return () => {
      delete window.handleCitationClick;
    };
  }, [content, onCitationClick]);

  if (!content) return null;

  return (
    <div id="markdown-content" className="guideline-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <table className="w-full border-collapse border border-gray-300">{children}</table>
          ),
          thead: ({ children }) => <thead className="bg-gray-200">{children}</thead>,
          tbody: ({ children }) => <tbody className="bg-white">{children}</tbody>,
          tr: ({ children }) => <tr className="border border-gray-300">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2 border border-gray-300 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-2 border border-gray-300">{children}</td>,
          h1: ({ children }) => <h1 className="heading-1">{children}</h1>,
          h2: ({ children }) => <h2 className="heading-2">{children}</h2>,
          h3: ({ children }) => <h3 className="heading-3">{children}</h3>,
          h4: ({ children }) => <h4 className="heading-4">{children}</h4>,
          h5: ({ children }) => <h5 className="heading-5">{children}</h5>,
          h6: ({ children }) => <h6 className="heading-6">{children}</h6>,
          p: ({ children }) => {
            if (!children) return null;
            const text = typeof children === 'string' 
              ? children 
              : Array.isArray(children) 
                ? children.map(child => (typeof child === 'string' ? child : "")).join("")
                : "";
            
            if (typeof text !== 'string') return <p className="markdown-paragraph">{children}</p>;
            
            const formattedContent = formatTextWithCitations(text);
            return <p className="markdown-paragraph" dangerouslySetInnerHTML={{ __html: formattedContent }} />;
          },
          li: ({ children }) => {
            if (Array.isArray(children)) {
              return (
                <li className="mb-2"> 
                  {children.map((child, index) => {
                    if (typeof child === "string") {
                      const formattedContent = formatTextWithCitations(child);
                      return <span key={index} dangerouslySetInnerHTML={{ __html: formattedContent }} />;
                    }
                    return <span key={index}>{child}</span>;
                  })}
                </li>
              );
            }

            const text = typeof children === "string" ? children : "";
            const formattedContent = formatTextWithCitations(text);
            return <li className="mb-2" dangerouslySetInnerHTML={{ __html: formattedContent }} />;
          },
          strong: ({ children }) => {
            const text = Array.isArray(children)
              ? children.map(child => (typeof child === "string" ? child : "")).join("")
              : children;

            if (typeof text !== "string") {
              return <strong>{children}</strong>;
            }

            const formattedContent = formatTextWithCitations(text);
            return <strong dangerouslySetInnerHTML={{ __html: formattedContent }} />;
          },
          ul: ({ children }) => <ul className="ml-4 pl-2 list-disc space-y-2 mb-4">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 pl-2 list-decimal space-y-2 mb-4">{children}</ol>,
          a: ({ node, ...props }) => <a {...props} onClick={(e) => e.preventDefault()} className="guideline-title-link" />,
        }}
      >
        {content}
      </ReactMarkdown>

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

        /* Set bullet color for markdown lists */
        #markdown-content ul > li::marker,
        #markdown-content ol > li::marker {
          color: #214498;
        }

        .guideline-title-link {
          color: #273561;
          cursor: pointer;
          transition: color 0.2s;
        }

        .guideline-title-link:hover {
          color: #3771FE !important;
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