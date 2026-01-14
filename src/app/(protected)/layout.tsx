import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/nav/user-nav";
import { VideoStatusProvider } from "@/components/providers/VideoStatusProvider";

/**
 * Protected layout - Shared layout for authenticated pages.
 * Fetches user session and includes header with user navigation.
 */
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // This should not happen due to middleware, but extra safety
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-heading text-xl font-semibold text-primary">
              EdgeAI Video Suite
            </span>
          </Link>
          <UserNav email={user.email || "User"} />
        </div>
      </header>

      {/* Main content with video status notifications */}
      <VideoStatusProvider userId={user.id}>
        <main className="flex-1">
          <div className="container py-8">{children}</div>
        </main>
      </VideoStatusProvider>
    </div>
  );
}
