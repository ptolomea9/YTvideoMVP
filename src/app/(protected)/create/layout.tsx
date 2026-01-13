import { WizardProvider } from "@/lib/wizard/wizard-context";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Create Wizard Layout - Wraps the wizard with provider and styling.
 *
 * Features:
 * - WizardProvider for state management
 * - Centered container (max-w-4xl)
 * - Card wrapper with luxury styling
 */
export default function CreateWizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-4xl">
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardContent className="p-8">
          <WizardProvider>{children}</WizardProvider>
        </CardContent>
      </Card>
    </div>
  );
}
