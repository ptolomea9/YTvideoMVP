"use client";

import { useState, useCallback, KeyboardEvent, useImperativeHandle, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  // Agent contact info (optional)
  agentPhone: z.string().optional(),
  agentSocial: z.string().optional(),
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
    // TODO: Remove test defaults before production
    const [pois, setPois] = useState<string[]>(
      state.propertyData.features?.length ? state.propertyData.features : ["Rodeo Drive", "Beverly Hills Hotel", "Greystone Mansion"]
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
      // TODO: Remove test defaults before production
      defaultValues: {
        address: state.propertyData.address || "123 Luxury Lane",
        city: state.propertyData.city || "Beverly Hills",
        state: state.propertyData.state || "CA",
        zipCode: state.propertyData.zipCode || "90210",
        propertyType: state.propertyData.propertyType || "single_family",
        bedrooms: state.propertyData.bedrooms || 4,
        bathrooms: state.propertyData.bathrooms || 3,
        squareFeet: state.propertyData.squareFeet || 3500,
        lotSize: state.propertyData.lotSize || 0.5,
        lotSizeUnit: state.propertyData.lotSizeUnit || "acres",
        listingPrice: state.propertyData.listingPrice || 2500000,
        description: state.propertyData.description || "Stunning modern estate with panoramic city views, chef's kitchen, and resort-style pool.",
        agentPhone: state.propertyData.agentPhone || "(310) 555-0123",
        agentSocial: state.propertyData.agentSocial || "@luxuryhomes",
      },
    });

    const propertyType = watch("propertyType");
    const lotSizeUnit = watch("lotSizeUnit");

    /**
     * Handle form submission - save to wizard context.
     */
    const onSubmit = useCallback(
      (data: PropertyFormData) => {
        const propertyData: Partial<PropertyData> = {
          ...data,
          features: pois,
        };
        setPropertyData(propertyData);
        return true;
      },
      [pois, setPropertyData]
    );

    /**
     * Handle POI input - add on Enter.
     */
    const handlePoiKeyDown = useCallback(
      (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const value = poiInput.trim();
          if (value && pois.length < 10 && !pois.includes(value)) {
            setPois([...pois, value]);
            setPoiInput("");
          }
        }
      },
      [poiInput, pois]
    );

    /**
     * Remove a POI tag.
     */
    const removePoi = useCallback((poi: string) => {
      setPois((prev) => prev.filter((p) => p !== poi));
    }, []);

    /**
     * Expose validation and submit methods to parent.
     */
    useImperativeHandle(
      ref,
      () => ({
        isValid: () => isValid,
        submitForm: async () => {
          const valid = await trigger();
          if (valid) {
            handleSubmit(onSubmit)();
            return true;
          }
          return false;
        },
      }),
      [isValid, trigger, handleSubmit, onSubmit]
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

        {/* Section: Agent Contact */}
        <div className="space-y-4">
          <div>
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Agent Contact (Optional)
            </h3>
            <p className="text-sm text-muted-foreground">
              Shown at the end of the video as a call-to-action
            </p>
          </div>

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
                placeholder="@youragent or instagram.com/youragent"
                className="focus-visible:ring-primary/50"
                {...register("agentSocial")}
              />
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
              <Input
                id="poiInput"
                value={poiInput}
                onChange={(e) => setPoiInput(e.target.value)}
                onKeyDown={handlePoiKeyDown}
                placeholder="Whole Foods, Central Park, Metro Station..."
                className="focus-visible:ring-primary/50"
                disabled={pois.length >= 10}
              />
              <p className="text-xs text-muted-foreground">
                Press Enter to add • {pois.length}/10 added
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
      </div>
    );
  }
);
