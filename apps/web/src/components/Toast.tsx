import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

const CheckIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="20 6 9 17 4 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: {
      bg: "bg-accent/10",
      border: "border-accent/30",
      text: "text-accent",
      icon: "text-accent",
    },
    error: {
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      text: "text-destructive",
      icon: "text-destructive",
    },
    info: {
      bg: "bg-foreground/10",
      border: "border-foreground/30",
      text: "text-foreground",
      icon: "text-foreground",
    },
  };

  const style = styles[toast.type];
  const icons = {
    success: <CheckIcon />,
    error: <ErrorIcon />,
    info: <InfoIcon />,
  };

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2`}>
      <div className={style.icon}>{icons[toast.type]}</div>
      <p className={`text-sm font-medium ${style.text}`}>{toast.message}</p>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-6 right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}
