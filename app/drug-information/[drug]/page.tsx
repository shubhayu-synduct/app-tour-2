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
import Image from 'next/image';
import DrugsLinksIcon from '@/components/ui/DrugsLinksIcon';
import { logger } from '@/lib/logger';

interface DrugData {
  name: string;
  markdown_content: string;
  pdf_url: string | null;
}

interface Drug {
  brand_name: string;
  active_substance: string[];
  inn: string[];
  search_type: string;
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
  
  // Function to capitalize first letter
  const capitalizeFirstLetter = (text: string) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
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
        // Clean the drug name by removing anything in brackets and handling hyphens
        const cleanDrugSlug = drugSlug
          .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses
          .replace(/-previously-.*$/, '') // Remove "-previously-anything" from the end
          .replace(/-/g, ' '); // Replace remaining hyphens with spaces
        
        const { getDrugInfo } = await import('@/lib/authenticated-api');
        const data = await getDrugInfo(cleanDrugSlug);
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
        // Initialize search term with drug name
        setSearchTerm(data.name);
        setInitialSearchTerm(data.name);
        
        // Process markdown and set initial open sections
        const sections = processMarkdownContent(data.markdown_content);
        const initialOpenSections: Record<string, boolean> = {};
        // Open first two sections
        if (sections.length > 0) {
          initialOpenSections[sections[0].id] = true;
          if (sections.length > 1) {
            initialOpenSections[sections[1].id] = true;
          }
        }
        setOpenSections(initialOpenSections);
      } catch (error) {
        logger.error('Error fetching drug data:', error);
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
    if (searchTerm.trim() === '' || searchTerm === initialSearchTerm || searchTerm.trim().length < 2) {
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
        logger.debug('Searching for term:', searchTerm);
        const { enhancedSearchDrugs } = await import('@/lib/authenticated-api');
        const data = await enhancedSearchDrugs(searchTerm.trim(), 10);
        logger.debug('Response data:', data);
        
        let transformedData = [];
        
        // Handle direct brand match
        if (data.direct_match) {
          transformedData.push({
            brand_name: data.direct_match.name,
            active_substance: data.direct_match.active_substance, // Direct matches don't have active substances in the response
            inn: [],
            search_type: 'direct_brand'
          });
        }
        
        // Handle brand options
        if (data.brand_options && data.brand_options.length > 0) {
          const brandOptions = data.brand_options.map((drug: any) => ({
            brand_name: drug.brand_name,
            active_substance: drug.active_substance || [],
            inn: drug.inn || [],
            search_type: drug.search_type || 'brand_option'
          }));
          transformedData = [...transformedData, ...brandOptions];
        }
        
        setRecommendations(transformedData);
        // Ensure focus stays in the input after recommendations update
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      } catch (error) {
        logger.error('Error fetching recommendations:', error);
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
            <Link href="/drug-information" className="flex items-center justify-center bg-[#01257C] text-white w-8 h-8 rounded-[4px] font-['DM_Sans'] text-sm hover:bg-[#1a3780] transition-colors" style={{ width: 32, height: 32 }}>
              <ChevronLeft size={16} />
              <ChevronLeft size={16} className="-ml-3" />
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
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Fixed header section */}
        <div className="flex-none px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Link href="/drug-information" className="flex items-center justify-center bg-[#01257C] text-white w-8 h-8 rounded-[4px] font-['DM_Sans'] text-sm hover:bg-[#1a3780] transition-colors" style={{ width: 32, height: 32 }}>
                <ChevronLeft size={16} />
                <ChevronLeft size={16} className="-ml-3" />
              </Link>
            </div>
            
            {/* Search bar with autocomplete */}
            <div className="relative mb-4" ref={searchContainerRef}>
              <div className="flex items-center border-[2.7px] border-[#3771FE]/[0.27] rounded-lg h-[69px] w-full max-w-[1118px] mx-auto pr-4 rounded-xl bg-white">
                <div className="pl-2 flex items-center">
                  <Search className="text-[#9599A8] stroke-[1.5]" size={20} fill="none" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by a drug brand name or an active ingredient name or scroll the drug list.."
                  className="w-full py-3 px-2 outline-none text-[#223258] font-['DM_Sans'] text-[16px] placeholder:text-[#9599A8]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    if (searchTerm.trim() !== '' && searchTerm !== initialSearchTerm) {
                      setShowRecommendations(true);
                    }
                  }}
                  onBlur={(e) => {
                    setTimeout(() => {
                      if (searchContainerRef.current && !searchContainerRef.current.contains(document.activeElement)) {
                        setShowRecommendations(false);
                      } else {
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }
                    }, 100);
                  }}
                />
                {searchTerm && (
                  <button 
                    className="hover:bg-blue-700 p-1 text-white flex items-center justify-center"
                    onClick={() => {
                      setSearchTerm('');
                      setShowRecommendations(true);
                    }}
                  >
                    <Image src="/search.svg" alt="Search" width={32} height={32} />
                  </button>
                )}
              </div>
              
              {/* Recommendations dropdown */}
              {showRecommendations && recommendations.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                  {recommendations.map((rec, index) => (
                    <Link 
                      key={index}
                      href={`/drug-information/${slugify(rec.brand_name)}`}
                      className="block px-4 py-2 hover:bg-blue-50 text-[#223258] font-['DM_Sans'] text-[16px]"
                      onClick={() => {
                        setShowRecommendations(false);
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                      }}
                    >
                      {rec.search_type !== 'direct_brand' ? (
                        <>
                          <b>{rec.active_substance.join(', ')}</b> (<i>Brand Name:</i> <b>{rec.brand_name}</b>)
                        </>
                      ) : (
                        <>
                          <b>{rec.brand_name}</b> (<i>active substances:</i> <b>{rec.active_substance.join(', ')}</b>)
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content section */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Document header */}
            <div className="flex items-start mb-2">
              <Image src="/answer-icon.svg" alt="Answer Icon" width={24} height={24} className="mt-1 mr-3" />
              <h2 className="text-lg text-[#273561] font-['DM_Sans'] font-regular">
                Drug information from the European Medicines Agency approved Summary of Product Characteristics
              </h2>
            </div>
            
            {/* Accordion sections */}
            <div className="mb-8 p-2 rounded-2xl" style={{ background: '#E4ECFF' }}>
              {sections.map((section) => (
                <div 
                  key={section.id}
                  className="rounded-lg overflow-hidden mb-3"
                  data-section-number={section.number}
                >
                  <button
                    className="w-full flex justify-between items-center p-4 text-left focus:outline-none bg-white border rounded-[10px] font-['DM_Sans']"
                    style={{ borderColor: 'rgba(55, 113, 254, 0.5)' }}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span className="font-medium">{section.title}</span>
                    <ChevronDown 
                      className={`transition-transform ${openSections[section.id] ? 'transform rotate-180' : ''}`} 
                      size={20} 
                    />
                  </button>
                  {openSections[section.id] && (
                    <div className="p-4 bg-white border rounded-[10px]" style={{ borderColor: 'rgba(55, 113, 254, 0.5)' }}>
                      <div className="prose max-w-none text-gray-700 font-['DM_Sans']">
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
                              if (typeof children === 'string') {
                                const parts = children.split(/<br\s*\/?\>/gi);
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
                              if (typeof children === 'string') {
                                const parts = children.split(/<br\s*\/?\>/gi);
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
                <DrugsLinksIcon className="mr-3" />
                <h3 className="text-lg text-[#273561] font-['DM_Sans'] font-normal">Links</h3>
              </div>
              
              <div className="rounded-lg">
                <div className="border rounded-[10px] p-4" style={{ borderColor: 'rgba(55, 113, 254, 0.5)', borderWidth: '1px' }}>
                  {drug.pdf_url ? (
                    <a 
                      href={drug.pdf_url} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold font-['DM_Sans'] text-[#273561] hover:text-[#3771FE] block mb-4 text-lg underline"
                    >
                      EMA Document PDF: {drug.name}
                    </a>
                  ) : (
                    <p className="text-gray-600">No PDF document available</p>
                  )}
                  
                  <div className="flex items-center">
                    <div className="px-3 py-1 border rounded-[8px] flex items-center font-['DM_Sans']" style={{ borderColor: 'rgba(39, 53, 97, 0.5)', backgroundColor: '#EEF3FF' }}>
                      <img src="/logo_ema.svg" alt="EMA Logo" className="mr-2" style={{ height: '25px', width: 'auto', display: 'inline-block' }} />
                      <span className="text-[#273561] text-md">European Medicines Agency</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
