"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ChevronDown, ChevronRight, GripVertical, Check } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Dropzone, ImagePreviewGrid, type ImagePreview } from "@/components/ui/dropzone";
import { cn } from "@/lib/utils";
import { useWizard } from "@/lib/wizard/wizard-context";
import type { WizardImage } from "@/lib/wizard/types";

/**
 * Image category types for GPT-4o Vision classification.
 */
export type ImageCategory =
  | "exterior"
  | "entry"
  | "living"
  | "bedroom"
  | "bathroom"
  | "yard"
  | "other";

export const CATEGORY_LABELS: Record<ImageCategory, string> = {
  exterior: "Exterior",
  entry: "Entry",
  living: "Living Room",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  yard: "Yard/Outdoor",
  other: "Other",
};

export const CATEGORY_ORDER: ImageCategory[] = [
  "exterior",
  "entry",
  "living",
  "bedroom",
  "bathroom",
  "yard",
  "other",
];

/**
 * Image with category after sorting.
 */
export interface CategorizedImage {
  id: string;
  url: string;
  filename: string;
  category: ImageCategory;
  order: number;
}

interface CategorySectionProps {
  category: ImageCategory;
  images: CategorizedImage[];
  onMoveImage: (imageId: string, newCategory: ImageCategory) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Collapsible section for a category of images.
 */
function CategorySection({
  category,
  images,
  onMoveImage,
  isExpanded,
  onToggle,
}: CategorySectionProps) {
  if (images.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">
            {CATEGORY_LABELS[category]}
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            {images.length}
          </span>
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-2 gap-3 border-t border-border/50 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-border/50 bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="h-full w-full object-cover"
                  />
                  {/* Category reassign dropdown */}
                  <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <select
                      value={category}
                      onChange={(e) =>
                        onMoveImage(image.id, e.target.value as ImageCategory)
                      }
                      className="rounded border border-border bg-background/90 px-2 py-1 text-xs backdrop-blur"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {CATEGORY_ORDER.map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Drag handle indicator */}
                  <div className="absolute left-1 top-1 rounded bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Scanning animation component for AI classification.
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
        Analyzing Images with AI
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-2 text-sm text-muted-foreground"
      >
        GPT-4o Vision is categorizing your photos...
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
 * - Preview grid with remove functionality
 * - GPT-4o Vision sorting into categories
 * - Category display with reassignment
 */
export const UploadStep = React.forwardRef<UploadStepHandle>(
  function UploadStep(_, ref) {
    const { state, addImages, reorderImages } = useWizard();
    const [localImages, setLocalImages] = React.useState<ImagePreview[]>([]);
    const [isSorting, setIsSorting] = React.useState(false);
    const [sortedImages, setSortedImages] = React.useState<CategorizedImage[]>(
      []
    );
    const [expandedCategories, setExpandedCategories] = React.useState<
      Set<ImageCategory>
    >(new Set(CATEGORY_ORDER));
    const [sortError, setSortError] = React.useState<string | null>(null);
    const [hasBeenSorted, setHasBeenSorted] = React.useState(false);

    // Check if we have images in wizard state already (returning to step)
    React.useEffect(() => {
      if (state.images.length > 0 && sortedImages.length === 0) {
        // Convert wizard images back to categorized format
        const existingImages: CategorizedImage[] = state.images.map(
          (img, idx) => ({
            id: img.id,
            url: img.url,
            filename: img.filename,
            category: (img.caption as ImageCategory) || "other",
            order: img.order,
          })
        );
        setSortedImages(existingImages);
        setHasBeenSorted(true);
      }
    }, [state.images, sortedImages.length]);

    // Expose validate method to parent
    React.useImperativeHandle(ref, () => ({
      validate: async () => {
        // Must have sorted images to proceed
        if (sortedImages.length === 0) {
          setSortError("Please upload and sort images before continuing.");
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
        // Limit to 20 total images
        const combined = [...prev, ...newImages];
        return combined.slice(0, 20);
      });
      // Clear any previous sort results when adding new images
      setSortedImages([]);
      setHasBeenSorted(false);
      setSortError(null);
    }, []);

    /**
     * Handle removing an image from the local preview.
     */
    const handleRemoveImage = React.useCallback((id: string) => {
      setLocalImages((prev) => {
        const image = prev.find((img) => img.id === id);
        if (image) {
          URL.revokeObjectURL(image.preview);
        }
        return prev.filter((img) => img.id !== id);
      });
    }, []);

    /**
     * Sort images using GPT-4o Vision API.
     */
    const handleSortImages = async () => {
      if (localImages.length === 0) {
        setSortError("Please add images first.");
        return;
      }

      setIsSorting(true);
      setSortError(null);

      try {
        // Upload images to Supabase Storage and get URLs
        const formData = new FormData();
        localImages.forEach((img, idx) => {
          formData.append(`images`, img.file);
        });

        // First, upload to Supabase Storage
        const uploadResponse = await fetch("/api/images/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload images");
        }

        const { urls } = await uploadResponse.json();

        // Then, sort with GPT-4o Vision
        const sortResponse = await fetch("/api/images/sort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrls: urls }),
        });

        if (!sortResponse.ok) {
          throw new Error("Failed to classify images");
        }

        const { categorized } = await sortResponse.json();

        // Map response to our format
        const sorted: CategorizedImage[] = categorized.map(
          (item: { url: string; category: string; filename: string }, idx: number) => ({
            id: nanoid(),
            url: item.url,
            filename: item.filename || `image-${idx + 1}`,
            category: item.category as ImageCategory,
            order: idx,
          })
        );

        setSortedImages(sorted);
        setHasBeenSorted(true);

        // Update wizard state with sorted images
        const wizardImages: WizardImage[] = sorted.map((img, idx) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          order: idx,
          caption: img.category, // Store category in caption for now
        }));

        addImages(wizardImages);

        // Clear local images since they're now uploaded
        localImages.forEach((img) => URL.revokeObjectURL(img.preview));
        setLocalImages([]);
      } catch (error) {
        console.error("Sort error:", error);
        setSortError(
          error instanceof Error ? error.message : "Failed to sort images"
        );
      } finally {
        setIsSorting(false);
      }
    };

    /**
     * Move an image to a different category.
     */
    const handleMoveImage = React.useCallback(
      (imageId: string, newCategory: ImageCategory) => {
        setSortedImages((prev) =>
          prev.map((img) =>
            img.id === imageId ? { ...img, category: newCategory } : img
          )
        );

        // Also update wizard state
        const updated = sortedImages.map((img) =>
          img.id === imageId ? { ...img, category: newCategory } : img
        );
        const wizardImages: WizardImage[] = updated.map((img, idx) => ({
          id: img.id,
          url: img.url,
          filename: img.filename,
          order: idx,
          caption: img.category,
        }));
        reorderImages(wizardImages);
      },
      [reorderImages, sortedImages]
    );

    /**
     * Toggle category expansion.
     */
    const toggleCategory = (category: ImageCategory) => {
      setExpandedCategories((prev) => {
        const next = new Set(prev);
        if (next.has(category)) {
          next.delete(category);
        } else {
          next.add(category);
        }
        return next;
      });
    };

    /**
     * Group sorted images by category.
     */
    const imagesByCategory = React.useMemo(() => {
      const grouped = new Map<ImageCategory, CategorizedImage[]>();
      CATEGORY_ORDER.forEach((cat) => grouped.set(cat, []));

      sortedImages.forEach((img) => {
        const arr = grouped.get(img.category) || [];
        arr.push(img);
        grouped.set(img.category, arr);
      });

      return grouped;
    }, [sortedImages]);

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
            Add your photos and we&apos;ll automatically sort them into the
            perfect sequence for your video tour.
          </p>
        </div>

        {/* Show dropzone if not sorted yet */}
        {!hasBeenSorted && !isSorting && (
          <>
            <Dropzone
              onFilesAdded={handleFilesAdded}
              accept="image/*"
              maxFiles={20}
              maxSize={10 * 1024 * 1024}
              disabled={isSorting}
            />

            {/* Preview grid */}
            <ImagePreviewGrid
              images={localImages}
              onRemove={handleRemoveImage}
              className="mt-4"
            />

            {/* Sort button */}
            {localImages.length > 0 && (
              <div className="flex flex-col items-center gap-4">
                <Button
                  onClick={handleSortImages}
                  disabled={isSorting || localImages.length === 0}
                  size="lg"
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Sort Images with AI
                </Button>
                <p className="text-xs text-muted-foreground">
                  {localImages.length} image{localImages.length !== 1 ? "s" : ""}{" "}
                  ready to sort
                </p>
              </div>
            )}
          </>
        )}

        {/* Sorting animation */}
        <AnimatePresence>
          {isSorting && <ScanningAnimation />}
        </AnimatePresence>

        {/* Sorted results */}
        {hasBeenSorted && sortedImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-medium text-foreground">
                  {sortedImages.length} images sorted
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSortedImages([]);
                  setHasBeenSorted(false);
                  reorderImages([]);
                }}
              >
                Start Over
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Hover over images to reassign categories. Click section headers to
              expand/collapse.
            </p>

            {/* Category sections */}
            <div className="flex flex-col gap-3">
              {CATEGORY_ORDER.map((category) => (
                <CategorySection
                  key={category}
                  category={category}
                  images={imagesByCategory.get(category) || []}
                  onMoveImage={handleMoveImage}
                  isExpanded={expandedCategories.has(category)}
                  onToggle={() => toggleCategory(category)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Error display */}
        {sortError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {sortError}
          </div>
        )}
      </div>
    );
  }
);
