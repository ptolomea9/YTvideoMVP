import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <main className="flex flex-col items-center gap-8 text-center">
        <h1
          className="text-5xl font-semibold tracking-tight text-foreground"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Edge AI Luxury Video Suite
        </h1>
        <p className="text-lg text-muted-foreground">
          Coming soon
        </p>
        <Button variant="default" size="lg">
          Get Started
        </Button>
      </main>
    </div>
  );
}
