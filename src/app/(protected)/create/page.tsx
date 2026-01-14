"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { useWizard } from "@/lib/wizard/wizard-context";
import { WizardStep } from "@/lib/wizard/types";
import {
  PropertyDataStep,
  type PropertyDataStepHandle,
} from "@/components/wizard/steps/property-data-step";
import {
  UploadStep,
  type UploadStepHandle,
} from "@/components/wizard/steps/upload-step";
import {
  ScriptStep,
  type ScriptStepHandle,
} from "@/components/wizard/steps/script-step";

function StyleStepPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="font-heading text-2xl font-semibold text-foreground">
        Style Options
      </h2>
      <p className="mt-2 text-muted-foreground">
        Customize your video style and voice settings.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-border/50 p-8">
        <p className="text-sm text-muted-foreground">
          Style options will be implemented in Plan 02-05
        </p>
      </div>
    </div>
  );
}

/**
 * Animation variants for step transitions.
 */
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
  }),
};

/**
 * CreatePage - Main wizard page with step navigation.
 *
 * Features:
 * - StepIndicator at top
 * - Conditional render based on currentStep
 * - Back/Next navigation buttons
 * - Step validation for navigation
 */
export default function CreatePage() {
  const { state, nextStep, prevStep, goToStep, canProceed } = useWizard();
  const { currentStep, completedSteps, isSubmitting } = state;
  const propertyStepRef = useRef<PropertyDataStepHandle>(null);
  const uploadStepRef = useRef<UploadStepHandle>(null);
  const scriptStepRef = useRef<ScriptStepHandle>(null);

  const isFirstStep = currentStep === WizardStep.DATA;
  const isLastStep = currentStep === WizardStep.STYLE;

  /**
   * Render the current step component.
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case WizardStep.DATA:
        return <PropertyDataStep ref={propertyStepRef} />;
      case WizardStep.UPLOAD:
        return <UploadStep ref={uploadStepRef} />;
      case WizardStep.SCRIPT:
        return <ScriptStep ref={scriptStepRef} />;
      case WizardStep.STYLE:
        return <StyleStepPlaceholder />;
      default:
        return null;
    }
  };

  /**
   * Handle next button click with validation.
   */
  const handleNext = async () => {
    if (isLastStep) {
      // TODO: Submit wizard - will be implemented in Plan 02-05
      console.log("Submit wizard", state);
      return;
    }

    // Validate current step before proceeding
    if (currentStep === WizardStep.DATA) {
      if (propertyStepRef.current) {
        const success = await propertyStepRef.current.submitForm();
        if (success) {
          nextStep();
        }
      }
    } else if (currentStep === WizardStep.UPLOAD) {
      if (uploadStepRef.current) {
        const success = await uploadStepRef.current.validate();
        if (success) {
          nextStep();
        }
      }
    } else if (currentStep === WizardStep.SCRIPT) {
      if (scriptStepRef.current) {
        const success = await scriptStepRef.current.validate();
        if (success) {
          nextStep();
        }
      }
    } else {
      nextStep();
    }
  };

  /**
   * Check if Next button should be disabled.
   * For step 1, we check if the form is valid via ref.
   */
  const isNextDisabled = () => {
    if (isSubmitting) return true;
    // For now, allow clicking Next on DATA step - validation happens on click
    return false;
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Create Your Video Tour
        </h1>
        <p className="mt-2 text-muted-foreground">
          Transform your property photos into a cinematic narrated tour
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
      />

      {/* Step content with animations */}
      <div className="relative min-h-[400px] overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between border-t border-border/50 pt-6">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={isFirstStep || isSubmitting}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Step {currentStep + 1} of 4
        </div>

        <Button
          onClick={handleNext}
          disabled={isNextDisabled()}
          className="gap-2"
        >
          {isLastStep ? (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Video
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
