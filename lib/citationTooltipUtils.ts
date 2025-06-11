export function createCitationTooltip({
  source,
  source_type,
  title,
  authors,
  journal,
  year,
  doi,
  url
}: {
  source?: string;
  source_type?: string;
  title?: string;
  authors?: string | string[];
  journal?: string;
  year?: string | number;
  doi?: string;
  url?: string;
}) {
  // Debug log for troubleshooting
  // Remove or comment out in production
  // console.log('createCitationTooltip received:', { source, title, authors, journal, year, doi, url });

  const tooltip = document.createElement('div');
  tooltip.className = 'citation-tooltip';
  tooltip.style.background = '';
  tooltip.style.borderRadius = '16px';
  tooltip.style.padding = '16px';
  tooltip.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
  tooltip.style.fontFamily = 'DM Sans, sans-serif';

  // Source type label (Guidelines, Drugs, or Internet)
  let sourceType = 'Internet';  // Default to Internet
  if (source_type === 'guideline_database') {
    sourceType = 'Guidelines';
  } else if (source_type === 'drug_database') {
    sourceType = 'Drugs';
  }
  const sourceTypeEl = document.createElement('div');
  sourceTypeEl.textContent = sourceType;
  sourceTypeEl.style.color = '#8D8D8D';
  sourceTypeEl.style.fontWeight = '500';
  sourceTypeEl.style.fontSize = '14px';
  sourceTypeEl.style.marginBottom = '2px';
  tooltip.appendChild(sourceTypeEl);

  // Title
  if (title) {
    const titleLink = document.createElement('a');
    titleLink.href = url || '#';
    titleLink.target = '_blank';
    titleLink.rel = 'noopener noreferrer';
    titleLink.textContent = title;
    titleLink.style.color = '#273561';
    titleLink.style.fontWeight = '600';
    titleLink.style.fontSize = '15px';
    titleLink.style.textDecoration = 'none';
    titleLink.style.display = 'block';
    titleLink.style.marginBottom = '4px';
    tooltip.appendChild(titleLink);
  }

  // Authors (italic, #01257C)
  let authorsText = '';
  if (Array.isArray(authors)) {
    authorsText = authors.filter(Boolean).join(', ');
  } else if (typeof authors === 'string' && authors) {
    authorsText = authors;
  }
  if (authorsText) {
    const authorsEl = document.createElement('div');
    authorsEl.textContent = authorsText;
    authorsEl.style.fontStyle = 'italic';
    authorsEl.style.color = '#01257C';
    authorsEl.style.fontFamily = 'DM Sans, sans-serif';
    authorsEl.style.fontSize = '14px';
    authorsEl.style.marginBottom = '2px';
    tooltip.appendChild(authorsEl);
  }

  // Journal name and year (italic, medium, #01257C)
  if (journal) {
    const journalEl = document.createElement('div');
    const showYear = source !== 'drug_database' && year;
    journalEl.textContent = showYear ? `${journal} (${year})` : journal;
    journalEl.style.fontStyle = 'italic';
    journalEl.style.fontWeight = '500';
    journalEl.style.color = '#01257C';
    journalEl.style.fontFamily = 'DM Sans, sans-serif';
    journalEl.style.fontSize = '14px';
    journalEl.style.marginBottom = '2px';
    tooltip.appendChild(journalEl);
  }

  // DOI (link, #3771FE)
  if (doi) {
    const doiEl = document.createElement('a');
    doiEl.href = `https://doi.org/${doi}`;
    doiEl.textContent = `DOI: ${doi}`;
    doiEl.target = '_blank';
    doiEl.rel = 'noopener noreferrer';
    doiEl.style.color = '#3771FE';
    doiEl.style.fontWeight = '500';
    doiEl.style.fontFamily = 'DM Sans, sans-serif';
    doiEl.style.fontSize = '14px';
    doiEl.style.textDecoration = 'underline';
    tooltip.appendChild(doiEl);
  }

  return tooltip;
} 