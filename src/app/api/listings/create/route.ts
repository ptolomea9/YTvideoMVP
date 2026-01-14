import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PropertyData, WizardImage, ScriptSection, StyleOptions } from "@/lib/wizard/types";

/**
 * POST /api/listings/create
 * Creates a listing and video record from wizard data.
 *
 * Request body:
 * - propertyData: PropertyData
 * - images: WizardImage[]
 * - scriptSections: ScriptSection[]
 * - styleOptions: StyleOptions
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { propertyData, images, scriptSections, styleOptions } = body as {
      propertyData: PropertyData;
      images: WizardImage[];
      scriptSections: ScriptSection[];
      styleOptions: StyleOptions;
    };

    // Validate required fields
    if (!propertyData?.address) {
      return NextResponse.json(
        { error: "Property address is required" },
        { status: 400 }
      );
    }

    if (!styleOptions?.voiceId) {
      return NextResponse.json(
        { error: "Voice selection is required" },
        { status: 400 }
      );
    }

    // Map property type to database enum
    const propertyTypeMap: Record<string, string> = {
      single_family: "single_family",
      condo: "condo",
      townhouse: "townhouse",
      multi_family: "multi_family",
      land: "land",
      commercial: "commercial",
    };
    const dbPropertyType = propertyTypeMap[propertyData.propertyType] || "other";

    // Create listing record
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({
        user_id: user.id,
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        zip: propertyData.zipCode,
        price: propertyData.listingPrice,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        sqft: propertyData.squareFeet,
        property_type: dbPropertyType,
        description: propertyData.description,
        neighborhood_pois: propertyData.features || [],
        images: images.map((img) => ({
          id: img.id,
          url: img.enhancement !== "original" && img.enhancedUrls[img.enhancement as keyof typeof img.enhancedUrls]
            ? img.enhancedUrls[img.enhancement as keyof typeof img.enhancedUrls]
            : img.url,
          originalUrl: img.url,
          filename: img.filename,
          order: img.order,
          label: img.label,
          roomType: img.roomType,
          features: img.features,
          enhancement: img.enhancement,
        })),
      })
      .select()
      .single();

    if (listingError) {
      console.error("Error creating listing:", listingError);
      return NextResponse.json(
        { error: "Failed to create listing" },
        { status: 500 }
      );
    }

    // Create video record
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .insert({
        listing_id: listing.id,
        user_id: user.id,
        status: "pending",
        script_sections: scriptSections.map((section) => ({
          id: section.id,
          type: section.type,
          title: section.title,
          content: section.content,
          imageIds: section.imageIds,
          order: section.order,
        })),
        voice_id: styleOptions.voiceId,
        music_enabled: styleOptions.musicEnabled,
      })
      .select()
      .single();

    if (videoError) {
      console.error("Error creating video:", videoError);
      // Clean up the listing if video creation fails
      await supabase.from("listings").delete().eq("id", listing.id);
      return NextResponse.json(
        { error: "Failed to create video record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      listingId: listing.id,
      videoId: video.id,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
