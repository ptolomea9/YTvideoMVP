import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * User branding profile stored in Supabase auth user metadata.
 */
interface BrandingProfile {
  headshot_url?: string;
  logo_url?: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
}

/**
 * GET /api/branding/profile
 *
 * Fetches the user's saved branding profile (headshot, logo, etc.)
 * Returns saved URLs so users don't have to re-upload every time.
 */
export async function GET() {
  try {
    const supabase = await createClient();

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

    // Get branding from user metadata
    const branding = (user.user_metadata?.branding as BrandingProfile) || {};

    return NextResponse.json({
      headshot_url: branding.headshot_url || null,
      logo_url: branding.logo_url || null,
      agent_name: branding.agent_name || null,
      agent_phone: branding.agent_phone || null,
      agent_email: branding.agent_email || null,
    });
  } catch (error) {
    console.error("Error fetching branding profile:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/branding/profile
 *
 * Saves/updates the user's branding profile.
 * Persists headshot and logo URLs for future video creations.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    const body = await request.json();
    const { headshot_url, logo_url, agent_name, agent_phone, agent_email } = body;

    // Merge with existing branding data
    const existingBranding = (user.user_metadata?.branding as BrandingProfile) || {};
    const updatedBranding: BrandingProfile = {
      ...existingBranding,
    };

    // Only update fields that are provided (allow explicit null to clear)
    if (headshot_url !== undefined) updatedBranding.headshot_url = headshot_url;
    if (logo_url !== undefined) updatedBranding.logo_url = logo_url;
    if (agent_name !== undefined) updatedBranding.agent_name = agent_name;
    if (agent_phone !== undefined) updatedBranding.agent_phone = agent_phone;
    if (agent_email !== undefined) updatedBranding.agent_email = agent_email;

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        branding: updatedBranding,
      },
    });

    if (updateError) {
      console.error("Error updating branding profile:", updateError);
      return NextResponse.json(
        { error: `Failed to save: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      branding: updatedBranding,
    });
  } catch (error) {
    console.error("Error saving branding profile:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save profile" },
      { status: 500 }
    );
  }
}
