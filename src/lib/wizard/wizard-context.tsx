"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import {
  WizardStep,
  type WizardState,
  type WizardAction,
  type PropertyData,
  type WizardImage,
  type ScriptSection,
  type StyleOptions,
  initialWizardState,
} from "./types";

/**
 * Wizard reducer - handles all state transitions for the wizard.
 */
function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "NEXT_STEP": {
      const nextStep = Math.min(state.currentStep + 1, WizardStep.STYLE);
      const completedSteps = state.completedSteps.includes(state.currentStep)
        ? state.completedSteps
        : [...state.completedSteps, state.currentStep];
      return {
        ...state,
        currentStep: nextStep as WizardStep,
        completedSteps,
        error: null,
      };
    }

    case "PREV_STEP": {
      const prevStep = Math.max(state.currentStep - 1, WizardStep.DATA);
      return {
        ...state,
        currentStep: prevStep as WizardStep,
        error: null,
      };
    }

    case "GO_TO_STEP": {
      // Only allow going to completed steps or current step + 1
      const canNavigate =
        state.completedSteps.includes(action.payload) ||
        action.payload <= state.currentStep;
      if (!canNavigate) return state;
      return {
        ...state,
        currentStep: action.payload,
        error: null,
      };
    }

    case "SET_PROPERTY_DATA":
      return {
        ...state,
        propertyData: { ...state.propertyData, ...action.payload },
        error: null,
      };

    case "ADD_IMAGES":
      return {
        ...state,
        images: [...state.images, ...action.payload],
        error: null,
      };

    case "REMOVE_IMAGE":
      return {
        ...state,
        images: state.images.filter((img) => img.id !== action.payload),
        // Also remove associated script sections
        scriptSections: state.scriptSections.filter(
          (section) => section.imageId !== action.payload
        ),
        error: null,
      };

    case "REORDER_IMAGES":
      return {
        ...state,
        images: action.payload,
        error: null,
      };

    case "UPDATE_SCRIPT":
      return {
        ...state,
        scriptSections: action.payload,
        error: null,
      };

    case "UPDATE_SCRIPT_SECTION":
      return {
        ...state,
        scriptSections: state.scriptSections.map((section) =>
          section.id === action.payload.id ? action.payload : section
        ),
        error: null,
      };

    case "SET_STYLE_OPTIONS":
      return {
        ...state,
        styleOptions: { ...state.styleOptions, ...action.payload },
        error: null,
      };

    case "SET_SUBMITTING":
      return {
        ...state,
        isSubmitting: action.payload,
      };

    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isSubmitting: false,
      };

    case "RESET":
      return initialWizardState;

    default:
      return state;
  }
}

/**
 * Context value type with state and action dispatchers.
 */
interface WizardContextValue {
  state: WizardState;
  // Navigation actions
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: WizardStep) => void;
  // Data actions
  setPropertyData: (data: Partial<PropertyData>) => void;
  addImages: (images: WizardImage[]) => void;
  removeImage: (imageId: string) => void;
  reorderImages: (images: WizardImage[]) => void;
  updateScript: (sections: ScriptSection[]) => void;
  updateScriptSection: (section: ScriptSection) => void;
  setStyleOptions: (options: Partial<StyleOptions>) => void;
  // Utility actions
  setSubmitting: (isSubmitting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  // Validation helpers
  canProceed: () => boolean;
  isStepComplete: (step: WizardStep) => boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

/**
 * WizardProvider - Wraps the wizard with context and state management.
 */
export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);

  // Navigation actions
  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const goToStep = useCallback(
    (step: WizardStep) => dispatch({ type: "GO_TO_STEP", payload: step }),
    []
  );

  // Data actions
  const setPropertyData = useCallback(
    (data: Partial<PropertyData>) =>
      dispatch({ type: "SET_PROPERTY_DATA", payload: data }),
    []
  );
  const addImages = useCallback(
    (images: WizardImage[]) =>
      dispatch({ type: "ADD_IMAGES", payload: images }),
    []
  );
  const removeImage = useCallback(
    (imageId: string) => dispatch({ type: "REMOVE_IMAGE", payload: imageId }),
    []
  );
  const reorderImages = useCallback(
    (images: WizardImage[]) =>
      dispatch({ type: "REORDER_IMAGES", payload: images }),
    []
  );
  const updateScript = useCallback(
    (sections: ScriptSection[]) =>
      dispatch({ type: "UPDATE_SCRIPT", payload: sections }),
    []
  );
  const updateScriptSection = useCallback(
    (section: ScriptSection) =>
      dispatch({ type: "UPDATE_SCRIPT_SECTION", payload: section }),
    []
  );
  const setStyleOptions = useCallback(
    (options: Partial<StyleOptions>) =>
      dispatch({ type: "SET_STYLE_OPTIONS", payload: options }),
    []
  );

  // Utility actions
  const setSubmitting = useCallback(
    (isSubmitting: boolean) =>
      dispatch({ type: "SET_SUBMITTING", payload: isSubmitting }),
    []
  );
  const setError = useCallback(
    (error: string | null) => dispatch({ type: "SET_ERROR", payload: error }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  // Validation helpers
  const isStepComplete = useCallback(
    (step: WizardStep): boolean => {
      switch (step) {
        case WizardStep.DATA: {
          const { address, city, state: stateCode, propertyType } = state.propertyData;
          return Boolean(address && city && stateCode && propertyType);
        }
        case WizardStep.UPLOAD:
          return state.images.length > 0;
        case WizardStep.SCRIPT:
          return state.scriptSections.length > 0 &&
            state.scriptSections.every((s) => s.content.trim().length > 0);
        case WizardStep.STYLE:
          return Boolean(state.styleOptions.voiceId);
        default:
          return false;
      }
    },
    [state.propertyData, state.images, state.scriptSections, state.styleOptions]
  );

  const canProceed = useCallback((): boolean => {
    return isStepComplete(state.currentStep);
  }, [state.currentStep, isStepComplete]);

  const value: WizardContextValue = {
    state,
    nextStep,
    prevStep,
    goToStep,
    setPropertyData,
    addImages,
    removeImage,
    reorderImages,
    updateScript,
    updateScriptSection,
    setStyleOptions,
    setSubmitting,
    setError,
    reset,
    canProceed,
    isStepComplete,
  };

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

/**
 * useWizard - Hook to access wizard context.
 * Must be used within WizardProvider.
 */
export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
