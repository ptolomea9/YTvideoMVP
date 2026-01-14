/**
 * n8n Webhook Client
 *
 * Client for triggering n8n workflows via webhooks.
 * Handles both production and test webhook endpoints.
 */

import type { N8nTourVideoPayload } from "./transform";

/**
 * n8n workflow identifiers and webhook paths.
 */
export const N8N_WORKFLOWS = {
  tourVideo: {
    id: "5WetGoorzy8r2nNQ",
    webhookPath: "tour-video",
    name: "Tour Video",
  },
  listingVideo: {
    id: "F5GcRy7CqjkWgMSm",
    webhookPath: "video-listing",
    name: "Video Listing Main Workflow",
  },
  youtubeVideo: {
    id: "Qo2sirL0cDI2fVNQMJ5Eq",
    webhookPath: "db085427-02a1-4f47-9934-9c258aa929b3",
    name: "Youtube Video",
  },
} as const;

export type WorkflowType = keyof typeof N8N_WORKFLOWS;

/**
 * Response from n8n webhook trigger.
 */
export interface N8nWebhookResponse {
  success: boolean;
  executionId?: string;
  webhookUrl?: string;
  error?: string;
}

/**
 * Get the base URL for n8n webhooks.
 * Uses environment variable or falls back to default.
 */
function getN8nBaseUrl(): string {
  return process.env.N8N_WEBHOOK_URL || "https://edgeaimedia.app.n8n.cloud";
}

/**
 * Build the full webhook URL for a workflow.
 *
 * @param workflowType - Which workflow to trigger
 * @param isTest - Whether to use test webhook (default: false)
 */
export function buildWebhookUrl(
  workflowType: WorkflowType,
  isTest: boolean = false
): string {
  const baseUrl = getN8nBaseUrl();
  const workflow = N8N_WORKFLOWS[workflowType];
  const prefix = isTest ? "webhook-test" : "webhook";

  return `${baseUrl}/${prefix}/${workflow.webhookPath}`;
}

/**
 * Trigger the Tour Video workflow.
 *
 * @param payload - Transformed wizard data
 * @param options - Optional configuration
 * @returns Webhook response with execution ID
 *
 * @example
 * ```typescript
 * const response = await triggerTourVideo(payload);
 * if (response.success) {
 *   console.log('Execution ID:', response.executionId);
 * }
 * ```
 */
export async function triggerTourVideo(
  payload: N8nTourVideoPayload,
  options?: { isTest?: boolean }
): Promise<N8nWebhookResponse> {
  const webhookUrl = buildWebhookUrl("tourVideo", options?.isTest);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        webhookUrl,
        error: `n8n webhook failed: ${response.status} - ${errorText}`,
      };
    }

    // n8n typically returns the execution ID in the response
    // The exact format depends on the workflow's response configuration
    const data = await response.json().catch(() => ({}));

    return {
      success: true,
      webhookUrl,
      executionId: data.executionId || data.id || undefined,
    };
  } catch (error) {
    return {
      success: false,
      webhookUrl,
      error: error instanceof Error ? error.message : "Unknown error triggering n8n webhook",
    };
  }
}

/**
 * Trigger the Youtube Video workflow.
 * This workflow generates longer-form YouTube content with AI script generation.
 *
 * @param payload - Transformed wizard data
 * @param options - Optional configuration
 * @returns Webhook response with execution ID
 */
export async function triggerYoutubeVideo(
  payload: N8nTourVideoPayload,
  options?: { isTest?: boolean }
): Promise<N8nWebhookResponse> {
  const webhookUrl = buildWebhookUrl("youtubeVideo", options?.isTest);

  // Youtube Video workflow expects payload wrapped in array
  const wrappedPayload = [payload];

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wrappedPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        webhookUrl,
        error: `n8n webhook failed: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json().catch(() => ({}));

    return {
      success: true,
      webhookUrl,
      executionId: data.executionId || data.id || undefined,
    };
  } catch (error) {
    return {
      success: false,
      webhookUrl,
      error: error instanceof Error ? error.message : "Unknown error triggering n8n webhook",
    };
  }
}

/**
 * Check if n8n is reachable.
 * Useful for health checks before attempting video generation.
 */
export async function checkN8nHealth(): Promise<boolean> {
  const baseUrl = getN8nBaseUrl();

  try {
    const response = await fetch(`${baseUrl}/healthz`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
