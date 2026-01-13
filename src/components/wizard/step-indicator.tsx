"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WizardStep, WIZARD_STEP_LABELS } from "@/lib/wizard/types";

interface StepIndicatorProps {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  onStepClick?: (step: WizardStep) => void;
}

/**
 * StepIndicator - Horizontal stepper showing wizard progress.
 *
 * Features:
 * - 4 numbered circles for each step
 * - Active step: gold/primary fill
 * - Completed steps: checkmark icon with gold border
 * - Upcoming steps: muted gray
 * - Labels below circles
 * - Framer Motion transitions
 */
export function StepIndicator({
  currentStep,
  completedSteps,
  onStepClick,
}: StepIndicatorProps) {
  const steps = [
    WizardStep.DATA,
    WizardStep.UPLOAD,
    WizardStep.SCRIPT,
    WizardStep.STYLE,
  ];

  const isCompleted = (step: WizardStep) => completedSteps.includes(step);
  const isActive = (step: WizardStep) => step === currentStep;
  const isClickable = (step: WizardStep) =>
    isCompleted(step) || step <= currentStep;

  return (
    <nav aria-label="Wizard progress" className="w-full">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const completed = isCompleted(step);
          const active = isActive(step);
          const clickable = isClickable(step);
          const isLast = index === steps.length - 1;

          return (
            <li
              key={step}
              className={cn("flex items-center", !isLast && "flex-1")}
            >
              <div className="flex flex-col items-center">
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => clickable && onStepClick?.(step)}
                  disabled={!clickable}
                  className={cn(
                    "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                    clickable && "cursor-pointer",
                    !clickable && "cursor-not-allowed"
                  )}
                  aria-current={active ? "step" : undefined}
                  aria-label={`${WIZARD_STEP_LABELS[step]} step${
                    completed ? ", completed" : active ? ", current" : ""
                  }`}
                >
                  {/* Background circle with animation */}
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-full",
                      completed && "border-2 border-primary bg-transparent",
                      active && "border-2 border-primary bg-primary",
                      !completed && !active && "border-2 border-muted-foreground/30 bg-transparent"
                    )}
                    initial={false}
                    animate={{
                      scale: active ? 1 : 0.95,
                      opacity: 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  />

                  {/* Step content (number or checkmark) */}
                  <motion.span
                    className="relative z-10"
                    initial={false}
                    animate={{
                      scale: active ? 1.1 : 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  >
                    {completed ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      >
                        <Check className="h-5 w-5 text-primary" />
                      </motion.div>
                    ) : (
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          active && "text-primary-foreground",
                          !active && "text-muted-foreground"
                        )}
                      >
                        {index + 1}
                      </span>
                    )}
                  </motion.span>
                </button>

                {/* Step label */}
                <motion.span
                  className={cn(
                    "mt-2 text-xs font-medium",
                    active && "text-primary",
                    completed && !active && "text-foreground",
                    !completed && !active && "text-muted-foreground"
                  )}
                  initial={false}
                  animate={{
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {WIZARD_STEP_LABELS[step]}
                </motion.span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="relative mx-4 h-0.5 flex-1 bg-muted-foreground/30">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary"
                    initial={false}
                    animate={{
                      width: completed ? "100%" : active ? "50%" : "0%",
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
