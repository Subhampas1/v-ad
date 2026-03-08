import React, { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X } from "lucide-react";
import clsx from "clsx";

interface FileUploadProps {
  onFile: (file: File) => Promise<void>;
  accept?: Record<string, string[]>;
  maxSize?: number;
  isLoading?: boolean;
  preview?: string;
  fileName?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFile,
  accept = { "image/*": [".jpg", ".jpeg", ".png", ".webp"] },
  maxSize = 10 * 1024 * 1024,
  isLoading = false,
  preview,
  fileName,
}) => {
  const [error, setError] = React.useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        setError("File not accepted");
        return;
      }

      const file = acceptedFiles[0];

      if (file.size > maxSize) {
        setError(`File size should be less than ${maxSize / (1024 * 1024)}MB`);
        return;
      }

      try {
        setError(null);
        await onFile(file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    },
    [onFile, maxSize],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    disabled: isLoading,
    multiple: false,
  });

  return (
    <div className="w-full">
      {preview ? (
        <div className="relative w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
          />
          <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-white px-2 py-1 rounded text-xs">
            {fileName || "Uploaded"}
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={clsx(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400",
            isLoading && "opacity-50 cursor-not-allowed",
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-700 font-medium">
            Drop your file here or click to select
          </p>
          <p className="text-sm text-gray-500 mt-1">
            JPG, PNG, or WebP up to 10MB
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
