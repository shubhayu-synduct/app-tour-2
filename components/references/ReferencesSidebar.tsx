import React from "react";
import { X } from "lucide-react";

interface Citation {
  title: string;
  url?: string;
  authors?: string[];
  year?: string | number;
  journal?: string;
  doi?: string;
  source_type?: string;
}

interface ReferencesSidebarProps {
  open: boolean;
  citations: Record<string, Citation> | null;
  onClose: () => void;
}

export const ReferencesSidebar: React.FC<ReferencesSidebarProps> = ({ open, citations, onClose }) => {
  if (!open || !citations) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-end">
      <div
        className="citations-sidebar bg-white h-full overflow-y-auto shadow-xl p-6 animate-slide-in-right"
        style={{ width: "70vw", maxWidth: "800px", fontFamily: 'DM Sans, sans-serif' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-regular text-black-800">References</h2>
          <button 
            className="p-2 hover:bg-gray-100 rounded-full"
            onClick={onClose}
          >
            <X size={20} style={{ color: "#263969" }} />
          </button>
        </div>
        <div className="space-y-6">
          {Object.entries(citations).map(([key, citation]) => (
            <div
              key={key}
              className="mb-4 rounded-xl relative"
              style={{
                border: "1px solid #3771FE",
                padding: "16px",
                background: "#fff",
              }}
            >
              {citation.source_type === 'guideline_database' && (
                <button
                  className="absolute bottom-2 right-4 flex flex-row items-center justify-center rounded-lg px-2 py-2 bg-[#002A7C] hover:bg-[#1B3B8B] transition-colors shadow-lg gap-1 w-auto min-w-[90px] sm:min-w-[110px]"
                  style={{
                    border: "none"
                  }}
                  // onClick={...}
                >
                  <span className="text-white font-regular text-xs" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em' }}>
                    Guideline AI Summary
                  </span>
                  <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="7 12 11 8 7 4" />
                    <polyline points="11 12 15 8 11 4" />
                  </svg>
                </button>
              )}
              {citation.source_type === 'drug_database' && (
                <button
                  className="absolute bottom-2 right-4 flex flex-row items-center justify-center rounded-lg px-2 py-3 bg-[#002A7C] hover:bg-[#1B3B8B] transition-colors shadow-lg gap-1 w-auto min-w-[90px] sm:min-w-[110px]"
                  style={{
                    border: "none"
                  }}
                  // onClick={...}
                >
                  <span className="text-white font-regular text-xs" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '0.01em' }}>
                    More Information
                  </span>
                  <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="7 12 11 8 7 4" />
                    <polyline points="11 12 15 8 11 4" />
                  </svg>
                </button>
              )}
              <div className="flex items-start mb-2">
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
                  >
                    {key}
                  </span>
                </div>
                
                <div className="ml-3 flex-1">
                  <span
                    style={{
                      color: "#8D8D8D",
                      fontWeight: 500,
                      fontFamily: "DM Sans, sans-serif",
                      display: "block",
                      marginBottom: "2px"
                    }}
                  >
                    {citation.source_type === 'guideline_database'
                      ? 'Guidelines'
                      : citation.source_type === 'drug_database'
                        ? 'Drugs'
                        : 'Internet'}
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
                    <p className="text-sm mb-2 italic" style={{ color: "#01257C" }}>
                      {Array.isArray(citation.authors) 
                        ? citation.authors.join(', ')
                        : citation.authors}
                    </p>
                  )}
                  {citation.journal && (
                    <p className="text-sm mb-2 italic font-medium" style={{ color: "#01257C" }}>
                      {citation.journal}{citation.source_type !== 'drug_database' && citation.year ? ` (${citation.year})` : ''}
                    </p>
                  )}
                  {citation.doi && (
                    <p className="text-sm mb-2">
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
          ))}
        </div>
      </div>
    </div>
  );
}; 