import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const glowButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full border backdrop-blur-md text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-white/10 bg-white/5 text-gray-200 hover:shadow-glow-accent hover:-translate-y-0.5 active:bg-white/10",
        success: "border-white/10 bg-white/5 text-gray-200 hover:shadow-glow-success hover:-translate-y-0.5 active:bg-white/10",
        danger: "border-white/10 bg-white/5 text-gray-200 hover:shadow-glow-danger hover:-translate-y-0.5 active:bg-white/10",
      },
      size: {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface GlowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glowButtonVariants> {}

const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(glowButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
GlowButton.displayName = "GlowButton";

export { GlowButton, glowButtonVariants };
