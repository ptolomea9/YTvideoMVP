"use client";

import { useState, useCallback, KeyboardEvent, useImperativeHandle, forwardRef, useRef, ChangeEvent, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Upload, Loader2, Plus, Search } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { readFileAsDataUrl } from "@/lib/image-crop";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWizard } from "@/lib/wizard/wizard-context";
import type { PropertyData } from "@/lib/wizard/types";
import type { PropertyLookupResponse } from "@/lib/propertyLookup/types";

/**
 * localStorage key for persisting property data between sessions.
 */
const PROPERTY_DATA_STORAGE_KEY = "edgeai-last-property-data";

/**
 * Property types matching the listings table enum.
 */
const PROPERTY_TYPES = [
  { value: "single_family", label: "Single Family" },
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "multi_family", label: "Multi-Family" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
] as const;

/**
 * Lot size unit options.
 */
const LOT_SIZE_UNITS = [
  { value: "sqft", label: "sq ft" },
  { value: "acres", label: "acres" },
] as const;

/**
 * Zod schema for property data validation.
 */
const propertyDataSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  propertyType: z.string().min(1, "Property type is required"),
  bedrooms: z.number().min(0, "Bedrooms must be 0 or more"),
  bathrooms: z.number().min(0, "Bathrooms must be 0 or more"),
  squareFeet: z.number().min(0, "Square feet must be 0 or more"),
  lotSize: z.number().min(0, "Lot size must be 0 or more").optional(),
  lotSizeUnit: z.enum(["sqft", "acres"]).optional(),
  listingPrice: z.number().min(0, "Price must be 0 or more"),
  description: z.string().optional(),
  // Agent branding for closing card (optional)
  agentName: z.string().optional(),
  agentPhone: z.string().optional(),
  agentEmail: z.string().email().optional().or(z.literal("")),
  agentSocial: z.string().optional(),
  agentCta: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertyDataSchema>;

/**
 * Handle exposed by PropertyDataStep for parent validation checks.
 */
export interface PropertyDataStepHandle {
  isValid: () => boolean;
  submitForm: () => Promise<boolean>;
}

/**
 * PropertyDataStep - Step 1 of the wizard: Property data input.
 *
 * Features:
 * - All property fields with validation
 * - Neighborhood POI tag input
 * - Luxury styling with gold focus rings
 */
