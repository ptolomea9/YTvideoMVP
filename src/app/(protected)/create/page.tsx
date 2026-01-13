"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepIndicator } from "@/components/wizard/step-indicator";
import { useWizard } from "@/lib/wizard/wizard-context";
import { WizardStep } from "@/lib/wizard/types";

/**
 * Step placeholder components - Will be replaced in subsequent plans.
 */
function DataStepPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="font-heading text-2xl font-semibold text-foreground">
        Property Data
      </h2>
      <p className="mt-2 text-muted-foreground">
        Enter your property details to get started.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-border/50 p-8">
        <p className="text-sm text-muted-foreground">
          Property data form will be implemented in Plan 02-02
        </p>
      </div>
    </div>
  );
}

function UploadStepPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="font-heading text-2xl font-semibold text-foreground">
        Photo Upload
      </h2>
      <p className="mt-2 text-muted-foreground">
        Upload your property photos for the video tour.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-border/50 p-8">
        <p className="text-sm text-muted-foreground">
          Image upload component will be implemented in Plan 02-03
        </p>
      </div>
    </div>
  );
}

function ScriptStepPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="font-heading text-2xl font-semibold text-foreground">
        Script Generation
      </h2>
      <p className="mt-2 text-muted-foreground">
        AI-generated narration script for your video.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-border/50 p-8">
        <p className="text-sm text-muted-foreground">
          Script editor will be implemented in Plan 02-04
        </p>
      </div>
    </div>
  );
}

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
 * Step content component map.
 */
const STEP_COMPONENTS: Record<WizardStep, React.ComponentType> = {
  [WizardStep.DATA]: DataStepPlaceholder,
  [WizardStep.UPLOAD]: UploadStepPlaceholder,
  [WizardStep.SCRIPT]: ScriptStepPlaceholder,
  [WizardStep.STYLE]: StyleStepPlaceholder,
};

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

  const isFirstStep = currentStep === WizardStep.DATA;
  const isLastStep = currentStep === WizardStep.STYLE;

  // Track direction for animation
  const StepComponent = STEP_COMPONENTS[currentStep];

  const handleNext = () => {
    if (isLastStep) {
      // TODO: Submit wizard - will be implemented in Plan 02-05
      console.log("Submit wizard", state);
    } else {
      nextStep();
    }
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
      <div className="relative min-h-[300px] overflow-hidden">
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
            <StepComponent />
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
          disabled={isSubmitting}
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
