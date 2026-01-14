"use client";

import { useVideoStatusSubscription } from "@/hooks/useVideoStatusSubscription";

interface VideoStatusProviderProps {
  userId: string;
  children: React.ReactNode;
}

/**
 * Client component that subscribes to video status updates.
 * Must be used within a client component context.
 *
 * Wraps children and provides realtime video status notifications.
 */
export function VideoStatusProvider({
  userId,
  children,
}: VideoStatusProviderProps) {
  // Subscribe to video status changes for this user
  useVideoStatusSubscription(userId);

  // Just render children - the hook handles notifications internally
  return <>{children}</>;
}
