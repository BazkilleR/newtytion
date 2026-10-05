import { LoaderCircle } from "lucide-react";

export function FullPageSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoaderCircle className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
