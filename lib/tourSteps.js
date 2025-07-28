// webapp/lib/tourSteps.js
const tourSteps = [
  {
    target: ".dashboard-search-bar", // Main search bar
    content: "This is your main search bar. Ask any clinical question—like \"x\"—and get rapid, referenced answers. Tip: Include patient details, labs, or context to get the most complete, guideline-based response.",
    disableBeacon: true,
  },
  {
    target: ".dashboard-acute-toggle", // Acute mode toggle
    content: "Toggle Acute mode for fast answers. In emergencies, seconds matter. Acute mode gives you short, focused responses—no fluff, just the essentials—so you can act quickly with confidence, backed by real clinical guidelines.",
  },
  {
    target: ".sidebar-new-search", // New Search button in sidebar
    content: "Start a fresh case or topic. Use \"New Search\" when switching to a different patient or clinical question. For clarifications or deeper context on the same case, use the \"Ask a follow-up\" option below each answer.",
  },
  {
    target: ".sidebar-guidelines", // Guidelines button in sidebar
    content: "Search across global clinical guidelines. Instantly explore national, European, U.S., and international recommendations. Dr.Info searches authoritative sources in real time and directs you to the official guideline documents for full context.",
  },
  {
    target: ".sidebar-drug-info", // Drug Information button in sidebar
    content: "Look up trusted drug information. Search directly through European Medicines Agency (EMA) approved documents—covering indications, dosing (posology), administration methods, contraindications, and more. Always sourced from the official record.",
  },
  {
    target: ".sidebar-profile", // Profile button in sidebar
    content: "Manage your account here. Access your profile, subscription settings, and support resources—all in one place. Need help or billing info? You'll find it here.",
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
    target: ".drinfo-answer-content", // Step 1: AI generated answer content
    content: "Here's your AI-powered answer. Dr.Info distills complex medical literature and guidelines into clear, specialty-specific insights. It saves you time, reduces cognitive load, and supports fast, evidence-based decisions—right when and where they matter most.",
    disableBeacon: true,
    scrollToFirstStep: false, // Completely disable Joyride's scrolling
    placement: "bottom", // Position tooltip at bottom
    scrollOffset: 0, // No scroll offset
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".drinfo-citation-grid-step", // Step 2: citation grid
    content: "Review your sources instantly. See the top references behind each answer at a glance—with direct links to the original documents. Want the full list? Just click \"Show All\" for complete source transparency.",
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".follow-up-question-search", // Step 3: follow-up question search bar
    content: "Need more detail? Just ask. Use the follow-up field to clarify, go deeper, or add new context to your original question—Dr.Info will adapt and refine the answer accordingly, just like a real clinical consult.",
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".drinfo-feedback-step", // Step 4: feedback buttons
    content: "Tell us how we did. Was the answer helpful? Click to rate—and if you can, leave a quick comment. Your feedback directly shapes improvements. Built with physicians, for physicians.",
    disableScrolling: true, // Disable scrolling for this step
  },
  {
    target: ".drinfo-share-step", // Step 5: share button
    content: "Share with a colleague. Use this button to send the full answer page—via link or your preferred channel. Perfect for teaching moments, second opinions, or just keeping your team in the loop.",
    disableScrolling: true, // Disable scrolling for this step
  },
]; 