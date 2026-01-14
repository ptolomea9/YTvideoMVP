"use client";

import * as React from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Sparkles, Loader2, GripVertical, Check, Pencil, X, Wand2 } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dropzone, ImagePreviewGrid, type ImagePreview } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils";
import { useWizard } from "@/lib/wizard/wizard-context";
import type { WizardImage, RoomType, EnhancementPreset } from "@/lib/wizard/types";

/**
 * Room type labels for display.
 */
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  exterior: "Exterior",
  entry: "Entry",
  living: "Living",
  kitchen: "Kitchen",
  dining: "Dining",
  master_bedroom: "Master",
  bedroom: "Bedroom",
  bathroom: "Bath",
  outdoor: "Outdoor",
  other: "Other",
};

/**
 * Analyzed image from API response.
 */
interface AnalyzedImage {
  id: string;
  url: string;
  filename: string;
  label: string;
  roomType: RoomType;
  features: string[];
  enhancement: EnhancementPreset;
}

/**
 * Enhancement presets for image processing.
 */
const ENHANCEMENT_PRESETS: { value: EnhancementPreset; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "golden_hour", label: "Golden Hour" },
  { value: "hdr", label: "HDR" },
  { value: "vivid", label: "Vivid" },
];

/**
 * EnhanceButton - Progressive disclosure button for image enhancement presets.
 * Shows on hover, opens popover with preset options on click.
 */
