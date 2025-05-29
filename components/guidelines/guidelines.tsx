"use client"

import { useState, useEffect } from 'react'
import { Search, BookOpen, ChevronRight, Loader2, ChevronDown, Bookmark, Star, ArrowUpRight } from 'lucide-react'
import GuidelineSummaryModal from './guideline-summary-modal'

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
          query: searchTerm
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
    if (
      guidelines.some(g => g.category === 'National') &&
      !expandedCategories.includes('National')
    ) {
      setExpandedCategories(prev =>
        prev.includes('National') ? prev : [...prev, 'National']
      );
    }
  }, [guidelines]);

  useEffect(() => {
    if (selectedGuideline) {
      console.log('Selected guideline:', selectedGuideline);
    }
  }, [selectedGuideline]);

  return (
    <div className="container mx-auto px-4 py-8 mt-16 max-w-full sm:max-w-2xl md:max-w-4xl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1
            className="mb-2"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(32px, 6vw, 52px)',
              color: '#214498',
              lineHeight: 1.1
            }}
          >
            Know Your Guidelines
          </h1>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 400,
              fontSize: 'clamp(16px, 3vw, 20px)',
              color: '#596C99',
              lineHeight: 1.4
            }}
          >
            Direct access to National, European, US and International Guidelines
          </p>
        </div>
        
        <div className="relative mb-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search Clinical Guidelines . . ."
              className="w-full py-3 px-6 rounded-xl border text-gray-600 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ borderColor: '#3771FE', fontSize: 'clamp(15px, 2vw, 20px)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-blue-500 p-2.5 rounded-xl text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <ArrowUpRight size={24} />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
              {retryCount < 3 && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {categoryOrder
            .filter(category => groupedGuidelines[category])
            .concat(Object.keys(groupedGuidelines).filter(category => !categoryOrder.includes(category)))
            .map(category => (
              <div key={category} className="border px-0 pb-4 pt-2" style={{ borderColor: '#A2BDFF', borderWidth: 1, borderStyle: 'solid', background: '#EEF3FF', borderRadius: 12 }}>
              <button
                onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                  style={{
                    background: '#EEF3FF',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderBottomLeftRadius: expandedCategories.includes(category) ? 0 : 12,
                    borderBottomRightRadius: expandedCategories.includes(category) ? 0 : 12,
                  }}
              >
                  <h2 
                    className="text-lg text-gray-900"
                    style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 24, fontWeight: 400 }}
                  >
                    {category === 'Europe' ? 'European' : category} Guidelines
                  </h2>
                <ChevronDown 
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    expandedCategories.includes(category) ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              
              {expandedCategories.includes(category) && (
                <div className="p-4 space-y-4">
                    {groupedGuidelines[category].map((guideline) => (
                    <div key={guideline.id}>
                        <div className="rounded-xl p-4 shadow-sm" style={{ background: '#fff' }}>
                        <div className="space-y-3">
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
                                fontSize: 20,
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
                                className="px-3 py-1 text-sm"
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  color: '#3771FE',
                                  background: 'rgba(148, 167, 214, 0.2)',
                                  fontWeight: 400,
                                  border: 'none',
                                  borderRadius: 6,
                                  marginRight: 4,
                                }}
                              >
                              {new Date(guideline.last_updated).getFullYear()}
                            </span>
                            
                            {/* Publisher badge */}
                              {guideline.society && (
                                <span 
                                  className="px-3 py-1 text-sm whitespace-nowrap"
                                  style={{
                                    fontFamily: 'DM Sans, sans-serif',
                                    color: '#3771FE',
                                    background: 'rgba(148, 167, 214, 0.2)',
                                    fontWeight: 400,
                                    border: 'none',
                                    borderRadius: 6,
                                  }}
                                >
                                  {guideline.society}
                              </span>
                            )}
                          </div>
                          
                          {/* Save and Dive In buttons */}
                          <div className="flex items-center">
                            <button className="flex items-center gap-2 text-slate-500 border border-blue-200 rounded-xl px-3 py-1 hover:bg-white bg-blue-50">
                              <Bookmark size={16} />
                              <span className="text-sm">Save</span>
                            </button>
                            
                            <div className="flex-grow"></div>
                            
                            {/* Dive In button */}
                            <button 
                              onClick={() => handleGuidelineClick(guideline)}
                              disabled={!guideline.pdf_saved}
                                className={`flex items-center gap-1 px-2 py-1 transition-colors 
                                ${guideline.pdf_saved 
                                    ? '' 
                                    : 'cursor-not-allowed'}
                                `}
                                style={{
                                  background: guideline.pdf_saved ? '#01257C' : 'rgba(1, 37, 124, 0.5)',
                                  color: '#fff',
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontWeight: 500,
                                  fontSize: 15,
                                  border: 'none',
                                  boxShadow: 'none',
                                  borderRadius: 6,
                                  opacity: guideline.pdf_saved ? 1 : 0.5,
                                }}
                            >
                                Guideline AI Summary
                                <span className="flex items-center ml-2">
                                  <ChevronRight size={16} color="#fff" />
                                  <ChevronRight size={16} style={{marginLeft: -10}} color="#fff" />
                                </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {Object.values(groupedGuidelines).flat().length === 0 && !isLoading && !error && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No guidelines found. Try a different search term.</p>
            </div>
          )}
          
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {selectedGuideline && (
        <GuidelineSummaryModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          guidelineId={selectedGuideline.id}
          guidelineTitle={selectedGuideline.title}
          year={new Date(selectedGuideline.last_updated).getFullYear().toString()}
          link={selectedGuideline.link}
          url={selectedGuideline.url}
        />
      )}
    </div>
  )
} 