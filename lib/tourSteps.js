// webapp/lib/tourSteps.js
const tourSteps = [
  {
    target: ".dashboard-search-bar", // Main search bar
    content: "This is the main search bar. Ask your medical questions here!",
    disableBeacon: true,
  },
  {
    target: ".dashboard-acute-toggle", // Acute mode toggle
    content: "Toggle between Acute and Research modes here.",
  },
  {
    target: ".sidebar-new-search", // New Search button in sidebar
    content: "Start a new search from here anytime.",
  },
  {
    target: ".sidebar-guidelines", // Guidelines button in sidebar
    content: "Access clinical guidelines here.",
  },
  {
    target: ".sidebar-drug-info", // Drug Information button in sidebar
    content: "Find drug information here.",
  },
  {
    target: ".sidebar-profile", // Profile button in sidebar
    content: "View and edit your profile here.",
  },
];

export default tourSteps;

export const guidelineTourSteps = [
  {
    target: ".guidelines-search-bar", // Step 1: search bar
    content: "This is the search bar. You can search for clinical guidelines here!",
    disableBeacon: true,
  },
  {
    target: ".guidelines-search-bar", // Step 2: ask user to search
    content: "Try searching for a guideline by typing and pressing Enter or clicking the arrow.",
  },
  {
    target: ".guidelines-accordion", // Step 3: show the accordions
    content: "These are the National, European, International, and US guideline accordions.",
  },
  {
    target: ".guideline-summary-btn", // Step 4: first guideline summary button
    content: "Click here to get an AI summary of a guideline!",
  },
];

export const drugTourSteps = [
  {
    target: ".druginfo-search-bar", // Step 1: search bar
    content: "This is the drug search bar. You can search for drugs by brand or active ingredient!",
    disableBeacon: true,
  },
  {
    target: ".druginfo-search-bar", // Step 2: ask user to type
    content: "Try typing a drug name or ingredient in the search bar.",
  },
  {
    target: ".druginfo-recommendations", // Step 3: show the recommendation list
    content: "Here you'll see recommended drugs matching your search.",
  },
  {
    target: ".druginfo-table", // Step 4: show the drug table
    content: "This table lists all drugs for the selected letter, with brand names and active substances.",
  },
];

export const drinfoSummaryTourSteps = [
  {
    target: ".drinfo-answer-step", // Step 1: AI generated answer
    content: "This is the AI-generated answer to your medical query.",
    disableBeacon: true,
  },
  {
    target: ".drinfo-feedback-step", // Step 2: feedback buttons
    content: "Let us know if the answer was useful or not by clicking one of these buttons!",
  },
  {
    target: ".drinfo-share-step", // Step 3: share button
    content: "Share this answer with others using this button.",
  },
  {
    target: ".drinfo-citation-grid-step", // Step 4: citation grid
    content: "Here are the references used to generate this answer.",
  },
  {
    target: ".drinfo-citation-showall-step", // Step 5: show all button in citation grid
    content: "Click here to see all references in detail.",
  },
  {
    target: ".drinfo-citation-showall-step", // Step 6: ask user to click show all
    content: "Go ahead and click this button to view all references.",
    spotlightClicks: true,
  },
  {
    target: ".guideline-summary-btn", // Step 7: guideline AI summary button
    content: "Click this button to get an AI summary for this guideline. A summary will pop up!",
  },
]; 