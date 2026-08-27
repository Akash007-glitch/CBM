import React from "react";

interface SpinnerProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/**
 * High-performance, GPU-accelerated smooth circular loading spinner.
 * Features a 360° circular track with an opacity-25 background and a
 * high-contrast opacity-90 leading arc, ensuring a complete, buttery-smooth
 * rotation with no half-way visual cutoff or stuttering.
 */
export const Spinner: React.FC<SpinnerProps> = ({
  className = "w-4 h-4 text-current",
  size,
}) => {
  let sizeClass = "";
  if (size === "xs") sizeClass = "w-3 h-3";
  else if (size === "sm") sizeClass = "w-3.5 h-3.5";
  else if (size === "md") sizeClass = "w-4 h-4";
  else if (size === "lg") sizeClass = "w-5 h-5";
  else if (size === "xl") sizeClass = "w-6 h-6";

  return (
    <svg
      className={`animate-spin shrink-0 ${sizeClass} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3.5"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};