export const PropertyDataStep = forwardRef<PropertyDataStepHandle>(
  function PropertyDataStep(_props, ref) {
    const { state, setPropertyData } = useWizard();
    const [pois, setPois] = useState<string[]>(
      state.propertyData.features || []
    );
    const [poiInput, setPoiInput] = useState("");

    const {
      register,
      handleSubmit,
      formState: { errors, isValid },
      setValue,
      watch,
      trigger,
    } = useForm<PropertyFormData>({
      resolver: zodResolver(propertyDataSchema),
      mode: "onChange",
      defaultValues: {
        address: state.propertyData.address || "",
        city: state.propertyData.city || "",
        state: state.propertyData.state || "",
        zipCode: state.propertyData.zipCode || "",
        propertyType: state.propertyData.propertyType || "single_family",
        bedrooms: state.propertyData.bedrooms || undefined,
        bathrooms: state.propertyData.bathrooms || undefined,
        squareFeet: state.propertyData.squareFeet || undefined,
        lotSize: state.propertyData.lotSize || undefined,
        lotSizeUnit: state.propertyData.lotSizeUnit || "acres",
        listingPrice: state.propertyData.listingPrice || undefined,
        description: state.propertyData.description || "",
        agentName: state.propertyData.agentName || "",
        agentPhone: state.propertyData.agentPhone || "",
        agentEmail: state.propertyData.agentEmail || "",
        agentSocial: state.propertyData.agentSocial || "",
        agentCta: state.propertyData.agentCta || "Schedule a Private Tour",
      },
    });

    // State for agent logo and photo uploads
    const [agentLogoUrl, setAgentLogoUrl] = useState<string | undefined>(state.propertyData.agentLogoUrl);
    const [agentPhotoUrl, setAgentPhotoUrl] = useState<string | undefined>(state.propertyData.agentPhotoUrl);
    const [isUploadingLogo, setIsUploadingLogo] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isLoadingBranding, setIsLoadingBranding] = useState(true);
    const logoInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Crop modal state
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);

    // Property lookup state
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);

    // Load saved branding from user profile and property data from localStorage on mount
    useEffect(() => {
      async function loadSavedData() {
        try {
          // Load agent branding from Supabase user profile
          const response = await fetch("/api/branding/profile");
          if (response.ok) {
            const data = await response.json();
            // Only set if not already set from wizard state
            if (data.headshot_url && !agentPhotoUrl) {
              setAgentPhotoUrl(data.headshot_url);
            }
            if (data.logo_url && !agentLogoUrl) {
              setAgentLogoUrl(data.logo_url);
            }
            // Also populate agent info if saved
            if (data.agent_name && !state.propertyData.agentName) {
              setValue("agentName", data.agent_name);
            }
            if (data.agent_phone && !state.propertyData.agentPhone) {
              setValue("agentPhone", data.agent_phone);
            }
            if (data.agent_email && !state.propertyData.agentEmail) {
              setValue("agentEmail", data.agent_email);
            }
            if (data.agent_social && !state.propertyData.agentSocial) {
              setValue("agentSocial", data.agent_social);
            }
            if (data.agent_cta && !state.propertyData.agentCta) {
              setValue("agentCta", data.agent_cta);
            }
          }
        } catch (error) {
          console.error("Error loading saved branding:", error);
        }

        // Load property data from localStorage (if wizard state is empty)
        try {
          if (typeof window !== "undefined" && !state.propertyData.address) {
            const savedPropertyData = localStorage.getItem(PROPERTY_DATA_STORAGE_KEY);
            if (savedPropertyData) {
              const parsed = JSON.parse(savedPropertyData);
              // Populate form fields with saved property data
              if (parsed.address) setValue("address", parsed.address);
              if (parsed.city) setValue("city", parsed.city);
              if (parsed.state) setValue("state", parsed.state);
              if (parsed.zipCode) setValue("zipCode", parsed.zipCode);
              if (parsed.propertyType) setValue("propertyType", parsed.propertyType);
              if (parsed.bedrooms !== undefined) setValue("bedrooms", parsed.bedrooms);
              if (parsed.bathrooms !== undefined) setValue("bathrooms", parsed.bathrooms);
              if (parsed.squareFeet !== undefined) setValue("squareFeet", parsed.squareFeet);
              if (parsed.lotSize !== undefined) setValue("lotSize", parsed.lotSize);
              if (parsed.lotSizeUnit) setValue("lotSizeUnit", parsed.lotSizeUnit);
              if (parsed.listingPrice !== undefined) setValue("listingPrice", parsed.listingPrice);
              if (parsed.description) setValue("description", parsed.description);
              if (parsed.features && Array.isArray(parsed.features)) {
                setPois(parsed.features);
              }
            }
          }
        } catch (error) {
          console.error("Error loading saved property data:", error);
        }

        setIsLoadingBranding(false);
      }
      loadSavedData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const propertyType = watch("propertyType");
    const lotSizeUnit = watch("lotSizeUnit");
    const watchedAddress = watch("address");
    const watchedCity = watch("city");
    const watchedState = watch("state");

    /**
     * Handle property lookup - fetch data from API and auto-fill form fields.
     */
    const handlePropertyLookup = useCallback(async () => {
      // Validate we have the required fields
      if (!watchedAddress || !watchedCity || !watchedState) {
        setLookupError("Please enter address, city, and state first");
        return;
      }

      setIsLookingUp(true);
      setLookupError(null);

      try {
        const params = new URLSearchParams({
          address: watchedAddress,
          city: watchedCity,
          state: watchedState,
        });

        const response = await fetch(`/api/property/lookup?${params}`);
        const data: PropertyLookupResponse = await response.json();

        if (!data.success || !data.property) {
          setLookupError(data.error || "Property not found");
          return;
        }

        const property = data.property;

        // Auto-fill form fields with lookup results
        if (property.zipCode) {
          setValue("zipCode", property.zipCode, { shouldValidate: true });
        }
        if (property.propertyType) {
          setValue("propertyType", property.propertyType, { shouldValidate: true });
        }
        if (property.bedrooms !== null) {
          setValue("bedrooms", property.bedrooms, { shouldValidate: true });
        }
        if (property.bathrooms !== null) {
          setValue("bathrooms", property.bathrooms, { shouldValidate: true });
        }
        if (property.squareFeet !== null) {
          setValue("squareFeet", property.squareFeet, { shouldValidate: true });
        }
        if (property.lotSize !== null) {
          // Lot size from API is typically in sqft
          setValue("lotSize", property.lotSize, { shouldValidate: true });
          setValue("lotSizeUnit", "sqft", { shouldValidate: true });
        }
        if (property.listingPrice !== null) {
          setValue("listingPrice", property.listingPrice, { shouldValidate: true });
        }

        // Clear any previous error on success
        setLookupError(null);
      } catch (error) {
        console.error("Property lookup failed:", error);
        setLookupError("Failed to look up property. Please try again.");
      } finally {
        setIsLookingUp(false);
      }
    }, [watchedAddress, watchedCity, watchedState, setValue]);

    /**
     * Handle branding image upload.
     */
    const handleBrandingUpload = useCallback(
      async (file: File, type: "logo" | "photo") => {
        const setUploading = type === "logo" ? setIsUploadingLogo : setIsUploadingPhoto;
        const setUrl = type === "logo" ? setAgentLogoUrl : setAgentPhotoUrl;

        setUploading(true);
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("type", type);

          const response = await fetch("/api/branding/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          const { url } = await response.json();
          setUrl(url);
        } catch (error) {
          console.error(`Error uploading ${type}:`, error);
        } finally {
          setUploading(false);
        }
      },
      []
    );

    /**
     * Handle file input change for branding images.
     * For headshots, opens crop modal first. Logos upload directly.
     */
    const handleFileChange = useCallback(
      async (e: ChangeEvent<HTMLInputElement>, type: "logo" | "photo") => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === "photo") {
          // For headshots, open crop modal first
          const dataUrl = await readFileAsDataUrl(file);
          setImageToCrop(dataUrl);
          setCropModalOpen(true);
        } else {
          // Logos upload directly without cropping
          handleBrandingUpload(file, type);
        }

        // Reset file input so same file can be selected again
        e.target.value = "";
      },
      [handleBrandingUpload]
    );

    /**
     * Handle cropped image from crop modal.
     * Converts blob to File and uploads to Supabase.
     */
    const handleCropComplete = useCallback(
      async (croppedBlob: Blob) => {
        const file = new File([croppedBlob], "headshot.png", {
          type: "image/png",
        });
        await handleBrandingUpload(file, "photo");
        setImageToCrop(null);
      },
      [handleBrandingUpload]
    );

    /**
     * Handle form submission - save to wizard context, persist agent info, and cache property data.
     */
    const onSubmit = useCallback(
      async (data: PropertyFormData) => {
        const propertyData: Partial<PropertyData> = {
          ...data,
          features: pois,
          agentLogoUrl,
          agentPhotoUrl,
        };
        setPropertyData(propertyData);

        // Persist agent info for future listings (fire and forget)
        fetch("/api/branding/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_name: data.agentName,
            agent_phone: data.agentPhone,
            agent_email: data.agentEmail,
            agent_social: data.agentSocial,
            agent_cta: data.agentCta,
          }),
        }).catch((err) => console.error("Failed to save agent info:", err));

        // Persist property data to localStorage for reuse on next video
        try {
          if (typeof window !== "undefined") {
            const propertyDataToSave = {
              address: data.address,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              propertyType: data.propertyType,
              bedrooms: data.bedrooms,
              bathrooms: data.bathrooms,
              squareFeet: data.squareFeet,
              lotSize: data.lotSize,
              lotSizeUnit: data.lotSizeUnit,
              listingPrice: data.listingPrice,
              description: data.description,
              features: pois,
            };
            localStorage.setItem(PROPERTY_DATA_STORAGE_KEY, JSON.stringify(propertyDataToSave));
          }
        } catch (err) {
          console.error("Failed to save property data to localStorage:", err);
        }

        return true;
      },
      [pois, agentLogoUrl, agentPhotoUrl, setPropertyData]
    );

    /**
     * Add a POI to the list (used by button click and Enter key).
     */
    const handleAddPoi = useCallback(() => {
      const value = poiInput.trim();
      if (value && pois.length < 10 && !pois.includes(value)) {
        setPois([...pois, value]);
        setPoiInput("");
      }
    }, [poiInput, pois]);

    /**
     * Handle POI input - add on Enter.
     */
    const handlePoiKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleAddPoi();
        }
      },
      [handleAddPoi]
    );

    /**
     * Remove a POI tag.
     */
    const removePoi = useCallback((poi: string) => {
      setPois((prev) => prev.filter((p) => p !== poi));
    }, []);

    /**
     * Expose validation and submit methods to parent.
     * Headshot is required for the video end card.
     */
    useImperativeHandle(
      ref,
      () => ({
        isValid: () => isValid && Boolean(agentPhotoUrl),
        submitForm: async () => {
          const valid = await trigger();
          if (!agentPhotoUrl) {
            return false; // Headshot required
          }
          if (valid) {
            handleSubmit(onSubmit)();
            return true;
          }
          return false;
        },
      }),
      [isValid, trigger, handleSubmit, onSubmit, agentPhotoUrl]
    );

    /**
     * Format number as currency for display.
     */
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    };

    const listingPrice = watch("listingPrice");

    return (
      <div className="space-y-8">
        {/* Section: Property Address */}
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Property Address
          </h3>

          <div className="space-y-2">
            <Label htmlFor="address">Street Address *</Label>
            <Input
              id="address"
              placeholder="123 Main Street"
              className="focus-visible:ring-primary/50"
              {...register("address")}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                placeholder="Los Angeles"
                className="focus-visible:ring-primary/50"
                {...register("city")}
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                placeholder="CA"
                className="focus-visible:ring-primary/50"
                {...register("state")}
              />
              {errors.state && (
                <p className="text-sm text-destructive">{errors.state.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code *</Label>
              <Input
                id="zipCode"
                placeholder="90210"
                className="focus-visible:ring-primary/50"
                {...register("zipCode")}
              />
              {errors.zipCode && (
                <p className="text-sm text-destructive">{errors.zipCode.message}</p>
              )}
            </div>
          </div>

          {/* Auto-Fill Button */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePropertyLookup}
              disabled={isLookingUp || !watchedAddress || !watchedCity || !watchedState}
              className="gap-2"
            >
              {isLookingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isLookingUp ? "Looking up..." : "Auto-Fill Property Details"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Fetches beds, baths, sq ft, lot size, and price
            </p>
          </div>
          {lookupError && (
            <p className="text-sm text-destructive">{lookupError}</p>
          )}
        </div>

        {/* Section: Property Details */}
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-semibold text-foreground">
            Property Details
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type *</Label>
              <Select
                value={propertyType}
                onValueChange={(value) => setValue("propertyType", value, { shouldValidate: true })}
              >
                <SelectTrigger className="w-full focus-visible:ring-primary/50">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.propertyType && (
                <p className="text-sm text-destructive">{errors.propertyType.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="listingPrice">Listing Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="listingPrice"
                  type="number"
                  placeholder="500000"
                  className="pl-7 focus-visible:ring-primary/50"
                  {...register("listingPrice", { valueAsNumber: true })}
                />
              </div>
              {listingPrice > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(listingPrice)}
                </p>
              )}
              {errors.listingPrice && (
                <p className="text-sm text-destructive">{errors.listingPrice.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min="0"
                placeholder="3"
                className="focus-visible:ring-primary/50"
                {...register("bedrooms", { valueAsNumber: true })}
              />
              {errors.bedrooms && (
                <p className="text-sm text-destructive">{errors.bedrooms.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min="0"
                step="0.5"
                placeholder="2.5"
                className="focus-visible:ring-primary/50"
                {...register("bathrooms", { valueAsNumber: true })}
              />
              {errors.bathrooms && (
                <p className="text-sm text-destructive">{errors.bathrooms.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="squareFeet">Sq Ft</Label>
              <Input
                id="squareFeet"
                type="number"
                min="0"
                placeholder="2500"
                className="focus-visible:ring-primary/50"
                {...register("squareFeet", { valueAsNumber: true })}
              />
              {errors.squareFeet && (
                <p className="text-sm text-destructive">{errors.squareFeet.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lotSize">Lot Size</Label>
              <div className="flex gap-1">
                <Input
                  id="lotSize"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={lotSizeUnit === "acres" ? "0.25" : "10890"}
                  className="min-w-0 flex-1 focus-visible:ring-primary/50"
                  {...register("lotSize", { valueAsNumber: true })}
                />
                <Select
                  value={lotSizeUnit || "sqft"}
                  onValueChange={(value: "sqft" | "acres") =>
                    setValue("lotSizeUnit", value, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="w-[70px] shrink-0 focus-visible:ring-primary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOT_SIZE_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.lotSize && (
                <p className="text-sm text-destructive">{errors.lotSize.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the property's key features and selling points..."
              className="min-h-24 focus-visible:ring-primary/50"
              {...register("description")}
            />
          </div>
        </div>

        {/* Section: Agent Branding */}
        <div className="space-y-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Agent Branding (Optional)
            </h3>
            <p className="text-sm text-muted-foreground">
              Shown on the closing card at the end of the video
            </p>
          </div>

          {/* Agent Name & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name</Label>
              <Input
                id="agentName"
                placeholder="Jane Smith"
                className="focus-visible:ring-primary/50"
                {...register("agentName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentEmail">Email</Label>
              <Input
                id="agentEmail"
                type="email"
                placeholder="jane@realty.com"
                className="focus-visible:ring-primary/50"
                {...register("agentEmail")}
              />
            </div>
          </div>

          {/* Phone & Social */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentPhone">Phone Number</Label>
              <Input
                id="agentPhone"
                type="tel"
                placeholder="(555) 123-4567"
                className="focus-visible:ring-primary/50"
                {...register("agentPhone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agentSocial">Social Handle</Label>
              <Input
                id="agentSocial"
                placeholder="@youragent"
                className="focus-visible:ring-primary/50"
                {...register("agentSocial")}
              />
            </div>
          </div>

          {/* Call-to-Action */}
          <div className="space-y-2">
            <Label htmlFor="agentCta">Call-to-Action Text</Label>
            <Input
              id="agentCta"
              placeholder="Schedule a Private Tour"
              className="focus-visible:ring-primary/50"
              {...register("agentCta")}
            />
            <p className="text-xs text-muted-foreground">
              Displayed prominently on the closing card
            </p>
          </div>

          {/* Logo & Photo Uploads */}
          <div className="space-y-2">
            <Label>
              Headshot <span className="text-destructive">*</span> & Logo <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Your headshot appears on the video end card. Once uploaded, it&apos;s saved for future videos.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* Photo Upload - Required */}
              <div
                className={`group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer min-h-[120px] ${
                  !agentPhotoUrl && !isLoadingBranding
                    ? "border-destructive/50 bg-destructive/5 hover:border-destructive hover:bg-destructive/10"
                    : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
                }`}
                onClick={() => photoInputRef.current?.click()}
              >
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "photo")}
                />
                {isUploadingPhoto || isLoadingBranding ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : agentPhotoUrl ? (
                  <div className="relative w-20 h-20">
                    <Image
                      src={agentPhotoUrl}
                      alt="Agent headshot"
                      fill
                      className="object-cover rounded-full"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAgentPhotoUrl(undefined);
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-destructive/70 mb-2" />
                    <span className="text-sm text-destructive/70 font-medium">Headshot *</span>
                    <span className="text-xs text-muted-foreground">Required</span>
                  </>
                )}
              </div>

              {/* Logo Upload - Optional */}
              <div
                className="group relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-4 transition-colors hover:border-primary/50 hover:bg-muted/50 cursor-pointer min-h-[120px]"
                onClick={() => logoInputRef.current?.click()}
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, "logo")}
                />
                {isUploadingLogo ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : agentLogoUrl ? (
                  <div className="relative w-full h-20">
                    <Image
                      src={agentLogoUrl}
                      alt="Agent logo"
                      fill
                      className="object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAgentLogoUrl(undefined);
                      }}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground hover:bg-destructive/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Logo</span>
                    <span className="text-xs text-muted-foreground">Optional</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Nearby Points of Interest */}
        <div className="space-y-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Nearby Points of Interest
            </h3>
            <p className="text-sm text-muted-foreground">
              Add nearby locations to mention in the video narration (max 10)
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="poiInput">Add POI</Label>
              <div className="flex gap-2">
                <Input
                  id="poiInput"
                  value={poiInput}
                  onChange={(e) => setPoiInput(e.target.value)}
                  onKeyDown={handlePoiKeyDown}
                  placeholder="Whole Foods, Central Park, Metro Station..."
                  className="focus-visible:ring-primary/50 flex-1"
                  disabled={pois.length >= 10}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddPoi}
                  disabled={!poiInput.trim() || pois.length >= 10}
                  title="Add POI"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {pois.length}/10 added
              </p>
            </div>

            {pois.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {pois.map((poi) => (
                  <Badge
                    key={poi}
                    variant="secondary"
                    className="gap-1 pr-1 hover:bg-secondary/80"
                  >
                    {poi}
                    <button
                      type="button"
                      onClick={() => removePoi(poi)}
                      className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {poi}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Headshot Crop Modal */}
        {imageToCrop && (
          <ImageCropModal
            isOpen={cropModalOpen}
            onClose={() => {
              setCropModalOpen(false);
              setImageToCrop(null);
            }}
            imageSrc={imageToCrop}
            onCropComplete={handleCropComplete}
            aspectRatio={1}
            cropShape="round"
            title="Crop Headshot"
            description="Adjust the crop to frame your face for the video end card"
          />
        )}
      </div>
    );
  }
);
