"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getCroppedImg, type PixelCrop } from "@/lib/image-crop";
import { Loader2 } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  title?: string;
  description?: string;
}

/**
 * Modal for cropping images with zoom/pan controls.
 * Uses react-easy-crop for the cropping interface.
 */
export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspectRatio = 1,
  cropShape = "round",
  title = "Crop Image",
  description = "Adjust the crop area to frame your image",
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteHandler = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const pixelCrop: PixelCrop = {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      };

      // Output at 600x600 for good quality headshots
      const croppedBlob = await getCroppedImg(imageSrc, pixelCrop, {
        width: 600,
        height: 600,
      });

      onCropComplete(croppedBlob);
      onClose();
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete, onClose]);

  const handleCancel = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        className="sm:max-w-[500px]"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Crop area container */}
        <div className="relative h-[300px] w-full bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
          />
        </div>

        {/* Zoom control */}
        <div className="space-y-2">
          <Label htmlFor="zoom-slider">Zoom</Label>
          <Slider
            id="zoom-slider"
            min={1}
            max={3}
            step={0.1}
            value={[zoom]}
            onValueChange={([value]) => setZoom(value)}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || !croppedAreaPixels}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Crop & Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
