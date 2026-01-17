import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupProperty } from "@/lib/propertyLookup/client";
import type { PropertyLookupResponse } from "@/lib/propertyLookup/types";

/**
 * GET /api/property/lookup
 *
 * Look up property data by address using Realty Mole API.
 *
 * Query parameters:
 * - address: string - Street address (required)
 * - city: string - City name (required)
 * - state: string - State code (required)
 *
 * Returns normalized property data that can be used to auto-fill
 * the property data form in the wizard.
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, property: null, source: "", error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check for API key
    if (!process.env.RAPIDAPI_KEY) {
      return NextResponse.json(
        {
          success: false,
          property: null,
          source: "",
          error: "Property lookup service not configured. Please add RAPIDAPI_KEY to environment.",
        },
        { status: 503 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const city = searchParams.get("city");
    const state = searchParams.get("state");

    // Validate required parameters
    if (!address || !city || !state) {
      return NextResponse.json(
        {
          success: false,
          property: null,
          source: "",
          error: "Missing required parameters: address, city, and state are all required",
        },
        { status: 400 }
      );
    }

    // Look up the property
    const property = await lookupProperty(address, city, state);

    if (!property) {
      const response: PropertyLookupResponse = {
        success: false,
        property: null,
        source: "realty_mole",
        error: "Property not found. Please enter the details manually.",
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: PropertyLookupResponse = {
      success: true,
      property,
      source: "realty_mole",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error looking up property:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to look up property";

    const response: PropertyLookupResponse = {
      success: false,
      property: null,
      source: "realty_mole",
      error: errorMessage,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
