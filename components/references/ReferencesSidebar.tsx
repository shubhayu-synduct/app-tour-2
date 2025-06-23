import React, { useState, useEffect } from "react";
import { X, ArrowLeft } from "lucide-react";
import { GuidelineSummaryModal } from "./GuidelineSummaryModal";
import { DrugInformationModal } from "./DrugInformationModal";
import { GuidelineMobileModal } from "./GuidelineMobileModal";

interface Citation {
  title: string;
  url?: string;
  authors?: string[];
  year?: string | number;
  journal?: string;
  doi?: string;
  source_type?: string;
  drug_citation_type?: string;
}

interface ReferencesSidebarProps {
  open: boolean;
  citations: Record<string, Citation> | null;
  onClose: () => void;
}

export const ReferencesSidebar: React.FC<ReferencesSidebarProps> = ({ open, citations, onClose }) => {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [showGuidelineModal, setShowGuidelineModal] = useState(false);
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  if (!open || !citations) return null;

  // Filter out implicit drug citations
  const filteredCitations = Object.entries(citations).filter(([key, citation]) => {
    // If it's a drug citation and has drug_citation_type === 'implicit', hide it
    if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
      return false;
    }
    // Otherwise, show it
    return true;
  });

  const handleGuidelineClick = (citation: Citation) => {
    if (citation.source_type === 'guideline_database') {
      setSelectedCitation(citation);
      setShowGuidelineModal(true);
    }
  };

  const handleDrugClick = (citation: Citation) => {
    if (citation.source_type === 'drug_database') {
      setSelectedCitation(citation);
      setShowDrugModal(true);
    }
  };

  const handleBackClick = () => {
    setShowGuidelineModal(false);
    setShowDrugModal(false);
    setSelectedCitation(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-end">
      <div
        className="citations-sidebar bg-white h-full shadow-xl p-3 sm:p-4 md:p-6 animate-slide-in-right flex flex-col"
        style={{ width: "90vw", maxWidth: "800px", fontFamily: 'DM Sans, sans-serif' }}
      >
        {!showGuidelineModal && !showDrugModal ? (
          // References View
          <>
            {/* Fixed header */}
            <div className="flex-none">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-regular text-black-800">References</h2>
                <button 
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full"
                  onClick={onClose}
                >
                  <X size={18} className="sm:w-5 sm:h-5" style={{ color: "#263969" }}  />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 sm:space-y-6">
                {filteredCitations.map(([key, citation]) => (
                  <div
                    key={key}
                    className="mb-3 sm:mb-4 rounded-xl relative flex flex-col"
                    style={{
                      border: "1px solid #3771FE",
                      padding: "16px sm:20px",
                      background: "#fff",
                      minHeight: "140px sm:160px"
                    }}
                  >  
                    <div className="flex-1">
                      <div className="flex items-start mb-2 p-2 sm:p-3">
                        <div className="flex-shrink-0">
                          <span
                            style={{
                              background: "#E0E9FF",
                              color: "#263969",
                              borderRadius: "50%",
                              width: "28px",
                              height: "28px",
                              fontWeight: 500,
                              fontSize: "12px",
                              lineHeight: "28px",
                              textAlign: "center",
                              display: "inline-block",
                            }}
                            className="sm:w-7 sm:h-7 sm:text-xs sm:leading-7"
                          >
                            {key}
                          </span>
                        </div>
                        
                        <div className="ml-2 sm:ml-3 flex-1">
                          <span
                            style={{
                              color: "#8D8D8D",
                              fontWeight: 500,
                              fontFamily: "DM Sans, sans-serif",
                              display: "block",
                              marginBottom: "2px",
                              fontSize: "12px"
                            }}
                             className="sm:text-sm md:text-base"
                          >
                            {citation.source_type === 'guideline_database'
                              ? 'Guidelines'
                              : citation.source_type === 'drug_database'
                                ? 'Drugs'
                                : 'Journals'}
                          </span>
                          <h3 className="text-blue-650 font-semibold" style={{ fontWeight: 650, marginBottom: '2px' }}>
                            <a
                              href={citation.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                              style={{ color: "#273561" }}
                              onMouseOver={e => (e.currentTarget.style.color = '#3771FE')}
                              onMouseOut={e => (e.currentTarget.style.color = '#273561')}
                            >
                              {citation.title}
                            </a>
                          </h3>
                          {citation.authors && (
                            <p className="text-xs sm:text-sm md:text-base mb-1 sm:mb-2 italic" style={{ color: "#01257C" }}>
                              {Array.isArray(citation.authors) 
                                ? citation.authors.join(', ')
                                : citation.authors}
                            </p>
                          )}
                          {citation.journal && (
                            <p className="text-xs sm:text-sm md:text-base mb-1 sm:mb-2 italic font-medium" style={{ color: "#01257C" }}>
                              {citation.journal}{citation.source_type !== 'drug_database' && citation.year ? ` (${citation.year})` : ''}
                            </p>
                          )}
                          {citation.doi && (
                            <p className="text-xs sm:text-sm md:text-base mb-1 sm:mb-2">
                              <a
                                href={`https://doi.org/${citation.doi}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#3771FE" }}
                                className="hover:underline"
                              >
                                DOI: {citation.doi}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 pr-4 pb-4">
                      {citation.source_type === 'guideline_database' && (
                        <button
                          className="flex flex-row items-center justify-center gap-x-2 rounded-[5px] px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 bg-[#002A7C] hover:bg-[#1B3B8B] transition-colors"
                          style={{
                            border: "none"
                          }}
                          onClick={() => handleGuidelineClick(citation)}
                        >
                          <span className="text-white font-regular text-xs sm:text-sm md:text-base" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em' }}>
                            Guideline AI Summary
                          </span>
                          <svg width="16" height="16" className="sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0 mt-0 md:mt-2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="7 12 11 8 7 4" />
                            <polyline points="11 12 15 8 11 4" />
                          </svg>
                        </button>
                      )}
                      {citation.source_type === 'drug_database' && (
                        <button
                          className="flex flex-row items-center justify-between rounded-[5px] px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 bg-[#002A7C] hover:bg-[#1B3B8B] transition-colors"
                          style={{
                            border: "none"
                          }}
                          onClick={() => handleDrugClick(citation)}
                        >
                          <span className="text-white font-regular text-xs sm:text-sm md:text-base" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em' }}>
                            Clinical Particulars
                          </span>
                          <svg width="16" height="16" className="sm:w-5 sm:h-5 md:w-6 md:h-6 mt-0 md:mt-2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="7 12 11 8 7 4" />
                            <polyline points="11 12 15 8 11 4" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : showGuidelineModal ? (
          selectedCitation && (isMobile ? (
            <GuidelineMobileModal
              open={showGuidelineModal}
              onClose={handleBackClick}
              citation={selectedCitation}
            />
          ) : (
            <GuidelineSummaryModal
              open={showGuidelineModal}
              onClose={handleBackClick}
              citation={selectedCitation}
            />
          ))
        ) : (
          selectedCitation && (
            <DrugInformationModal
              open={showDrugModal}
              onClose={handleBackClick}
              citation={selectedCitation}
            />
          )
        )}
      </div>
    </div>
  );
}; 