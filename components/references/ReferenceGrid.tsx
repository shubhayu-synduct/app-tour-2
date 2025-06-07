import React from "react";
import { FileEdit } from "lucide-react";

interface Citation {
  title: string;
  url: string;
  authors?: string[];
  year?: string | number;
  source_type?: string;
}

interface ReferenceGridProps {
  citations: Record<string, Citation>;
  onShowAll: (citations: Record<string, Citation>) => void;
  getCitationCount: (citations: Record<string, Citation>) => number;
}

export const ReferenceGrid: React.FC<ReferenceGridProps> = ({ citations, onShowAll, getCitationCount }) => {
  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 w-full">
      {(() => {
        const entries = Object.entries(citations);
        const showAll = getCitationCount(citations) > 3;
        
        // Mobile view - single citation
        const mobileItems = entries.slice(0, 1).map(([key, citation]) => (
          <div
            key={`mobile-citation-${key}`}
            className="sm:hidden rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-blue-50 transition-colors h-[95px] md:h-[105px] lg:h-[125px]"
            style={{
              background: "#EEF3FF",
              border: "1px solid #3771FE",
              width: "100%"
            }}
            onClick={() => onShowAll(citations)}
          >
            <span
              style={{
                color: "#8D8D8D",
                fontWeight: 500,
                fontFamily: "DM Sans, sans-serif",
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
              className="text-xs sm:text-sm md:text-base"
            >
              {citation.source_type === 'guideline_database'
                ? 'Guidelines'
                : citation.source_type === 'drug_database'
                ? 'Drugs'
                : 'Internet'}
            </span>
            <p
              style={{
                color: "#273561",
                fontWeight: 600,
                fontFamily: "DM Sans, sans-serif",
                lineHeight: "1.3",
                margin: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                maxHeight: "calc(100% - 28px)"
              }}
              className="text-sm sm:text-base md:text-lg"
            >
              {citation.title}
            </p>
          </div>
        ));

        // Desktop view - two citations
        const desktopItems = entries.slice(0, 2).map(([key, citation]) => (
          <div
            key={`desktop-citation-${key}`}
            className="hidden sm:block rounded-xl p-3 sm:p-4 cursor-pointer hover:bg-blue-50 transition-colors h-[95px] md:h-[105px] lg:h-[125px]"
            style={{
              background: "#EEF3FF",
              border: "1px solid #3771FE",
              width: "100%"
            }}
            onClick={() => onShowAll(citations)}
          >
            <span
              style={{
                color: "#8D8D8D",
                fontWeight: 500,
                fontFamily: "DM Sans, sans-serif",
                display: "block",
                marginBottom: "4px",
                fontSize: "12px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
              className="text-xs sm:text-sm md:text-base"
            >
              {citation.source_type === 'guideline_database'
                ? 'Guidelines'
                : citation.source_type === 'drug_database'
                ? 'Drugs'
                : 'Internet'}
            </span>
            <p
              style={{
                color: "#273561",
                fontWeight: 600,
                fontFamily: "DM Sans, sans-serif",
                lineHeight: "1.3",
                margin: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                maxHeight: "calc(100% - 28px)"
              }}
              className="text-sm sm:text-base md:text-lg"
            >
              {citation.title}
            </p>
          </div>
        ));

        const items = [...mobileItems, ...desktopItems];

        if (showAll) {
          items.push(
            <div 
              key="show-all"
              className="rounded-xl p-3 sm:p-4 flex items-center justify-center cursor-pointer hover:bg-blue-50 show-all-citations-btn h-[95px] md:h-[105px] lg:h-[125px]"
              style={{
                background: "#EEF3FF",
                border: "1px solid #3771FE",
                width: "100%"
              }}
              onClick={() => onShowAll(citations)}
            >
              <p
                style={{
                  color: "#273561",
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                  margin: 0,
                }}
                className="text-sm sm:text-base md:text-lg"
              >
                Show All ({getCitationCount(citations)})
              </p>
            </div>
          );
        }
        return items;
      })()}
    </div>
  );
}; 