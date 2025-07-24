"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
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
    const { status, index, type } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      setStepIndex(index + 1);
    }
  };

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
            primaryColor: "#6366f1",
            textColor: "#333",
            backgroundColor: "#fff",
            arrowColor: "#fff",
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
    const { status, index, type } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      setStepIndex(index + 1);
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
            primaryColor: "#6366f1",
            textColor: "#333",
            backgroundColor: "#fff",
            arrowColor: "#fff",
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
    const { status, index, type } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      setStepIndex(index + 1);
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
            primaryColor: "#6366f1",
            textColor: "#333",
            backgroundColor: "#fff",
            arrowColor: "#fff",
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

  const handleJoyrideCallback = (data) => {
    const { status, index, type } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      setStepIndex(index + 1);
    }
  };

  return (
    <DrinfoSummaryTourContext.Provider value={{ startTour, stopTour, run, setStepIndex, nextStep }}>
      <Joyride
        steps={drinfoSummaryTourSteps}
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
            primaryColor: "#6366f1",
            textColor: "#333",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
        }}
      />
      {children}
    </DrinfoSummaryTourContext.Provider>
  );
}; 