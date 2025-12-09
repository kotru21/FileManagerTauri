import { X, Info, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { useToastStore, type ToastType } from "./store";
import { cn } from "@/shared/lib";

const icons: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const styles: Record<ToastType, string> = {
  info: "bg-background border-border text-foreground",
  success:
    "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
  warning:
    "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
  error: "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg",
              "animate-in slide-in-from-right-full fade-in duration-300",
              "min-w-[280px] max-w-[400px]",
              styles[toast.type]
            )}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
