import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { VideoCard } from '@/components/dashboard/VideoCard';
import { Button } from '@/components/ui/button';
import type { VideoWithListing } from '@/types/video';

/**
 * Dashboard page - Video gallery showing user's generated videos.
 * Displays 9:16 cards in responsive grid with status badges.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch user's videos with listing data
  const { data: videos } = await supabase
    .from('videos')
    .select(`
      id,
      listing_id,
      user_id,
      status,
      thumbnail_url,
      branded_url,
      unbranded_url,
      duration_seconds,
      error_message,
      created_at,
      listing:listings!inner (
        address,
        city,
        state
      )
    `)
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false });

  // Transform to match VideoWithListing type
  // Supabase returns listing as object due to !inner join
  const typedVideos: VideoWithListing[] = (videos || []).map((v) => {
    const listing = v.listing as unknown as { address: string; city: string | null; state: string | null };
    return {
      id: v.id,
      listing_id: v.listing_id,
      user_id: v.user_id,
      status: v.status,
      thumbnail_url: v.thumbnail_url,
      branded_url: v.branded_url,
      unbranded_url: v.unbranded_url,
      duration_seconds: v.duration_seconds,
      error_message: v.error_message,
      created_at: v.created_at,
      listing,
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold">
            Your Videos
          </h1>
          <p className="text-muted-foreground mt-1">
            {typedVideos.length > 0
              ? `${typedVideos.length} video${typedVideos.length === 1 ? '' : 's'} in your gallery`
              : 'Create stunning narrated property tours'}
          </p>
        </div>
        <Link href="/create">
          <Button>Create Video</Button>
        </Link>
      </div>

      {/* Video grid or empty state */}
      {typedVideos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {typedVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

/**
 * Empty state shown when user has no videos.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-full bg-muted p-6 mb-6">
        <svg
          className="h-12 w-12 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-xl font-heading font-medium mb-2">
        No videos yet
      </h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Transform your property photos into cinematic narrated tours
      </p>
      <Link href="/create">
        <Button size="lg">Create Your First Video</Button>
      </Link>
    </div>
  );
}
