import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StubPage({
  title,
  description,
  icon: Icon,
  message,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  message: string;
}) {
  return (
    <AppShell title={title}>
      <PageHeader title={title} description={description} />
      <Card className="border-dashed border-border/70 shadow-none">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Icon className="h-10 w-10 text-muted-foreground" />
          <p className="mt-3 max-w-md text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
