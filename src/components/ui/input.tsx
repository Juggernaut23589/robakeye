import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        className={cn(
          "rounded-rk-md border border-rk-n200 bg-white px-3 py-2.5 text-sm text-rk-ink placeholder:text-rk-n400",
          "focus:border-rk-blue focus:outline focus:outline-3 focus:outline-rk-blue/20",
          "disabled:cursor-not-allowed disabled:bg-rk-n50 disabled:text-rk-n400",
          error && "border-rk-alert focus:border-rk-alert focus:outline-rk-alert/20",
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {error && <span className="text-xs text-rk-alert">{error}</span>}
    </div>
  ),
);
Input.displayName = "Input";
