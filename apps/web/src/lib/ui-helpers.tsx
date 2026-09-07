import React from "react";

// Empty State Component
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon && <div className="mb-4 text-5xl opacity-30">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Loading State Component
export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground mb-3"></div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// Form Field Wrapper Component
export function FormField({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// Status Badge Component
export function StatusBadge({
  status,
  variant,
}: {
  status: string;
  variant?: "default" | "success" | "warning" | "destructive" | "info";
}) {
  const variantClasses = {
    default: "bg-muted text-foreground",
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    destructive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${variantClasses[variant || "default"]}`}>
      {status}
    </span>
  );
}

// Section Header Component
export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex-1">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Responsive Grid Component
export function ResponsiveGrid({
  children,
  columns = 1,
}: {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
}) {
  const colClasses = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-2 lg:grid-cols-3",
    4: "md:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={`grid ${colClasses[columns]} gap-4`}>{children}</div>;
}

// Success Message Component
export function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
      <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
    </div>
  );
}

// Error Message Component
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
      <p className="text-sm text-red-800 dark:text-red-200">{message}</p>
    </div>
  );
}

// Info Message Component
export function InfoMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
      <p className="text-sm text-blue-800 dark:text-blue-200">{message}</p>
    </div>
  );
}
