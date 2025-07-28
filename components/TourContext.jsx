"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import Joyride from "react-joyride-next";
import steps, { guidelineTourSteps, drugTourSteps, drinfoSummaryTourSteps } from "@/lib/tourSteps";

const TourContext = createContext();

export function useTour() {
  return useContext(TourContext);
}

export const TourProvider = ({ children }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status, index, type, action } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        setStepIndex(index + 1);
      }
    }
  };

  // Hard prevention of Joyride scrolling
  useEffect(() => {
    if (run) {
      // Prevent Joyride from scrolling by overriding scroll methods
      const originalScrollIntoView = Element.prototype.scrollIntoView;
      const originalScrollTo = window.scrollTo;
      
      // Override scrollIntoView to prevent Joyride from using it
      Element.prototype.scrollIntoView = function(options) {
        // Only allow scrolling if it's not Joyride trying to scroll
        if (!options || typeof options === 'object') {
          return; // Block Joyride's scrollIntoView calls
        }
        return originalScrollIntoView.call(this, options);
      };
      
      // Override window.scrollTo to prevent Joyride from using it
      window.scrollTo = function(options) {
        // Block Joyride's window.scrollTo calls
        return;
      };
      
      // Also prevent scroll on the content container
      const contentRef = document.querySelector('.flex-1.overflow-y-auto');
      let originalScrollTop = null;
      if (contentRef) {
        originalScrollTop = Object.getOwnPropertyDescriptor(contentRef, 'scrollTop');
        Object.defineProperty(contentRef, 'scrollTop', {
          get: function() {
            return originalScrollTop.get.call(this);
          },
          set: function(value) {
            // Only allow setting if it's not Joyride trying to scroll
            if (run) {
              return; // Block Joyride's scrollTop changes
            }
            return originalScrollTop.set.call(this, value);
          }
        });
      }
      
      return () => {
        // Restore original methods when tour ends
        Element.prototype.scrollIntoView = originalScrollIntoView;
        window.scrollTo = originalScrollTo;
        if (contentRef && originalScrollTop) {
          Object.defineProperty(contentRef, 'scrollTop', originalScrollTop);
        }
      };
    }
  }, [run]);

  // Check if current step should disable scrolling
  const currentStep = drinfoSummaryTourSteps[stepIndex];
  const shouldDisableScrolling = run && currentStep?.disableScrolling;

  // Disable body scrolling when needed
  useEffect(() => {
    if (shouldDisableScrolling) {
      document.body.style.overflow = 'hidden';
      
      // Add event listener to prevent scrolling
      const preventScroll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Prevent scroll on all scrollable elements
      const scrollableElements = document.querySelectorAll('.citations-sidebar, .overflow-y-auto, .overflow-auto');
      scrollableElements.forEach(el => {
        el.addEventListener('scroll', preventScroll, { passive: false });
        el.addEventListener('wheel', preventScroll, { passive: false });
        el.addEventListener('touchmove', preventScroll, { passive: false });
      });
      
      // Prevent scroll on document
      document.addEventListener('scroll', preventScroll, { passive: false });
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        // Cleanup event listeners
        scrollableElements.forEach(el => {
          el.removeEventListener('scroll', preventScroll);
          el.removeEventListener('wheel', preventScroll);
          el.removeEventListener('touchmove', preventScroll);
        });
        document.removeEventListener('scroll', preventScroll);
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [shouldDisableScrolling]);

  return (
    <TourContext.Provider value={{ startTour, stopTour, run }}>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </TourContext.Provider>
  );
};

const GuidelineTourContext = createContext();

export function useGuidelineTour() {
  return useContext(GuidelineTourContext);
}

export const GuidelineTourProvider = ({ children }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status, index, type, action } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        setStepIndex(index + 1);
      }
    }
  };

  return (
    <GuidelineTourContext.Provider value={{ startTour, stopTour, run }}>
      <Joyride
        steps={guidelineTourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </GuidelineTourContext.Provider>
  );
};

const DrugTourContext = createContext();

export function useDrugTour() {
  return useContext(DrugTourContext);
}

export const DrugTourProvider = ({ children }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status, index, type, action } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        setStepIndex(index + 1);
      }
    }
  };

  return (
    <DrugTourContext.Provider value={{ startTour, stopTour, run }}>
      <Joyride
        steps={drugTourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </DrugTourContext.Provider>
  );
};

const DrinfoSummaryTourContext = createContext();

