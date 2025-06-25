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
  
  console.log('Processing text with citations:', { textLength: text.length, citationsCount: Object.keys(citations).length });
  console.log('Sample of text being processed:', text.substring(0, 500));
  
  // First, identify and format drug names for drug citations
  // Look for HTML-formatted drug names before citations (e.g., <strong><strong>drugname</strong></strong> [1])
  // Only process drug_database citations
  // Updated regex to handle multi-word drug names with spaces
  const drugMatches = text.match(/<strong><strong>([a-zA-Z][a-zA-Z0-9\s\-'()]+)<\/strong><\/strong>\s*\[(\d+)\]/g);
  console.log('Found potential drug matches:', drugMatches);
  
  // Collect all matches first, then process in reverse order to avoid index conflicts
  const matchesToProcess: Array<{match: string, drugName: string, num: string, index: number}> = [];
  let match;
  // Updated regex to include \s for spaces in drug names
  const drugRegex = /<strong><strong>([a-zA-Z][a-zA-Z0-9\s\-'()]+)<\/strong><\/strong>\s*\[(\d+)\]/g;
  
  while ((match = drugRegex.exec(text)) !== null) {
    const drugName = match[1];
    const num = match[2];
    const citation = citations[num];
    
    console.log('Found drug match:', { drugName, num, citation, sourceType: citation?.source_type });
    
    if (citation && citation.source_type === 'drug_database') {
      matchesToProcess.push({
        match: match[0],
        drugName,
        num,
        index: match.index
      });
    }
  }
  
  // Process matches in reverse order to maintain correct indices
  matchesToProcess.reverse().forEach(({match: matchText, drugName, num}) => {
    const citation = citations[num];
    const cleanDrugName = drugName.trim();
    console.log('Processing drug citation:', { drugName: cleanDrugName, citationNumber: num, citation });
    
    const clickableDrugName = `<span class="drug-name-clickable" 
      data-citation-number="${num}"
      data-citation-title="${citation.title || ''}"
      data-citation-authors="${citation.authors ? (Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors) : ''}"
      data-citation-year="${citation.year ? `(${citation.year})` : ''}"
      data-citation-source="Drugs"
      data-citation-source-type="${citation.source_type}"
      data-citation-url="${citation.url || '#'}"
      data-citation-journal="${citation.journal || ''}"
      data-citation-doi="${citation.doi || ''}"
    >${cleanDrugName}</span>`;
    
    // Check if this is an implicit drug citation
    const isImplicit = citation.drug_citation_type === 'implicit';
    
    let replacementText = clickableDrugName;
    
    // Only add citation number if it's not implicit
    if (!isImplicit) {
      const citationSpan = `<span class="citation-reference" 
        data-citation-number="${num}"
        data-citation-title="${citation.title || ''}"
        data-citation-authors="${citation.authors ? (Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors) : ''}"
        data-citation-year="${citation.year ? `(${citation.year})` : ''}"
        data-citation-source="Drugs"
        data-citation-source-type="${citation.source_type}"
        data-citation-url="${citation.url || '#'}"
        data-citation-journal="${citation.journal || ''}"
        data-citation-doi="${citation.doi || ''}"
      ><sup class="citation-number" style="background:#E0E9FF;color:#1F2937;">${num}</sup></span>`;
      
      replacementText += citationSpan;
    }
    
    // Replace this specific match in the text
    text = text.replace(matchText, replacementText);
  });
  
  // Replace grouped citations like [1,2,3] or [1, 2, 3]
  text = text.replace(/\[(\d+(?:\s*,\s*\d+)+)\]/g, (match, group) => {
    const nums = group.split(/\s*,\s*/);
    const rendered = nums.map((num: string) => {
      const citation = citations[num];
      if (!citation) return null; // Don't render anything for missing
      
      // Skip rendering citation number for implicit drug citations
      if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
        return null;
      }
      
      const authorText = citation.authors 
        ? (Array.isArray(citation.authors) 
            ? citation.authors.join(', ') 
            : citation.authors)
        : '';
      const yearText = citation.year ? `(${citation.year})` : '';
      const titleText = citation.title || '';
      let sourceType = 'Journals';
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
        data-citation-source-type="${citation.source_type}"
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
    
    // Skip rendering citation number for implicit drug citations
    if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
      return ''; // Remove the citation number entirely for implicit drug citations
    }
    
    const authorText = citation.authors 
      ? (Array.isArray(citation.authors) 
          ? citation.authors.join(', ') 
          : citation.authors)
      : '';
    const yearText = citation.year ? `(${citation.year})` : '';
    const titleText = citation.text || '';
    let sourceType = 'Journal';
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
      data-citation-source-type="${citation.source_type}"
      data-citation-url="${url}"
      data-citation-journal="${citation.journal}"
      data-citation-doi="${citation.doi}"
    ><sup class="citation-number" style="background:#E0E9FF;color:#1F2937;">${num}</sup></span>`;
  });
  return text;
}; 