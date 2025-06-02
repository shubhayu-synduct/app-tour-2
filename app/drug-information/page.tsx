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

  const DrugInformationContent = () => (
    <div className="max-w-4xl mx-auto px-4 py-8 mt-16">
      <div className="text-center mb-4">
        <h1 className="text-3xl md:text-4xl lg:text-[52px] font-semibold text-[#214498] mb-2 font-['DM_Sans']">Drug Information</h1>
        <p className="text-gray-600 text-lg mt-6">European Medicines Agency approved drug information</p>
      </div>
      
      <div className="relative mb-8" ref={searchContainerRef}>
        <div className="flex items-center border-[2.7px] border-[#3771FE]/[0.27] rounded-lg h-[69px] w-full max-w-[1118px] mx-auto pr-4 rounded-xl bg-white mt-5">
          <div className="pl-2 flex items-center">
            <Search className="text-[#9599A8] stroke-[1.5]" size={20} fill="none" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by a drug brand name or an active ingredient name or scroll the drug list..."
            className="w-full py-3 px-2 outline-none text-[#223258] font-['DM_Sans'] font-normal text-[20px] placeholder-[#9599A8] placeholder:font-['DM_Sans'] placeholder:text-[16px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (searchTerm.trim() !== '') {
                setShowRecommendations(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchTerm.trim() !== '') {
                // Trigger search
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
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
            {recommendations.map((drug, index) => (
              <Link 
                key={index}
                href={`/drug-information/${slugify(drug.brand_name)}`}
                className="block px-4 py-2 hover:bg-blue-50 text-[#223258] font-['DM_Sans'] font-normal text-[20px]"
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
                {drug.search_type !== 'direct_brand' ? (
                  <>
                    <b>{drug.active_substance.join(', ')}</b> (<i>Brand Name:</i> <b>{drug.brand_name}</b>)
                  </>
                ) : (
                  <>
                    <b>{drug.brand_name}</b> (<i>active substances:</i> <b>{drug.active_substance.join(', ')}</b>)
                  </>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Alphabet bar moved below search bar, no borders, hide scrollbar */}
      <div className="flex justify-center w-full">
        <div className="flex items-center mb-6 pb-2 max-w-[1118px] w-full justify-center">
          <button
            className={`mr-1 p-0 bg-transparent border-none shadow-none hover:bg-transparent focus:outline-none transition-opacity`}
            onClick={() => scrollAlphabetBar('left')}
            aria-label="Scroll left"
            type="button"
            // disabled={!canScrollLeft}
          >
            <ChevronsLeft size={24} color="#214498" />
          </button>
          <div
            ref={alphabetBarRef}
            className="flex overflow-x-auto hide-scrollbar"
            style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth', minWidth: 0 }}
          >
            {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => (
              <button
                key={letter}
                className={`min-w-[28px] px-0.5 py-1 rounded-lg text-lg font-['DM_Sans'] transition-colors focus:outline-none font-semibold ${selectedLetter === letter ? 'bg-[#214498] text-white' : 'text-[#878787]'}`}
                style={{ background: selectedLetter === letter ? '#214498' : 'transparent', border: 'none' }}
                onClick={() => setSelectedLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
          <button
            className={`ml-1 p-0 bg-transparent border-none shadow-none hover:bg-transparent focus:outline-none transition-opacity`}
            onClick={() => scrollAlphabetBar('right')}
            aria-label="Scroll right"
            type="button"
            // disabled={!canScrollRight} 
          >
            <ChevronsRight size={24} color="#214498" />
          </button>
        </div>
      </div>
      
      <div
        className="overflow-x-scroll w-full max-w-[1118px] mx-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="min-w-full table-fixed">
          <colgroup>
            <col style={{ width: '90%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-[#223258] text-lg">Brand Name</th>
              <th className="text-left px-4 py-2 font-semibold text-[#223258] text-lg">Active Substance(s)</th>
            </tr>
          </thead>
          <tbody style={{ minHeight: '300px' }}>
            {isLoading ? (
              <tr>
                <td colSpan={2} className="text-center py-12">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {drugs.map((drug, index) => {
                  const sortedActiveSubstances = drug.active_substance ? [...drug.active_substance].sort((a, b) => a.localeCompare(b)) : [];
                  return (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <Link 
                          href={`/drug-information/${slugify(drug.brand_name)}`} 
                          className="text-[#223258] font-['DM_Sans'] font-normal text-[20px] hover:text-blue-900"
                        >
                          {drug.brand_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[#223258] font-['DM_Sans'] text-[20px]">
                        {sortedActiveSubstances.length > 0 ? sortedActiveSubstances.join(', ') : '-'}
                      </td>
                    </tr>
                  );
                })}
                {drugs.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-6 text-gray-500">
                      No drugs found for this letter.
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      {user && <DrugInformationContent />}
    </DashboardLayout>
  );
} 