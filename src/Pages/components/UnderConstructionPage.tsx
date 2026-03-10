// src/pages/UnderConstructionPage.tsx
import { HardHat, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UnderConstructionPageProps {
  title?: string;
  description?: string;
}

export default function UnderConstructionPage({
  title = "Under Construction",
  description = "This page is currently being built. Check back soon.",
}: UnderConstructionPageProps) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-4">
      {/* Icon */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <HardHat className="h-12 w-12 text-muted-foreground" />
      </div>

      {/* Text */}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        {description}
      </p>

      {/* Animated progress bar */}
      <div className="mt-8 w-64 overflow-hidden rounded-full bg-muted h-2">
        <div className="h-full w-1/2 rounded-full bg-primary animate-[slide_2s_ease-in-out_infinite]" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Work in progress…</p>

      {/* Back button */}
      <Button
        variant="outline"
        className="mt-8 gap-2"
        onClick={() => navigate(-1)}
        type="button"
      >
        <ArrowLeft className="h-4 w-4" />
        Go Back
      </Button>
    </div>
  );
}
