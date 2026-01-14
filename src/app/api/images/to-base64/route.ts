import { NextResponse } from "next/server";

/**
 * POST /api/images/to-base64
 *
 * Converts image URLs to base64 data URLs for use with OpenAI Vision API.
 * This is needed because temporary image URLs (like from tempfile.aiquickdraw.com)
 * may not be accessible to OpenAI's servers.
 *
 * Expects JSON body: { "urls": ["https://...", "https://..."] }
 * Returns: { "images": [{ "url": "original", "base64": "data:image/..." }, ...] }
 */
export async function POST(request: Request) {
  try {
    // Verify webhook secret for n8n
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

    if (expectedSecret) {
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Missing or invalid Authorization header" },
          { status: 401 }
        );
      }
      const token = authHeader.substring(7);
      if (token !== expectedSecret) {
        return NextResponse.json(
          { error: "Invalid authorization token" },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const urls = body.urls;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: "Missing required field: urls (array of image URLs)" },
        { status: 400 }
      );
    }

    // Limit to prevent abuse
    if (urls.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 images allowed per request" },
        { status: 400 }
      );
    }

    // Convert each image to base64
    const images = await Promise.all(
      urls.map(async (url: string) => {
        try {
          const response = await fetch(url, {
            signal: AbortSignal.timeout(30000), // 30 second timeout per image
          });

          if (!response.ok) {
            return {
              url,
              error: `Failed to fetch: ${response.status}`,
              base64: null,
            };
          }

          const contentType = response.headers.get("content-type") || "image/jpeg";
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const dataUrl = `data:${contentType};base64,${base64}`;

          return {
            url,
            base64: dataUrl,
          };
        } catch (error) {
          return {
            url,
            error: error instanceof Error ? error.message : "Unknown error",
            base64: null,
          };
        }
      })
    );

    // Filter out failed images and return only successful ones
    const successfulImages = images.filter((img) => img.base64 !== null);
    const failedImages = images.filter((img) => img.base64 === null);

    return NextResponse.json({
      images: successfulImages,
      failed: failedImages.length > 0 ? failedImages : undefined,
      totalRequested: urls.length,
      totalConverted: successfulImages.length,
    });
  } catch (error) {
    console.error("Image to base64 conversion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
