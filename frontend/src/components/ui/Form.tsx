import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full px-4 py-2 border rounded-lg transition-colors",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500",
            "focus:outline-none focus:ring-2",
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helperText && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={clsx(
            "w-full px-4 py-2 border rounded-lg transition-colors resize-vertical",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500",
            "focus:outline-none focus:ring-2",
            className,
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helperText && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            "w-full px-4 py-2 border rounded-lg transition-colors",
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500",
            "focus:outline-none focus:ring-2",
            className,
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
