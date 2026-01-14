"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface VideoRecord {
  id: string;
  status: string;
  error_message: string | null;
  branded_url: string | null;
}

/**
 * Hook that subscribes to video status changes via Supabase Realtime.
 * Shows toast notifications when videos complete or fail.
 *
 * @param userId - The user ID to subscribe to video updates for
 * @returns { isSubscribed } - Whether the subscription is active
 */
export function useVideoStatusSubscription(userId: string | undefined) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    // Subscribe to video updates for this user
    const channel = supabase
      .channel(`videos-${userId}`)
      .on<VideoRecord>(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "videos",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<VideoRecord>) => {
          const newRecord = payload.new as VideoRecord;
          const oldRecord = payload.old as Partial<VideoRecord>;

          // Only react to status changes
          if (newRecord.status === oldRecord.status) return;

          if (newRecord.status === "completed") {
            toast.success("Your video is ready!", {
              description: "Click to view your new video",
              action: {
                label: "View",
                onClick: () => router.push("/dashboard"),
              },
              duration: 10000,
            });
          } else if (newRecord.status === "failed") {
            const errorMessage = newRecord.error_message || "Unknown error";
            toast.error(`Video generation failed: ${errorMessage}`, {
              duration: 10000,
            });
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === "SUBSCRIBED");
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return { isSubscribed };
}
