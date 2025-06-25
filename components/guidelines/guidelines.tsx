"use client"

import { useState, useEffect } from 'react'
import { Search, BookOpen, ChevronRight, Loader2, ChevronDown, Bookmark, Star, ArrowUpRight } from 'lucide-react'
import GuidelineSummaryModal from './guideline-summary-modal'
import GuidelineSummaryMobileModal from './guideline-summary-mobile-modal'
import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

interface Guideline {
  id: number;
  title: string;
  description: string;
  category: string;
  last_updated: string;
  url?: string;
  publisher?: string;
  language?: string;
  pdf_saved?: boolean;
  society?: string;
  link?: string;
}

interface GuidelinesProps {
  initialGuidelines?: Guideline[];
}

export default function Guidelines({ initialGuidelines = [] }: GuidelinesProps) {
  const [guidelines, setGuidelines] = useState<Guideline[]>(initialGuidelines || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['National'])
  const [isMobile, setIsMobile] = useState(false)
  const [userCountry, setUserCountry] = useState<string>('')
  const { user } = useAuth()

  const categoryOrder = ['National', 'Europe', 'International', 'USA'];

  // Group guidelines by category
  const groupedGuidelines = guidelines.reduce((acc, guideline) => {
    const category = guideline.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(guideline);
    return acc;
  }, {} as Record<string, Guideline[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  useEffect(() => {
    const fetchUserCountry = async () => {
      if (user) {
        try {
          const db = getFirebaseFirestore();
          const userId = user.uid;
          const userDoc = await getDoc(doc(db, "users", userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const country = userData?.profile?.country;
            if (country) {
              setUserCountry(country);
            }
          }
        } catch (error) {
          console.error("Error fetching user country:", error);
        }
      }
    };

    fetchUserCountry();
  }, [user]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setGuidelines(initialGuidelines || [])
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/guidelines/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchTerm,
          country: userCountry || 'None' // Pass the user's country or default to 'International'
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Search failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('API response:', data);
      setGuidelines(Array.isArray(data) ? data : [])
      setRetryCount(0)
    } catch (err: any) {
      console.error('Error searching guidelines:', err)
      setError(err.message || 'Search failed. Please try again.')
      setGuidelines([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    handleSearch()
  }

  const handleGuidelineClick = (guideline: Guideline) => {
    setSelectedGuideline(guideline)
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedGuideline(null)
  }

  useEffect(() => {
    // Priority order for categories
    const priorityOrder = ['National', 'Europe', 'International', 'USA'];
    
    // Find the first category that has guidelines
    const firstCategoryWithGuidelines = priorityOrder.find(category => 
      guidelines.some(g => g.category === category)
    );

    if (firstCategoryWithGuidelines) {
      setExpandedCategories(prev => {
        // If the category is already expanded, return current state
        if (prev.includes(firstCategoryWithGuidelines)) {
          return prev;
        }
        // Otherwise, add the first category with guidelines
        return [...prev, firstCategoryWithGuidelines];
      });
    }
  }, [guidelines]);

  useEffect(() => {
    if (selectedGuideline) {
      console.log('Selected guideline:', selectedGuideline);
    }
  }, [selectedGuideline]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is the md breakpoint in Tailwind
    };

    // Initial check
    checkMobile();
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="container mx-auto px-6 sm:px-2 lg:px-0 py-4 sm:py-6 lg:py-8 mt-0 sm:mt-16 max-w-full sm:max-w-2xl md:max-w-4xl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8 text-center">
          <h1
            className="mb-2 px-2 hidden sm:block"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(24px, 5vw, 36px)',
              color: '#214498',
              lineHeight: 1.1
            }}
          >
            Guidelines
          </h1>
          <p
            className="px-4 hidden sm:block"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              color: '#596C99',
              lineHeight: 1.4
            }}
          >
            Direct access to National, European, US and International Guidelines
          </p>
        </div>
        
        <div className="relative mb-6 sm:mb-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search Clinical Guidelines . . ."
              className="w-full py-2 sm:py-3 px-4 sm:px-6 border text-gray-600 text-base sm:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ borderColor: 'rgba(55, 113, 254, 0.5)', fontSize: 'clamp(14px, 1.5vw, 16px)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
            <div className="absolute right-1.5 sm:right-2 md:right-2 top-1/2 transform -translate-y-1/2">
              <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-blue-500 p-1.5 sm:p-2 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 animate-spin" />
                ) : (
                  <ArrowUpRight size={20} className="sm:w-6 sm:h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div
            className="px-3 sm:px-4 py-2 sm:py-3 mb-4 sm:mb-6"
            style={{
              background: '#EEF3FF',
              border: '1px solid #A2BDFF',
              color: '#214498',
              fontFamily: 'DM Sans, sans-serif'
            }}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-full">
                {/* <p className="font-medium" style={{ color: '#214498' }}>Notice</p> */}
                <p className="text-sm sm:text-base text-center" style={{ color: '#214498' }}>
                  {error === "Failed to connect to guidelines API service"
                    ? "Our servers are experiencing high demand. Please try again in a moment."
                    : error}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3 sm:space-y-4 p-3 sm:p-4" style={{ background: '#EEF3FF' }}>
          {categoryOrder
            .map(category => (
              <div key={category} className="border px-0 pb-2 sm:pb-4 pt-1 sm:pt-2" style={{ borderColor: '#A2BDFF', borderWidth: 1, borderStyle: 'solid', background: '#fff' }}>
              <button
                onClick={() => toggleCategory(category)}
                  className="w-full px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between text-left"
                  style={{
                    background: '#fff'
                  }}
              >
                  <h2 
                    className="text-base sm:text-lg lg:text-xl text-gray-900"
                    style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#263969' }}
                  >
                    {category === 'Europe' ? 'European' : category} Guidelines
                  </h2>
                <ChevronDown 
                  className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform ${
                    expandedCategories.includes(category) ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              
              {expandedCategories.includes(category) && (
                <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
                    {(groupedGuidelines[category]?.filter(guideline => 
                        guideline.id && 
                        guideline.title && 
                        guideline.description && 
                        guideline.category && 
                        guideline.last_updated
                      ).length ?? 0) > 0 ? (
                      groupedGuidelines[category]
                        .filter(guideline => 
                          guideline.id && 
                          guideline.title && 
                          guideline.description && 
                          guideline.category && 
                          guideline.last_updated
                        )
                        .map((guideline) => (
                    <div key={guideline.id}>
                        <div className="p-2 sm:p-4 shadow-sm border" style={{ background: '#fff', borderColor: '#A2BDFF' }}>
                        <div className="space-y-2 sm:space-y-3">
                          {/* Title as a link */}
                          <a 
                            href={guideline.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                              className="block"
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                color: '#214498',
                                fontWeight: 500,
                                fontSize: 'clamp(14px, 1.5vw, 16px)',
                                background: 'none',
                                border: 'none',
                              }}
                          >
                            {guideline.title}
                          </a>
                          
                          {/* Year and Publisher badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Year badge */}
                              <span 
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  color: '#3771FE',
                                  background: 'rgba(148, 167, 214, 0.2)',
                                  fontWeight: 400,
                                  border: 'none',
                                  marginRight: 4,
                                }}
                              >
                              {new Date(guideline.last_updated).getFullYear()}
                            </span>
                            
                            {/* Publisher badge */}
                              {guideline.society && (
                                <span 
                                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm break-words max-w-full"
                                  style={{
                                    fontFamily: 'DM Sans, sans-serif',
                                    color: '#3771FE',
                                    background: 'rgba(148, 167, 214, 0.2)',
                                    fontWeight: 400,
                                    border: 'none',
                                    display: 'inline-block',
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {guideline.society}
                              </span>
                            )}
                          </div>
                          
                          {/* Save and Dive In buttons */}
                          <div className="flex flex-row items-center gap-3">
                            <button className="flex items-center gap-1 text-slate-500 hover:text-blue-500 transition-colors" style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}>
                              <Bookmark size={16} className="sm:w-5 sm:h-5" />
                              <span>Save</span>
                            </button>
                            
                            <div className="flex-grow"></div>
                            
                            {/* Dive In button */}
                            <button 
                              onClick={() => handleGuidelineClick(guideline)}
                              disabled={!guideline.pdf_saved}
                                className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 transition-colors text-xs sm:text-sm
                                ${guideline.pdf_saved 
                                    ? '' 
                                    : 'cursor-not-allowed'}
                                `}
                                style={{
                                  background: guideline.pdf_saved ? '#01257C' : 'rgba(1, 37, 124, 0.5)',
                                  color: '#fff',
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontWeight: 500,
                                  border: 'none',
                                  boxShadow: 'none',
                                  opacity: guideline.pdf_saved ? 1 : 0.5,
                                  minWidth: '10px',
                                  fontSize: 'clamp(12px, 1.5vw, 14px)'
                                }}
                            >
                                Guideline AI Summary
                                <span className="flex items-center ml-1 sm:ml-2">
                                  <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                  <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                    ) : (
                      <div className="text-center py-8 sm:py-12">
                        <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <p 
                          className="text-sm sm:text-base text-gray-600"
                          style={{ fontFamily: 'DM Sans, sans-serif' }}
                        >
                          {`No ${category === 'Europe' ? 'European' : category} guidelines found, Try a different search term.`}
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          ))}
          
          {/* {Object.values(groupedGuidelines).flat().length === 0 && !isLoading && !error && (
            <div className="text-center py-8 sm:py-12">
              <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
              <p 
                className="text-sm sm:text-base text-gray-600"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              >
                No guidelines found. Try a different search term.
              </p>
            </div>
          )} */}
          
          {isLoading && (
            <div className="flex justify-center py-8 sm:py-12">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedGuideline && (
        isMobile ? (
          <GuidelineSummaryMobileModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            guidelineId={selectedGuideline.id}
            guidelineTitle={selectedGuideline.title}
            year={new Date(selectedGuideline.last_updated).getFullYear().toString()}
            link={selectedGuideline.link}
            url={selectedGuideline.url}
          />
        ) : (
          <GuidelineSummaryModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            guidelineId={selectedGuideline.id}
            guidelineTitle={selectedGuideline.title}
            year={new Date(selectedGuideline.last_updated).getFullYear().toString()}
            link={selectedGuideline.link}
            url={selectedGuideline.url}
          />
        )
      )}
    </div>
  )
} 