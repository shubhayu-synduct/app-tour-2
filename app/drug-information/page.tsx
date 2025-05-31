"use client"

import { useState, useEffect, useRef } from 'react';
import { Search, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import Image from 'next/image';

interface Drug {
  name: string;
  match_score?: number;
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
  
  // Fetch all drugs on component mount
  useEffect(() => {
    const fetchDrugs = async () => {
      try {
        const response = await fetch('https://ai-drug-summary.duckdns.org/drug-summary/drugs');
        const data = await response.json();
        setDrugs(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching drugs:', error);
        setIsLoading(false);
      }
    };
    
    fetchDrugs();
  }, []);
  
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
      const response = await fetch(`https://ai-drug-summary.duckdns.org/drug-summary/search?q=${encodeURIComponent(term)}&limit=10`);
      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);
      setRecommendations(data);
      console.log('Recommendations set:', data);
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

  // Filter drugs by selected letter
  const filteredDrugs = drugs.filter(drug => drug.name && drug.name[0].toUpperCase() === selectedLetter);

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
                href={`/drug-information/${slugify(drug.name)}`}
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
                {drug.name}
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Alphabet bar moved below search bar, no borders, hide scrollbar */}
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 hide-scrollbar" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => (
          <button
            key={letter}
            className={`min-w-[36px] px-3 py-1 rounded-lg text-lg font-['DM_Sans'] transition-colors focus:outline-none font-semibold ${selectedLetter === letter ? 'bg-[#214498] text-white' : 'text-[#878787]'}`}
            style={{ background: selectedLetter === letter ? '#214498' : 'transparent', border: 'none' }}
            onClick={() => setSelectedLetter(letter)}
          >
            {letter}
          </button>
        ))}
      </div>
      
      {/* Drug list */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {filteredDrugs.map((drug, index) => (
              <div key={index} className="border-b border-gray-200 py-3">
                <Link 
                  href={`/drug-information/${slugify(drug.name)}`} 
                  className="text-[#223258] font-['DM_Sans'] font-normal text-[20px] hover:text-blue-900"
                >
                  {drug.name}
                </Link>
              </div>
            ))}
            {filteredDrugs.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No drugs found for this letter.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      {user && <DrugInformationContent />}
    </DashboardLayout>
  );
} 