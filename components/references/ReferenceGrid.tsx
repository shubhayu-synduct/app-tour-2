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
    <div className="mt-4 grid grid-cols-3 gap-1">
      {(() => {
        const entries = Object.entries(citations);
        const showAll = getCitationCount(citations) > 3;
        const items = entries.slice(0, showAll ? 2 : 3).map(([key, citation]) => (
          <div
            key={`streaming-citation-${key}`}
            className="rounded-xl p-4 cursor-pointer hover:bg-blue-50 transition-colors"
            style={{
              background: "#EEF3FF",
              border: "1px solid #3771FE",
              height: "120px",
              width: "220px"
            }}
            onClick={() => onShowAll(citations)}
          >
            <span
              style={{
                color: "#8D8D8D",
                fontWeight: 500,
                fontFamily: "DM Sans, sans-serif",
                display: "block",
                marginBottom: "2px",
                fontSize: "14px",
              }}
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
                fontSize: "16px",
                lineHeight: "1.4",
                margin: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }}
            >
              {citation.title}
            </p>
          </div>
        ));
        if (showAll) {
          items.push(
            <div 
              key="show-all"
              className="rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-blue-50 show-all-citations-btn"
              style={{
                background: "#EEF3FF",
                border: "1px solid #3771FE",
                height: "120px",
                width: "220px"
              }}
              onClick={() => onShowAll(citations)}
            >
              <p
                style={{
                  color: "#273561",
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "16px",
                  margin: 0,
                }}
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