import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "../button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          className="flex flex-col items-center justify-center h-full p-8 text-center"
          role="alert"
          aria-live="assertive">
          <div className="mb-4 text-destructive">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Что-то пошло не так</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            {this.state.error?.message || "Произошла непредвиденная ошибка"}
          </p>
          <div className="flex gap-2">
            <Button onClick={this.handleReset} variant="default">
              Попробовать снова
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline">
              Перезагрузить страницу
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-left w-full max-w-2xl">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Подробности ошибки (development)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-md overflow-auto text-xs">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
