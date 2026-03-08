import React from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

interface AlertProps {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  onClose,
}) => {
  const variants = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: CheckCircle,
      color: "text-green-600",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: AlertCircle,
      color: "text-red-600",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: Info,
      color: "text-blue-600",
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "border rounded-lg p-4 flex gap-3 items-start",
        config.bg,
        config.border,
      )}
    >
      <Icon className={clsx("w-5 h-5 flex-shrink-0 mt-0.5", config.color)} />
      <div className="flex-1">
        {title && <h4 className="font-semibold text-gray-900">{title}</h4>}
        <p className={clsx("text-sm", title ? "mt-1" : "", "text-gray-700")}>
          {message}
        </p>
      </div>
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      )}
    </div>
  );
};
