"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Sofa,
  Bed,
  TreePine,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWizard } from "@/lib/wizard/wizard-context";
import type { ScriptSection, ScriptSectionType, WizardImage, PropertyData } from "@/lib/wizard/types";
import { WIZARD_VALIDATION } from "@/lib/wizard/types";

/**
 * Section configuration with icons and display info.
 */
const SECTION_CONFIG: Record<
  ScriptSectionType,
  { title: string; icon: React.ElementType; description: string }
> = {
  opening: {
    title: "Opening",
    icon: Home,
    description: "Hook viewers with curb appeal",
  },
  living: {
    title: "Living Spaces",
    icon: Sofa,
    description: "Tour the main living areas",
  },
  private: {
    title: "Private Retreat",
    icon: Bed,
    description: "Showcase bedrooms and bathrooms",
  },
  outdoor: {
    title: "Outdoor Living",
    icon: TreePine,
    description: "Highlight outdoor and neighborhood",
  },
  closing: {
    title: "Closing",
    icon: Sparkles,
    description: "Compelling call-to-action",
  },
};

/**
 * Word count color based on target of ~50 words.
 */
function getWordCountColor(count: number): string {
  if (count === 0) return "text-muted-foreground";
  if (count < 50) return "text-green-500";
  if (count <= 70) return "text-amber-500";
  return "text-red-500";
}

/**
 * Estimate narration duration based on words (~150 words/minute).
 */
function estimateDuration(wordCount: number): string {
  const seconds = Math.round((wordCount / 150) * 60);
  return `~${seconds}s`;
}

/**
 * Typewriter animation for loading state.
 */
function TypewriterAnimation() {
  const lines = [
    "Analyzing property details...",
    "Crafting compelling narrative...",
    "Highlighting key features...",
    "Polishing the script...",
  ];
  const [currentLine, setCurrentLine] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLine((prev) => (prev + 1) % lines.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-primary/20"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-dashed border-primary/40"
        />
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Pencil className="h-10 w-10 text-primary" />
        </div>
      </div>
      <motion.p
        key={currentLine}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mt-6 font-heading text-lg font-medium text-foreground"
      >
        {lines[currentLine]}
      </motion.p>
      <p className="mt-2 text-sm text-muted-foreground">
        Creating your video script...
      </p>
    </motion.div>
  );
}

/**
 * Thumbnail strip showing images in a section.
 */
interface ThumbnailStripProps {
  imageIds: string[];
  images: WizardImage[];
}

