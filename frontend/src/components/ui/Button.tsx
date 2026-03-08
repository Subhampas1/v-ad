import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2";

    const variantStyles = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400",
      secondary:
        "bg-cyan-500 text-white hover:bg-cyan-600 disabled:bg-cyan-400",
      outline:
        "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-50",
      ghost: "text-blue-600 hover:bg-blue-50 disabled:opacity-50",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading && <span className="animate-spin">⌛</span>}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
