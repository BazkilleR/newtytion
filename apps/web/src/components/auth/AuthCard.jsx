import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";

export function AuthCard({ title, children, footer }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-sm text-muted-foreground">Fitness Log</p>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {children}
          {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