function ThumbnailStrip({ imageIds, images }: ThumbnailStripProps) {
  const sectionImages = imageIds
    .map((id) => images.find((img) => img.id === id))
    .filter(Boolean) as WizardImage[];

  if (sectionImages.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
      {sectionImages.map((img) => (
        <div
          key={img.id}
          className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={img.label}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-0.5">
            <p className="truncate text-[8px] text-white">{img.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single section editor card.
 */
interface SectionEditorProps {
  section: ScriptSection;
  images: WizardImage[];
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (content: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function SectionEditor({
  section,
  images,
  isExpanded,
  onToggle,
  onChange,
  onRegenerate,
  isRegenerating,
}: SectionEditorProps) {
  const config = SECTION_CONFIG[section.type];
  const Icon = config.icon;
  const wordCount = section.content.trim().split(/\s+/).filter(Boolean).length;
  const isEdited = section.content !== section.originalContent;

  const [localContent, setLocalContent] = React.useState(section.content);
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync local content when section changes externally
  React.useEffect(() => {
    setLocalContent(section.content);
  }, [section.content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setLocalContent(newContent);

    // Debounce the update to wizard context
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onChange(newContent);
    }, 500);
  };

  return (
    <motion.div
      layout
      className="rounded-lg border border-border/50 bg-card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{config.title}</span>
              {isEdited && (
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500">
                  Edited
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs", getWordCountColor(wordCount))}>
            {wordCount} words
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50"
          >
            <div className="p-4 space-y-3">
              {/* Thumbnail strip */}
              <ThumbnailStrip imageIds={section.imageIds} images={images} />

              {/* Textarea */}
              <textarea
                value={localContent}
                onChange={handleContentChange}
                placeholder={`Write narration for ${config.title.toLowerCase()}...`}
                className="min-h-[100px] w-full resize-none rounded-lg border border-border/50 bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                rows={4}
              />

              {/* Footer */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span className={getWordCountColor(wordCount)}>
                    {wordCount} words
                  </span>
                  <span>{estimateDuration(wordCount)}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                  className="h-7 gap-1.5 text-xs"
                >
                  {isRegenerating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Regenerate
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export interface ScriptStepHandle {
  validate: () => Promise<boolean>;
}

/**
 * ScriptStep - Step 3 of the wizard.
 *
 * Features:
 * - 5 AI-generated tour sections
 * - Editable narration text
 * - Section-based regeneration
 * - Word counts and duration estimates
 */
export const ScriptStep = React.forwardRef<ScriptStepHandle>(
  function ScriptStep(_, ref) {
    const { state, updateScript, updateScriptSection } = useWizard();
    const { images, scriptSections, propertyData } = state;

    const [isGenerating, setIsGenerating] = React.useState(false);
    const [regeneratingSection, setRegeneratingSection] = React.useState<string | null>(null);
    const [expandedSections, setExpandedSections] = React.useState<Set<ScriptSectionType>>(
      new Set(["opening", "living", "private", "outdoor", "closing"])
    );
    const [error, setError] = React.useState<string | null>(null);

    // Expose validate method to parent
    React.useImperativeHandle(ref, () => ({
      validate: async () => {
        if (scriptSections.length === 0) {
          setError("Please generate a script before continuing.");
          return false;
        }
        const allHaveContent = scriptSections.every(
          (s) => s.content.trim().length > 0
        );
        if (!allHaveContent) {
          setError("All sections must have content.");
          return false;
        }
        // Check minimum character count per section
        const shortSections = scriptSections.filter(
          (s) => s.content.trim().length < WIZARD_VALIDATION.MIN_SECTION_CHARS
        );
        if (shortSections.length > 0) {
          const sectionNames = shortSections
            .map((s) => SECTION_CONFIG[s.type].title)
            .join(", ");
          setError(
            `Sections too short: ${sectionNames}. Each section needs at least ${WIZARD_VALIDATION.MIN_SECTION_CHARS} characters for proper narration timing.`
          );
          return false;
        }
        return true;
      },
    }));

    // Auto-generate on mount if no sections
    React.useEffect(() => {
      if (scriptSections.length === 0 && images.length > 0 && !isGenerating) {
        handleGenerate();
      }
    }, []); // Only on mount

    /**
     * Generate the full script.
     */
    const handleGenerate = async () => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch("/api/script/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyData: {
              address: propertyData.address || "",
              city: propertyData.city || "",
              state: propertyData.state || "",
              price: propertyData.listingPrice || 0,
              beds: propertyData.bedrooms || 0,
              baths: propertyData.bathrooms || 0,
              sqft: propertyData.squareFeet || 0,
              propertyType: propertyData.propertyType || "Luxury Home",
              description: propertyData.description || "",
              features: propertyData.features || [],
              agentPhone: propertyData.agentPhone || "",
              agentSocial: propertyData.agentSocial || "",
            },
            images: images.map((img) => ({
              id: img.id,
              label: img.label,
              features: img.features,
              roomType: img.roomType,
            })),
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to generate script");
        }

        const { sections } = await response.json();
        updateScript(sections);
      } catch (err) {
        console.error("Script generation error:", err);
        setError(err instanceof Error ? err.message : "Failed to generate script");
      } finally {
        setIsGenerating(false);
      }
    };

    /**
     * Regenerate a single section.
     */
    const handleRegenerateSection = async (sectionId: string) => {
      const section = scriptSections.find((s) => s.id === sectionId);
      if (!section) return;

      setRegeneratingSection(sectionId);
      setError(null);

      try {
        // Re-generate the full script but only update this section
        const response = await fetch("/api/script/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyData: {
              address: propertyData.address || "",
              city: propertyData.city || "",
              state: propertyData.state || "",
              price: propertyData.listingPrice || 0,
              beds: propertyData.bedrooms || 0,
              baths: propertyData.bathrooms || 0,
              sqft: propertyData.squareFeet || 0,
              propertyType: propertyData.propertyType || "Luxury Home",
              description: propertyData.description || "",
              features: propertyData.features || [],
              agentPhone: propertyData.agentPhone || "",
              agentSocial: propertyData.agentSocial || "",
            },
            images: images.map((img) => ({
              id: img.id,
              label: img.label,
              features: img.features,
              roomType: img.roomType,
            })),
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to regenerate section");
        }

        const { sections: newSections } = await response.json();
        const newSection = newSections.find(
          (s: ScriptSection) => s.type === section.type
        );

        if (newSection) {
          updateScriptSection({
            ...section,
            content: newSection.content,
            originalContent: newSection.content,
          });
        }
      } catch (err) {
        console.error("Section regeneration error:", err);
        setError(err instanceof Error ? err.message : "Failed to regenerate section");
      } finally {
        setRegeneratingSection(null);
      }
    };

    /**
     * Toggle section expansion.
     */
    const toggleSection = (type: ScriptSectionType) => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        return next;
      });
    };

    /**
     * Update section content.
     */
    const handleContentChange = (sectionId: string, content: string) => {
      const section = scriptSections.find((s) => s.id === sectionId);
      if (section) {
        updateScriptSection({
          ...section,
          content,
        });
      }
    };

    // Calculate total word count and duration
    const totalWords = scriptSections.reduce(
      (sum, s) => sum + s.content.trim().split(/\s+/).filter(Boolean).length,
      0
    );
    const totalDuration = Math.round((totalWords / 150) * 60);

    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <h2 className="font-heading text-2xl font-semibold text-foreground">
              Your Video Script
            </h2>
            <p className="mt-2 text-muted-foreground">
              {scriptSections.length > 0
                ? `${totalWords} words • ~${totalDuration}s narration`
                : "AI will generate a cohesive narration for your tour"}
            </p>
          </div>
          {scriptSections.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
              Regenerate All
            </Button>
          )}
        </div>

        {/* Loading state */}
        <AnimatePresence>
          {isGenerating && <TypewriterAnimation />}
        </AnimatePresence>

        {/* Generate button if no sections */}
        {!isGenerating && scriptSections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Button onClick={handleGenerate} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Script
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Based on your property data and {images.length} images
            </p>
          </div>
        )}

        {/* Section editors */}
        {!isGenerating && scriptSections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              <span>5 sections generated • Click to expand and edit</span>
            </div>

            {scriptSections.map((section) => (
              <SectionEditor
                key={section.id}
                section={section}
                images={images}
                isExpanded={expandedSections.has(section.type)}
                onToggle={() => toggleSection(section.type)}
                onChange={(content) => handleContentChange(section.id, content)}
                onRegenerate={() => handleRegenerateSection(section.id)}
                isRegenerating={regeneratingSection === section.id}
              />
            ))}
          </motion.div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    );
  }
);
