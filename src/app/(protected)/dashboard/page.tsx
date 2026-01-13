import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Dashboard page - Shell for authenticated users.
 * This is a placeholder; actual dashboard content will be built in Phase 4.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold">
          Welcome, {user?.email?.split("@")[0] || "Agent"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Your luxury real estate video dashboard
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Videos</CardTitle>
          <CardDescription>
            Create stunning narrated property tours from your listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <svg
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <p className="text-muted-foreground">
              Your videos will appear here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first video to get started
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