function EnhanceButton({
  currentPreset,
  onSelect,
}: {
  currentPreset: EnhancementPreset;
  onSelect: (preset: EnhancementPreset) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const isEnhanced = currentPreset !== "original";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "absolute bottom-1 right-1 rounded-full p-1.5 transition-all",
            "opacity-0 group-hover:opacity-100", // Progressive disclosure
            isEnhanced
              ? "bg-primary text-primary-foreground opacity-100" // Always show if enhanced
              : "bg-background/90 text-muted-foreground hover:text-foreground"
          )}
        >
          <Wand2 className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div className="flex gap-1">
          {ENHANCEMENT_PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant={currentPreset === preset.value ? "default" : "ghost"}
              size="sm"
              onClick={() => {
                onSelect(preset.value);
                setOpen(false);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Single image card with editable label and description.
 */
interface ImageCardProps {
  image: AnalyzedImage;
  onLabelChange: (id: string, label: string) => void;
  onFeaturesChange: (id: string, features: string[]) => void;
  onEnhancementChange: (id: string, preset: EnhancementPreset) => void;
  onRemove: (id: string) => void;
}

function ImageCard({ image, onLabelChange, onFeaturesChange, onEnhancementChange, onRemove }: ImageCardProps) {
  const [isEditingLabel, setIsEditingLabel] = React.useState(false);
  const [isEditingFeatures, setIsEditingFeatures] = React.useState(false);
  const [labelValue, setLabelValue] = React.useState(image.label);
  const [featuresValue, setFeaturesValue] = React.useState(image.features.join(" • "));
  const labelInputRef = React.useRef<HTMLInputElement>(null);
  const featuresInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [isEditingLabel]);

  React.useEffect(() => {
    if (isEditingFeatures && featuresInputRef.current) {
      featuresInputRef.current.focus();
      featuresInputRef.current.select();
    }
  }, [isEditingFeatures]);

  const handleSaveLabel = () => {
    if (labelValue.trim()) {
      onLabelChange(image.id, labelValue.trim());
    } else {
      setLabelValue(image.label);
    }
    setIsEditingLabel(false);
  };

  const handleSaveFeatures = () => {
    const features = featuresValue
      .split(/[•,]/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0);
    onFeaturesChange(image.id, features);
    setFeaturesValue(features.join(" • "));
    setIsEditingFeatures(false);
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveLabel();
    } else if (e.key === "Escape") {
      setLabelValue(image.label);
      setIsEditingLabel(false);
    }
  };

  const handleFeaturesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveFeatures();
    } else if (e.key === "Escape") {
      setFeaturesValue(image.features.join(" • "));
      setIsEditingFeatures(false);
    }
  };

  return (
    <Reorder.Item
      value={image}
      className="group flex items-center gap-4 rounded-lg border border-border/50 bg-card p-3 hover:border-border"
    >
      {/* Drag handle */}
      <div className="cursor-grab text-muted-foreground hover:text-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Thumbnail */}
      <div className="group relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.label}
          className="h-full w-full object-cover"
        />
        {/* Room type badge */}
        <div className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
          {ROOM_TYPE_LABELS[image.roomType]}
        </div>
        {/* Enhancement button - progressive disclosure */}
        <EnhanceButton
          currentPreset={image.enhancement}
          onSelect={(preset) => onEnhancementChange(image.id, preset)}
        />
      </div>

      {/* Label and features */}
      <div className="flex flex-1 flex-col gap-1">
        {/* Editable label */}
        {isEditingLabel ? (
          <Input
            ref={labelInputRef}
            value={labelValue}
            onChange={(e) => setLabelValue(e.target.value)}
            onBlur={handleSaveLabel}
            onKeyDown={handleLabelKeyDown}
            className="h-7 text-sm font-medium"
            placeholder="Enter label..."
          />
        ) : (
          <button
            onClick={() => setIsEditingLabel(true)}
            className="group/label flex items-center gap-2 text-left"
          >
            <span className="font-medium text-foreground">{image.label}</span>
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover/label:opacity-100" />
          </button>
        )}

        {/* Editable features/description */}
        {isEditingFeatures ? (
          <Input
            ref={featuresInputRef}
            value={featuresValue}
            onChange={(e) => setFeaturesValue(e.target.value)}
            onBlur={handleSaveFeatures}
            onKeyDown={handleFeaturesKeyDown}
            className="h-6 text-xs"
            placeholder="Add features separated by • or comma..."
          />
        ) : (
          <button
            onClick={() => setIsEditingFeatures(true)}
            className="group/features flex items-center gap-2 text-left"
          >
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {image.features.length > 0
                ? image.features.slice(0, 3).join(" • ")
                : "Click to add description..."}
            </span>
            <Pencil className="h-2.5 w-2.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/features:opacity-100" />
          </button>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(image.id)}
        className="rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}

/**
 * Scanning animation component for AI analysis.
 */
function ScanningAnimation() {
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
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
      </div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 font-heading text-lg font-medium text-foreground"
      >
        Analyzing Your Photos
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-2 text-sm text-muted-foreground"
      >
        GPT-4o Vision is identifying rooms and notable features...
      </motion.p>
    </motion.div>
  );
}

export interface UploadStepHandle {
  validate: () => Promise<boolean>;
}

/**
 * UploadStep - Step 2 of the wizard.
 *
 * Features:
 * - Drag-and-drop image upload
 * - GPT-4o Vision analysis with descriptive labels
 * - Editable labels for each image
 * - Drag-to-reorder for video sequence
 * - Labels and features pass to script generation
 */
export const UploadStep = React.forwardRef<UploadStepHandle>(
  function UploadStep(_, ref) {
    const { state, addImages, reorderImages, updateImageEnhancement } = useWizard();
    const [localImages, setLocalImages] = React.useState<ImagePreview[]>([]);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [analyzedImages, setAnalyzedImages] = React.useState<AnalyzedImage[]>([]);
    const [analyzeError, setAnalyzeError] = React.useState<string | null>(null);
    const [hasBeenAnalyzed, setHasBeenAnalyzed] = React.useState(false);

    // Check if we have images in wizard state already (returning to step)
    React.useEffect(() => {
      if (state.images.length > 0 && analyzedImages.length === 0) {
        const existingImages: AnalyzedImage[] = state.images.map((img) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          label: img.label,
          roomType: img.roomType,
          features: img.features,
          enhancement: img.enhancement,
        }));
        setAnalyzedImages(existingImages);
        setHasBeenAnalyzed(true);
      }
    }, [state.images, analyzedImages.length]);

    // Expose validate method to parent
    React.useImperativeHandle(ref, () => ({
      validate: async () => {
        if (analyzedImages.length === 0) {
          setAnalyzeError("Please upload and analyze images before continuing.");
          return false;
        }
        return true;
      },
    }));

    /**
     * Handle new files added to the dropzone.
     */
    const handleFilesAdded = React.useCallback((files: File[]) => {
      const newImages: ImagePreview[] = files.map((file) => ({
        id: nanoid(),
        file,
        preview: URL.createObjectURL(file),
      }));
      setLocalImages((prev) => {
        const combined = [...prev, ...newImages];
        return combined.slice(0, 20);
      });
      setAnalyzedImages([]);
      setHasBeenAnalyzed(false);
      setAnalyzeError(null);
    }, []);

    /**
     * Handle removing an image from the local preview.
     */
    const handleRemoveLocalImage = React.useCallback((id: string) => {
      setLocalImages((prev) => {
        const image = prev.find((img) => img.id === id);
        if (image) {
          URL.revokeObjectURL(image.preview);
        }
        return prev.filter((img) => img.id !== id);
      });
    }, []);

    /**
     * Analyze images using GPT-4o Vision API.
     */
    const handleAnalyzeImages = async () => {
      if (localImages.length === 0) {
        setAnalyzeError("Please add images first.");
        return;
      }

      setIsAnalyzing(true);
      setAnalyzeError(null);

      try {
        // Upload images to Supabase Storage
        const formData = new FormData();
        localImages.forEach((img) => {
          formData.append("images", img.file);
        });

        const uploadResponse = await fetch("/api/images/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to upload images");
        }

        const { urls } = await uploadResponse.json();

        // Analyze with GPT-4o Vision
        const analyzeResponse = await fetch("/api/images/sort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrls: urls }),
        });

        if (!analyzeResponse.ok) {
          const error = await analyzeResponse.json();
          throw new Error(error.error || "Failed to analyze images");
        }

        const { analyzed } = await analyzeResponse.json();

        // Map response to our format
        const images: AnalyzedImage[] = analyzed.map(
          (item: { url: string; filename: string; label: string; roomType: RoomType; features: string[] }, idx: number) => ({
            id: nanoid(),
            url: item.url,
            filename: item.filename || `image-${idx + 1}`,
            label: item.label,
            roomType: item.roomType,
            features: item.features || [],
            enhancement: "original" as EnhancementPreset,
          })
        );

        setAnalyzedImages(images);
        setHasBeenAnalyzed(true);

        // Update wizard state
        const wizardImages: WizardImage[] = images.map((img, idx) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          order: idx,
          label: img.label,
          roomType: img.roomType,
          features: img.features,
          enhancement: "original",
        }));
        addImages(wizardImages);

        // Clear local images
        localImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setLocalImages([]);
      } catch (error) {
        console.error("Analysis error:", error);
        setAnalyzeError(
          error instanceof Error ? error.message : "Failed to analyze images"
        );
      } finally {
        setIsAnalyzing(false);
      }
    };

    /**
     * Handle label change for an image.
     */
    const handleLabelChange = React.useCallback(
      (imageId: string, newLabel: string) => {
        setAnalyzedImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, label: newLabel } : img
          )
        );

        // Update wizard state
        const updated = analyzedImages.map((img) =>
          img.id === imageId ? { ...img, label: newLabel } : img
        );
        const wizardImages: WizardImage[] = updated.map((img, idx) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          order: idx,
          label: img.label,
          roomType: img.roomType,
          features: img.features,
          enhancement: img.enhancement,
        }));
        reorderImages(wizardImages);
      },
      [analyzedImages, reorderImages]
    );

    /**
     * Handle features change for an image.
     */
    const handleFeaturesChange = React.useCallback(
      (imageId: string, newFeatures: string[]) => {
        setAnalyzedImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, features: newFeatures } : img
          )
        );

        // Update wizard state
        const updated = analyzedImages.map((img) =>
          img.id === imageId ? { ...img, features: newFeatures } : img
        );
        const wizardImages: WizardImage[] = updated.map((img, idx) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          order: idx,
          label: img.label,
          roomType: img.roomType,
          features: img.features,
          enhancement: img.enhancement,
        }));
        reorderImages(wizardImages);
      },
      [analyzedImages, reorderImages]
    );

    /**
     * Handle enhancement change for an image.
     */
    const handleEnhancementChange = React.useCallback(
      (imageId: string, preset: EnhancementPreset) => {
        // Update local state
        setAnalyzedImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, enhancement: preset } : img
          )
        );

        // Update wizard state using the dedicated action
        updateImageEnhancement(imageId, preset);
      },
      [updateImageEnhancement]
    );

    /**
     * Handle removing an analyzed image.
     */
    const handleRemoveAnalyzedImage = React.useCallback(
      (imageId: string) => {
        const updated = analyzedImages.filter((img) => img.id !== imageId);
        setAnalyzedImages(updated);

        const wizardImages: WizardImage[] = updated.map((img, idx) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          order: idx,
          label: img.label,
          roomType: img.roomType,
          features: img.features,
          enhancement: img.enhancement,
        }));
        reorderImages(wizardImages);
      },
      [analyzedImages, reorderImages]
    );

    /**
     * Handle reordering images.
     */
    const handleReorder = React.useCallback(
      (reordered: AnalyzedImage[]) => {
        setAnalyzedImages(reordered);

        const wizardImages: WizardImage[] = reordered.map((img, idx) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          order: idx,
          label: img.label,
          roomType: img.roomType,
          features: img.features,
          enhancement: img.enhancement,
        }));
        reorderImages(wizardImages);
      },
      [reorderImages]
    );

    // Cleanup object URLs on unmount
    React.useEffect(() => {
      return () => {
        localImages.forEach((img) => URL.revokeObjectURL(img.preview));
      };
    }, []);

    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="font-heading text-2xl font-semibold text-foreground">
            Upload Property Photos
          </h2>
          <p className="mt-2 text-muted-foreground">
            Add your photos and AI will analyze each one, suggesting labels you can edit.
          </p>
        </div>

        {/* Show dropzone if not analyzed yet */}
        {!hasBeenAnalyzed && !isAnalyzing && (
          <>
            <Dropzone
              onFilesAdded={handleFilesAdded}
              accept="image/*"
              maxFiles={20}
              maxSize={10 * 1024 * 1024}
              disabled={isAnalyzing}
            />

            <ImagePreviewGrid
              images={localImages}
              onRemove={handleRemoveLocalImage}
              className="mt-4"
            />

            {localImages.length > 0 && (
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={handleAnalyzeImages}
                  disabled={isAnalyzing || localImages.length === 0}
                  size="lg"
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Analyze with AI
                </Button>
                <p className="text-xs text-muted-foreground">
                  {localImages.length} image{localImages.length !== 1 ? "s" : ""}{" "}
                  ready to analyze
                </p>
              </div>
            )}
          </>
        )}

        {/* Analyzing animation */}
        <AnimatePresence>
          {isAnalyzing && <ScanningAnimation />}
        </AnimatePresence>

        {/* Analyzed results with editable labels */}
        {hasBeenAnalyzed && analyzedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium text-foreground">
                  {analyzedImages.length} images analyzed
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAnalyzedImages([]);
                  setHasBeenAnalyzed(false);
                  reorderImages([]);
                }}
              >
                Start Over
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Click to edit labels &amp; descriptions • Drag to reorder • Used for video narration
            </p>

            {/* Reorderable image list */}
            <Reorder.Group
              axis="y"
              values={analyzedImages}
              onReorder={handleReorder}
              className="flex flex-col gap-2"
            >
              {analyzedImages.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onLabelChange={handleLabelChange}
                  onFeaturesChange={handleFeaturesChange}
                  onEnhancementChange={handleEnhancementChange}
                  onRemove={handleRemoveAnalyzedImage}
                />
              ))}
            </Reorder.Group>
          </motion.div>
        )}

        {/* Error display */}
        {analyzeError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {analyzeError}
          </div>
        )}
      </div>
    );
  }
);
