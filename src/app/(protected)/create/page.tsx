"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  StyleStep,
  type StyleStepHandle,
} from "@/components/wizard/steps/style-step";

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
  const router = useRouter();
  const { state, nextStep, prevStep, goToStep, setSubmitting } = useWizard();
  const { currentStep, completedSteps, isSubmitting } = state;
  const propertyStepRef = useRef<PropertyDataStepHandle>(null);
  const uploadStepRef = useRef<UploadStepHandle>(null);
  const scriptStepRef = useRef<ScriptStepHandle>(null);
  const styleStepRef = useRef<StyleStepHandle>(null);
  const [isSubmittingVideo, setIsSubmittingVideo] = useState(false);

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
        return <StyleStep ref={styleStepRef} />;
      default:
        return null;
    }
  };

  /**
   * Submit the wizard and create video.
   */
  const handleSubmit = async () => {
    // Validate voice is selected
    if (!styleStepRef.current?.validate()) {
      toast.error("Please select a voice before generating your video.");
      return;
    }

    const styleData = styleStepRef.current.getStyleData();

    setIsSubmittingVideo(true);
    setSubmitting(true);

    try {
      const response = await fetch("/api/listings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyData: state.propertyData,
          images: state.images,
          scriptSections: state.scriptSections,
          styleOptions: styleData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create video");
      }

      const data = await response.json();

      toast.success("Video creation started!", {
        description: "Your cinematic tour is being generated. Check your dashboard for progress.",
      });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Failed to create video", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSubmittingVideo(false);
      setSubmitting(false);
    }
  };

  /**
   * Handle next button click with validation.
   */
  const handleNext = async () => {
    if (isLastStep) {
      await handleSubmit();
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
   */
  const isNextDisabled = () => {
    if (isSubmitting || isSubmittingVideo) return true;
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
            isSubmittingVideo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Video...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Video
              </>
            )
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
