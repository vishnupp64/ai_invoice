import clsx from "clsx";
import { forwardRef } from "react";
import type React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
};

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <label className="block">
        {label ? <div className="mb-1 text-sm font-medium">{label}</div> : null}
        <input
          ref={ref}
          {...props}
          className={clsx(
            "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900",
            error ? "border-rose-500 ring-rose-500" : "",
            className
          )}
        />
        {error ? <div className="mt-1 text-xs text-rose-600">{error}</div> : null}
      </label>
    );
  }
);

Input.displayName = "Input";

export default Input;