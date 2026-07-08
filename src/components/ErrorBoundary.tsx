import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
          <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          An unexpected error occurred. Reloading the page usually fixes it.
        </p>

        <Button
          variant="outline"
          className="mt-8 gap-2"
          onClick={() => window.location.reload()}
          type="button"
        >
          <RotateCcw className="h-4 w-4" />
          Reload
        </Button>
      </div>
    );
  }
}
