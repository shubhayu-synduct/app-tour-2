"use client"

import { useState, useEffect, useRef } from 'react';
import { Search, ArrowUpRight, ArrowLeftRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import Image from 'next/image';

interface Drug {
  brand_name: string;
  inn: string[];
  active_substance: string[];
  first_letter: string;
  pdf_url: string;
  search_type: string;
}

export default function DrugInformationPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [recommendations, setRecommendations] = useState<Drug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedLetter, setSelectedLetter] = useState('A');
  
  const alphabetBarRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollAmount = 5 * 28;

  const updateScrollButtons = () => {
    if (alphabetBarRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = alphabetBarRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    if (alphabetBarRef.current) {
      alphabetBarRef.current.addEventListener('scroll', updateScrollButtons);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (alphabetBarRef.current) {
        alphabetBarRef.current.removeEventListener('scroll', updateScrollButtons);
      }
    };
  }, []);

  const scrollAlphabetBar = (direction: 'left' | 'right') => {
    if (alphabetBarRef.current) {
      const { scrollLeft } = alphabetBarRef.current;
      alphabetBarRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };
  
  // Fetch drugs when selected letter changes
  useEffect(() => {
    const fetchDrugs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://drugsumary.drinfo.ai/api/library/drugs?letter=${selectedLetter}&offset=0`);
        const data = await response.json();
        setDrugs(data.drugs);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching drugs:', error);
        setIsLoading(false);
      }
    };
    
    fetchDrugs();
  }, [selectedLetter]);
  
  // Fetch recommendations function
  const fetchRecommendations = async (term: string) => {
    console.log('fetchRecommendations called with:', term);
    if (term.trim() === '') {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    setShowRecommendations(true);
    try {
      const response = await fetch(`https://drugsumary.drinfo.ai/api/enhanced-search?q=${encodeURIComponent(term)}&limit=10`);
      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);
      
      let transformedData = [];
      
      // Handle direct brand match
      if (data.direct_match) {
        transformedData.push({
          brand_name: data.direct_match.name,
          active_substance: data.direct_match.active_substance,
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
      console.log('Recommendations set:', transformedData);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  // Fetch recommendations when search term changes (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchTerm.trim() === '') {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchRecommendations(searchTerm);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

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

  // Function to convert drug name to URL-friendly format
  const slugify = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/\//g, '-')
      .replace(/[^\w-]+/g, '');
  };
  
  // Handle clicking outside the recommendations to close them
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
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

  const DrugInformationContent = () => {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 mt-16 md:mt-16 mt-20 relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-[52px] font-semibold text-[#214498] mb-4 font-['DM_Sans']">Drug Information</h1>
          <p className="text-gray-600 text-base md:text-lg">European Medicines Agency approved drug information</p>
        </div>
        
        <div className="relative mb-8" ref={searchContainerRef}>
          <div className="flex items-center border-[2.7px] border-[#3771FE]/[0.27] rounded-lg h-[69px] w-full max-w-[1118px] mx-auto pr-4 bg-white">
            <div className="pl-4 flex items-center">
              <Search className="text-[#9599A8] stroke-[1.5]" size={20} fill="none" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by a drug brand name or an active ingredient name or scroll the drug list..."
              className="w-full py-3 px-3 outline-none text-[#223258] font-['DM_Sans'] font-normal text-[16px] md:text-[18px] placeholder-[#9599A8] placeholder:font-['DM_Sans'] placeholder:text-[14px] md:placeholder:text-[16px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchTerm.trim() !== '') {
                  setShowRecommendations(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim() !== '') {
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
            <button 
              className="w-10 h-10 flex items-center justify-center hover:bg-blue-600 border-none bg-[#3771FE] rounded-[6px] relative ml-2"
              onClick={() => {
                if (searchTerm.trim() !== '') {
                  fetchRecommendations(searchTerm);
                }
              }}
            >
              <svg className="text-white" width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 24L24 8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <path d="M14 8H24V18" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
          {/* Recommendations dropdown */}
          {showRecommendations && recommendations.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-w-[1118px] mx-auto">
              {recommendations.map((drug, index) => (
                <Link 
                  key={index}
                  href={`/drug-information/${slugify(drug.brand_name)}`}
                  className="block px-4 py-3 hover:bg-blue-50 text-[#223258] font-['DM_Sans'] font-normal text-[16px] md:text-[18px] border-b border-gray-100 last:border-b-0"
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
                  {drug.search_type !== 'direct_brand' ? (
                    <>
                      <span className="font-semibold">{drug.active_substance.join(', ')}</span> <span className="text-gray-600">(<em>Brand Name:</em> <span className="font-semibold">{drug.brand_name}</span>)</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{drug.brand_name}</span> <span className="text-gray-600">(<em>active substances:</em> <span className="font-semibold">{drug.active_substance.join(', ')}</span>)</span>
                    </>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* Alphabet navigation bar */}
        <div className="flex justify-start w-full mb-8">
          <div className="w-full max-w-[1118px] mx-auto relative">
            {/* Left scroll button */}
            <button
              onClick={() => scrollAlphabetBar('left')}
              className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full shadow-sm md:hidden transition-opacity duration-200"
            >
              <ChevronLeft className="w-4 h-4 text-[#263969]" />
            </button>

            {/* Right scroll button */}
            <button
              onClick={() => scrollAlphabetBar('right')}
              className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full shadow-sm md:hidden transition-opacity duration-200"
            >
              <ChevronRight className="w-4 h-4 text-[#263969]" />
            </button>

            {/* Left fade indicator */}
            <div className="absolute left-0 top-0 h-full w-4 z-10 pointer-events-none md:hidden" 
                 style={{ 
                   background: 'linear-gradient(to right, rgba(249, 250, 251, 0.8), transparent)',
                   backdropFilter: 'blur(1px)'
                 }}></div>
            
            {/* Right fade indicator */}
            <div className="absolute right-0 top-0 h-full w-4 z-10 pointer-events-none md:hidden"
                 style={{ 
                   background: 'linear-gradient(to left, rgba(249, 250, 251, 0.8), transparent)',
                   backdropFilter: 'blur(1px)'
                 }}></div>
            
            <div
              ref={alphabetBarRef}
              className="flex overflow-x-auto scrollbar-hide px-6 md:px-0"
              style={{ 
                WebkitOverflowScrolling: 'touch', 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none', 
                scrollBehavior: 'smooth',
                minWidth: 0
              }}
            >
              <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => (
                <button
                  key={letter}
                  className={`flex-shrink-0 min-w-[32px] px-2 py-2 mx-1 text-[16px] md:text-[20px] font-['DM_Sans'] font-medium transition-colors duration-200 focus:outline-none border-none bg-transparent ${
                    selectedLetter === letter 
                      ? 'text-[#263969]' 
                      : 'text-[#878787] hover:text-[#263969]'
                  }`}
                  onClick={() => setSelectedLetter(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Drug table */}
        <div className="w-full max-w-[1118px] mx-auto rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[65%]" />
                <col className="w-[35%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E1E7F0]">
                  <th className="text-left px-4 md:px-6 py-4 font-semibold text-[#263969] text-[16px] md:text-[20px] font-['DM_Sans']">
                    Brand Name
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 font-semibold text-[#263969] text-[16px] md:text-[20px] font-['DM_Sans']">
                    Active Substance(s)
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="text-center py-12">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#214498]"></div>
                        <span className="ml-3 text-[#263969] font-['DM_Sans']">Loading drugs...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {drugs.map((drug, index) => {
                      const sortedActiveSubstances = drug.active_substance ? [...drug.active_substance].sort((a, b) => a.localeCompare(b)) : [];
                      return (
                        <tr key={index} className="border-b border-[#E1E7F0] hover:bg-[#E8EDF7] transition-colors">
                          <td className="px-4 md:px-6 py-4">
                            <Link 
                              href={`/drug-information/${slugify(drug.brand_name)}`} 
                              className="text-[#263969] font-['DM_Sans'] font-normal text-[14px] md:text-[20px] hover:text-[#214498] hover:underline transition-colors"
                            >
                              {drug.brand_name}
                            </Link>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-[#263969] font-['DM_Sans'] font-normal text-[14px] md:text-[20px]">
                            {sortedActiveSubstances.length > 0 ? sortedActiveSubstances.join(', ') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {drugs.length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center py-8 text-[#263969] font-['DM_Sans']">
                          No drugs found for letter "{selectedLetter}".
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="bg-[#F3F6FC] min-h-screen">
        {user && <DrugInformationContent />}
      </div>
    </DashboardLayout>
  );
} 