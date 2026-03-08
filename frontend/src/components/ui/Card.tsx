import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "bg-white rounded-xl border border-gray-200 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  description,
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={clsx("px-6 py-4 border-b border-gray-200", className)}
      {...props}
    >
      {title && (
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      )}
      {description && (
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      )}
      {children}
    </div>
  );
};

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={clsx("px-6 py-4", className)} {...props}>
      {children}
    </div>
  );
};

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "px-6 py-4 border-t border-gray-200 flex gap-3 justify-end",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "error";
}> = ({ children, variant = "primary" }) => {
  const variants = {
    primary: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={clsx(
        "px-3 py-1 rounded-full text-xs font-medium",
        variants[variant],
      )}
    >
      {children}
    </span>
  );
};

export const ProgressBar: React.FC<{
  progress: number;
  animated?: boolean;
}> = ({ progress, animated = true }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={clsx(
          "h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300",
          {
            "animate-pulse-slow": animated && progress < 100,
          },
        )}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
};

export const Spinner: React.FC<{ size?: "sm" | "md" | "lg" }> = ({
  size = "md",
}) => {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={clsx(
        "animate-spin rounded-full border-2 border-blue-300 border-t-blue-600",
        sizes[size],
      )}
    />
  );
};
