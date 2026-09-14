import type { LabelHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  children,
  required,
  className,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        "block text-[10.5px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5",
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-400 ml-0.5 normal-case tracking-normal">
          *
        </span>
      )}
    </label>
  );
}
