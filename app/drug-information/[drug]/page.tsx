"use client"

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronDown, FileText, ExternalLink, Search } from 'lucide-react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react';

interface DrugData {
  name: string;
  markdown_content: string;
  pdf_url: string | null;
}

interface Drug {
  name: string;
  match_score?: number;
}

export default function DrugDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drug, setDrug] = useState<DrugData | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [initialSearchTerm, setInitialSearchTerm] = useState(''); // Track the initial search term
  const [recommendations, setRecommendations] = useState<Drug[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Function to convert slug back to drug name for API call
  const unslugify = (slug: string) => {
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  };
  
  // Function to convert drug name to URL-friendly format
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/\//g, '-')
      .replace(/[^\w-]+/g, '');
  };
  
  const drugSlug = params.drug as string;
  const drugName = drugSlug ? unslugify(drugSlug) : '';
  
  // Function to toggle accordion sections
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Process markdown content to extract sections and create accordion structure
  const processMarkdownContent = (content: string) => {
    // Split the markdown content into sections using regex
    const sections = [];
    
    // Define regex to match section headers (## 4.1, ## 4.2, etc.) without using 's' flag
    const sectionRegex = /##\s+(\d+\.\d+\s+.*?)(?=(?:\n##\s+\d+\.\d+)|$)/g;
    
    // Replace all newlines with a special marker to simulate dot-all behavior
    const processedContent = content.replace(/\n/g, "<<NEWLINE>>");
    const processedRegex = /##\s+(\d+\.\d+\s+.*?)(?=(?:<<NEWLINE>>##\s+\d+\.\d+)|$)/g;
    
    let match;
    while ((match = processedRegex.exec(processedContent)) !== null) {
      const fullSection = match[0].replace(/<<NEWLINE>>/g, "\n");
      const sectionTitle = fullSection.split('\n')[0].replace('##', '').trim();
      
      // Extract section number and descriptive title
      const sectionNumber = sectionTitle.split(' ')[0];
      // Get the title without the section number (skip the number and any whitespace after it)
      const descriptiveTitle = sectionTitle.replace(/^\d+\.\d+\s+/, '');
      
      const sectionContent = fullSection.split('\n').slice(1).join('\n').trim();
      
      sections.push({
        id: sectionNumber.replace(/\./g, '_'),
        number: sectionNumber,
        title: descriptiveTitle,
        content: sectionContent
      });
    }
    
    return sections;
  };
  
  // Fetch drug data when drugSlug changes
  useEffect(() => {
    // Reset loading state when drug param changes
    setLoading(true);
    setError(null);
    
    const fetchDrugData = async () => {
      try {
        const response = await fetch(`https://ai-drug-summary.duckdns.org/drug-summary/drugs/${drugSlug}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch drug information');
        }
        
        const data = await response.json();
        // Pre-process the markdown content
        if (data.markdown_content) {
          // Replace <br> tags with spaces
          data.markdown_content = data.markdown_content.replace(/<br\s*\/?>/gi, ' ');
          
          // Replace LaTeX-style math expressions with appropriate symbols
          data.markdown_content = data.markdown_content.replace(/\$\\geq\$/g, '≥');
          data.markdown_content = data.markdown_content.replace(/\$\\tgeq\$/g, '≥');
          data.markdown_content = data.markdown_content.replace(/\$\\leq\$/g, '≤');
          data.markdown_content = data.markdown_content.replace(/\$\\tleq\$/g, '≤');
          data.markdown_content = data.markdown_content.replace(/\$\\times\$/g, '×');
          data.markdown_content = data.markdown_content.replace(/\$\\pm\$/g, '±');
        }
        setDrug(data);
        // Initialize search term with drug name and store it as the initial term
        setSearchTerm(data.name);
        setInitialSearchTerm(data.name);
      } catch (error) {
        console.error('Error fetching drug data:', error);
        setError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    if (drugSlug) {
      fetchDrugData();
    }
  }, [drugSlug]);
  
  // Fetch recommendations when search term changes
  useEffect(() => {
    // Don't show recommendations if the search term is empty or matches the initial one
    if (searchTerm.trim() === '' || searchTerm === initialSearchTerm) {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    
    // Only show recommendations if the search term has changed from initial value
    setShowRecommendations(true);
    
    // Debounce the API call to avoid making too many requests
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://ai-drug-summary.duckdns.org/drug-summary/search?q=${encodeURIComponent(searchTerm)}&limit=10`);
        const data = await response.json();
        setRecommendations(data);
        // Ensure focus stays in the input after recommendations update
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }
    }, 300); // 300ms debounce
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, initialSearchTerm]);
  
  // Keep focus on search input after every keystroke
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchTerm]);
  
  // Also maintain focus when recommendations state changes
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [recommendations, showRecommendations]);
  
  // Handle clicking outside the recommendations to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowRecommendations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const DrugDetailContent = () => {
    if (loading) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
          <div className="animate-pulse flex flex-col w-full">
            <div className="h-10 bg-gray-200 rounded w-3/4 mb-6"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-10"></div>
            
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="mb-8">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    if (error || !drug) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/drug-information" className="inline-flex items-center text-blue-600 hover:text-blue-800">
              <ChevronLeft size={20} />
              <span>Back to Drug List</span>
            </Link>
          </div>
          
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto mb-4 text-red-500" />
            <h1 className="text-2xl font-bold mb-2">Drug Not Found</h1>
            <p className="text-gray-600">{error || "The requested drug information could not be found."}</p>
          </div>
        </div>
      );
    }

    // Process markdown to extract sections
    const sections = processMarkdownContent(drug.markdown_content);

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/drug-information" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ChevronLeft size={20} />
            <span>Back to Drug List</span>
          </Link>
        </div>
        
        {/* Search bar with autocomplete */}
        <div className="relative mb-8" ref={searchContainerRef}>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <div className="pl-4 pr-2">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by drug name"
              className="w-full py-3 px-2 outline-none text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                // Only show recommendations if the search term is different from initial
                if (searchTerm.trim() !== '' && searchTerm !== initialSearchTerm) {
                  setShowRecommendations(true);
                }
              }}
              // Prevent blur when clicking on recommendations
              onBlur={(e) => {
                // Delay the blur to check if click was on a recommendation
                setTimeout(() => {
                  if (searchContainerRef.current && !searchContainerRef.current.contains(document.activeElement)) {
                    setShowRecommendations(false);
                  } else {
                    // Refocus the input if we're still within the search container
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }
                }, 100);
              }}
            />
            {searchTerm && (
              <button 
                className="bg-blue-600 hover:bg-blue-700 p-3 text-white"
                onClick={() => {
                  setSearchTerm('');
                  // Show recommendations when clearing search
                  setShowRecommendations(true);
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-45">
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
              </button>
            )}
          </div>
          
          {/* Recommendations dropdown */}
          {showRecommendations && recommendations.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
              {recommendations.map((rec, index) => (
                <Link 
                  key={index}
                  href={`/drug-information/${slugify(rec.name)}`}
                  className="block px-4 py-2 hover:bg-blue-50 text-gray-700"
                  onClick={() => {
                    setShowRecommendations(false);
                    // Refocus the input before navigation
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }}
                  onMouseDown={(e) => {
                    // Prevent blur event from firing on the input
                    e.preventDefault();
                  }}
                >
                  {rec.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Document header */}
        <div className="flex items-start mb-8">
          <FileText className="text-blue-700 mt-1 mr-3" size={24} />
          <h2 className="text-lg text-blue-800 font-medium">
            Drug information from the European Medicines Agency approved Summary of Product Characteristics
          </h2>
        </div>
        
        {/* Accordion sections */}
        <div className="space-y-3 mb-8">
          {sections.map((section) => (
            <div 
              key={section.id}
              className="border border-gray-200 rounded-lg overflow-hidden"
              data-section-number={section.number}
            >
              <button
                className="w-full flex justify-between items-center p-4 text-left focus:outline-none"
                onClick={() => toggleSection(section.id)}
              >
                <span className="font-medium">{section.title}</span>
                <ChevronDown 
                  className={`transition-transform ${openSections[section.id] ? 'transform rotate-180' : ''}`} 
                  size={20} 
                />
              </button>
              
              {/* Collapsible content */}
              {openSections[section.id] && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="prose max-w-none text-gray-700">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({node, ...props}) => (
                          <div className="overflow-auto my-4">
                            <table className="min-w-full divide-y divide-gray-300 border border-gray-300" {...props} />
                          </div>
                        ),
                        thead: ({node, ...props}) => (
                          <thead className="bg-gray-100" {...props} />
                        ),
                        th: ({node, ...props}) => (
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900" {...props} />
                        ),
                        td: ({node, children, ...props}) => {
                          // Process the content to replace <br/> tags with actual line breaks in table cells
                          if (typeof children === 'string') {
                            // Split the text by <br/> or <br> tags and reconstruct with proper breaks
                            const parts = children.split(/<br\s*\/?>/gi);
                            if (parts.length > 1) {
                              return (
                                <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200" {...props}>
                                  {parts.map((part, index) => (
                                    <React.Fragment key={index}>
                                      {part}
                                      {index < parts.length - 1 && <br />}
                                    </React.Fragment>
                                  ))}
                                </td>
                              );
                            }
                          }
                          return <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200" {...props}>{children}</td>;
                        },
                        tr: ({node, ...props}) => (
                          <tr className="even:bg-gray-50" {...props} />
                        ),
                        ul: ({node, ...props}) => (
                          <ul className="list-disc pl-5 space-y-1 mb-4" {...props} />
                        ),
                        ol: ({node, ...props}) => (
                          <ol className="list-decimal pl-5 space-y-1 mb-4" {...props} />
                        ),
                        li: ({node, ...props}) => (
                          <li className="mb-1" {...props} />
                        ),
                        p: ({node, children, ...props}) => {
                          // Process the content to replace <br/> tags with actual line breaks
                          if (typeof children === 'string') {
                            // Split the text by <br/> or <br> tags and reconstruct with proper breaks
                            const parts = children.split(/<br\s*\/?>/gi);
                            if (parts.length > 1) {
                              return (
                                <p className="mb-4" {...props}>
                                  {parts.map((part, index) => (
                                    <React.Fragment key={index}>
                                      {part}
                                      {index < parts.length - 1 && <br />}
                                    </React.Fragment>
                                  ))}
                                </p>
                              );
                            }
                          }
                          return <p className="mb-4" {...props}>{children}</p>;
                        },
                        h1: ({node, ...props}) => (
                          <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />
                        ),
                        h2: ({node, ...props}) => (
                          <h2 className="text-xl font-bold mb-3 mt-5" {...props} />
                        ),
                        h3: ({node, ...props}) => (
                          <h3 className="text-lg font-bold mb-2 mt-4" {...props} />
                        ),
                        h4: ({node, ...props}) => (
                          <h4 className="text-base font-bold mb-2 mt-4" {...props} />
                        )
                      }}
                    >
                      {section.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Links section */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <ExternalLink className="text-blue-700 mr-3" size={20} />
            <h3 className="text-lg text-blue-800 font-medium">Links</h3>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            {drug.pdf_url ? (
              <a 
                href={drug.pdf_url} 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline block mb-4"
              >
                EMA Document PDF: {drug.name}
              </a>
            ) : (
              <p className="text-gray-600">No PDF document available</p>
            )}
            
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-2">
                <span className="text-xs text-blue-800 font-bold">EMA</span>
              </div>
              <span className="text-gray-700">European Medicines Agency</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600 italic">
          <p>Disclaimer: The information provided is for educational purposes only and should not replace professional medical advice. Always consult a healthcare professional before taking any medication.</p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      {user && <DrugDetailContent />}
    </DashboardLayout>
  );
} 