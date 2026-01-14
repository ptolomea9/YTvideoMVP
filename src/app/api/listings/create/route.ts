import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { PropertyData, WizardImage, ScriptSection, StyleOptions } from "@/lib/wizard/types";
import { transformWizardToN8n, buildWebhookUrl, triggerYoutubeVideo, type MusicTrackMeta } from "@/lib/n8n";

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

    // Ensure profile exists (self-healing for users created before trigger)
    // Use service role client to bypass RLS for profile creation
    const serviceClient = createServiceRoleClient();
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (!existingProfile) {
      const { error: profileError } = await serviceClient
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || null,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }
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

    // Fetch music track metadata if a track is selected
    let musicTrack: MusicTrackMeta | undefined;
    if (styleOptions.musicEnabled && styleOptions.musicSelection?.trackId) {
      const { data: track, error: trackError } = await supabase
        .from("music_tracks")
        .select("*")
        .eq("id", styleOptions.musicSelection.trackId)
        .eq("is_active", true)
        .single();

      if (!trackError && track) {
        musicTrack = {
          url: track.file_url,
          duration: track.duration,
          bpm: track.bpm,
          beats: track.beats || [],
          snareHits: track.snare_hits || [],
          bassHits: track.bass_hits || [],
        };
      }
    }

    // Transform wizard data to n8n payload format (now with beat data)
    const n8nPayload = transformWizardToN8n(
      propertyData,
      images,
      scriptSections,
      styleOptions,
      user.email || "",
      musicTrack
    );
    const webhookUrl = buildWebhookUrl("youtubeVideo");

    // Create video record with n8n payload for debugging
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
        mls_dual_output: styleOptions.mlsDualOutput,
        n8n_payload: n8nPayload,
        n8n_webhook_url: webhookUrl,
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

    // Add video ID to payload for completion callback
    const payloadWithVideoId = {
      ...n8nPayload,
      videoId: video.id,
    };

    // Trigger n8n Youtube Video workflow
    const webhookResponse = await triggerYoutubeVideo(payloadWithVideoId, {
      isTest: process.env.NODE_ENV !== "production",
    });

    if (webhookResponse.success) {
      // Update video status to processing
      await supabase
        .from("videos")
        .update({
          status: "processing",
          n8n_execution_id: webhookResponse.executionId,
        })
        .eq("id", video.id);
    } else {
      // Log the error but don't fail - video record exists for retry
      console.error("n8n webhook trigger failed:", webhookResponse.error);
    }

    return NextResponse.json({
      success: true,
      listingId: listing.id,
      videoId: video.id,
      n8nWebhookUrl: webhookUrl,
      n8nTriggered: webhookResponse.success,
      n8nExecutionId: webhookResponse.executionId,
      n8nError: webhookResponse.error,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
