// --- Dummy citation rendering for streaming phase ---
export function formatWithDummyCitations(html: string): string {
  // Match [1], [1,2], [1, 2, 3], etc. (allowing spaces)
  return html.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (match, p1) => {
    const numbers = p1.split(/\s*,\s*/).map((n: string) => n.trim());
    return `<sup class="citation-reference-group" style="display:inline-flex;align-items:center;gap:2px;" data-citation-number="${numbers.join(',')}">
      ${numbers.map((num: string) =>
        `<sup class="citation-number" style="background:#E0E9FF;color:#1F2937;">${num}</sup>`
      ).join('')}
      <span class="citation-tooltip">Reference details will appear after answer is complete.</span>
    </sup>`;
  });
}

// --- Real citation rendering for after streaming ---
export const formatWithCitations = (text: string, citations?: Record<string, any>) => {
  if (!citations) {
    return formatWithDummyCitations(text);
  }
  // Replace grouped citations like [1,2,3] or [1, 2, 3]
  text = text.replace(/\[(\d+(?:\s*,\s*\d+)+)\]/g, (match, group) => {
    const nums = group.split(/\s*,\s*/);
    const rendered = nums.map((num: string) => {
      const citation = citations[num];
      if (!citation) return null; // Don't render anything for missing
      const authorText = citation.authors 
        ? (Array.isArray(citation.authors) 
            ? citation.authors.join(', ') 
            : citation.authors)
        : '';
      const yearText = citation.year ? `(${citation.year})` : '';
      const titleText = citation.title || '';
      let sourceType = 'Internet';
      if (citation.source_type === 'drug_database') {
        sourceType = 'Drugs';
      } else if (citation.source_type === 'guidelines_database') {
        sourceType = 'Guidelines';
      }
      const url = citation.url || '#';
      return `<span class="citation-reference" 
        data-citation-number="${num}"
        data-citation-title="${titleText}"
        data-citation-authors="${authorText}"
        data-citation-year="${yearText}"
        data-citation-source="${sourceType}"
        data-citation-url="${url}"
        data-citation-journal="${citation.journal}"
        data-citation-doi="${citation.doi}"
      ><sup class="citation-number" style="background:#E0E9FF;color:#1F2937;">${num}</sup></span>`;
    }).filter(Boolean);
    // If any citation is missing, return the original match
    if (rendered.length !== nums.length) return match;
    return rendered.join('');
  });
  // Replace single citations like [1]
  text = text.replace(/\[(\d+)\]/g, (match, num: string) => {
    const citation = citations[num];
    if (!citation) return match; // Leave the original text if missing
    const authorText = citation.authors 
      ? (Array.isArray(citation.authors) 
          ? citation.authors.join(', ') 
          : citation.authors)
      : '';
    const yearText = citation.year ? `(${citation.year})` : '';
    const titleText = citation.text || '';
    let sourceType = 'Internet';
    if (citation.source_type === 'drug_database') {
      sourceType = 'Drugs';
    } else if (citation.source_type === 'guidelines_database') {
      sourceType = 'Guidelines';
    }
    const url = citation.url || '#';
    return `<span class="citation-reference" 
      data-citation-number="${num}"
      data-citation-title="${titleText}"
      data-citation-authors="${authorText}"
      data-citation-year="${yearText}"
      data-citation-source="${sourceType}"
      data-citation-url="${url}"
      data-citation-journal="${citation.journal}"
      data-citation-doi="${citation.doi}"
    ><sup class="citation-number" style="background:#E0E9FF;color:#1F2937;">${num}</sup></span>`;
  });
  return text;
}; 