export function useDrinfoSummaryTour() {
  return useContext(DrinfoSummaryTourContext);
}

export const DrinfoSummaryTourProvider = ({ children }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const nextStep = useCallback(() => setStepIndex(idx => idx + 1), []);
  
  const prevStep = useCallback(() => setStepIndex(idx => Math.max(0, idx - 1)), []);

  const handleJoyrideCallback = (data) => {
    const { status, index, type, action } = data;
    console.log('DrinfoSummaryTour callback:', { status, index, type, action });
    
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        console.log('Back button clicked, going from step', index, 'to step', Math.max(0, index - 1));
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        console.log('Next button clicked, going from step', index, 'to step', index + 1);
        setStepIndex(index + 1);
      }
    }
  };

  // Custom back button handler
  const handleBackButton = useCallback(() => {
    console.log('Custom back button handler, current step:', stepIndex, 'going to:', Math.max(0, stepIndex - 1));
    setStepIndex(Math.max(0, stepIndex - 1));
  }, [stepIndex]);

  // Remove the event listener approach since proper callback handling should work

  // Hard prevention of Joyride scrolling
  useEffect(() => {
    if (run) {
      // Prevent Joyride from scrolling by overriding scroll methods
      const originalScrollIntoView = Element.prototype.scrollIntoView;
      const originalScrollTo = window.scrollTo;
      
      // Override scrollIntoView to prevent Joyride from using it
      Element.prototype.scrollIntoView = function(options) {
        // Only allow scrolling if it's not Joyride trying to scroll
        if (!options || typeof options === 'object') {
          return; // Block Joyride's scrollIntoView calls
        }
        return originalScrollIntoView.call(this, options);
      };
      
      // Override window.scrollTo to prevent Joyride from using it
      window.scrollTo = function(options) {
        // Block Joyride's window.scrollTo calls
        return;
      };
      
      // Also prevent scroll on the content container
      const contentRef = document.querySelector('.flex-1.overflow-y-auto');
      let originalScrollTop = null;
      if (contentRef) {
        originalScrollTop = Object.getOwnPropertyDescriptor(contentRef, 'scrollTop');
        Object.defineProperty(contentRef, 'scrollTop', {
          get: function() {
            return originalScrollTop.get.call(this);
          },
          set: function(value) {
            // Only allow setting if it's not Joyride trying to scroll
            if (run) {
              return; // Block Joyride's scrollTop changes
            }
            return originalScrollTop.set.call(this, value);
          }
        });
      }
      
      return () => {
        // Restore original methods when tour ends
        Element.prototype.scrollIntoView = originalScrollIntoView;
        window.scrollTo = originalScrollTo;
        if (contentRef && originalScrollTop) {
          Object.defineProperty(contentRef, 'scrollTop', originalScrollTop);
        }
      };
    }
  }, [run]);

  // Check if current step should disable scrolling
  const currentStep = drinfoSummaryTourSteps[stepIndex];
  const shouldDisableScrolling = run && currentStep?.disableScrolling;

  // Disable body scrolling when needed
  useEffect(() => {
    if (shouldDisableScrolling) {
      document.body.style.overflow = 'hidden';
      
      // Add event listener to prevent scrolling
      const preventScroll = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Prevent scroll on all scrollable elements
      const scrollableElements = document.querySelectorAll('.citations-sidebar, .overflow-y-auto, .overflow-auto');
      scrollableElements.forEach(el => {
        el.addEventListener('scroll', preventScroll, { passive: false });
        el.addEventListener('wheel', preventScroll, { passive: false });
        el.addEventListener('touchmove', preventScroll, { passive: false });
      });
      
      // Prevent scroll on document
      document.addEventListener('scroll', preventScroll, { passive: false });
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        // Cleanup event listeners
        scrollableElements.forEach(el => {
          el.removeEventListener('scroll', preventScroll);
          el.removeEventListener('wheel', preventScroll);
          el.removeEventListener('touchmove', preventScroll);
        });
        document.removeEventListener('scroll', preventScroll);
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [shouldDisableScrolling]);

  return (
    <DrinfoSummaryTourContext.Provider value={{ startTour, stopTour, run, setStepIndex, nextStep, prevStep, handleBackButton }}>
      <Joyride
        steps={drinfoSummaryTourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep={false} // Completely disable Joyride's scrolling
        disableScrolling={true} // Disable Joyride's internal scrolling
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </DrinfoSummaryTourContext.Provider>
  );
}; 