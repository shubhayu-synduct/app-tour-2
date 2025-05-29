"use client"

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";

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
  
  // Fetch recommendations when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    
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

  const DrugInformationContent = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-blue-700 mb-2">Drug Information</h1>
        <p className="text-gray-600 text-lg">European Medicines Agency approved drug information</p>
      </div>
      
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
              if (searchTerm.trim() !== '') {
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
              onClick={() => setSearchTerm('')}
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
            {recommendations.map((drug, index) => (
              <Link 
                key={index}
                href={`/drug-information/${slugify(drug.name)}`}
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
                {drug.name}
              </Link>
            ))}
          </div>
        )}
      </div>
      
      {/* Drug list */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {drugs.map((drug, index) => (
              <div key={index} className="border-b border-gray-200 py-3">
                <Link 
                  href={`/drug-information/${slugify(drug.name)}`} 
                  className="text-blue-700 hover:text-blue-900"
                >
                  {drug.name}
                </Link>
              </div>
            ))}
            {drugs.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No drugs found. Please try again later.
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