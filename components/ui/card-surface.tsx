import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const CardSurface = React.forwardRef<HTMLDivElement, CardSurfaceProps>(
  ({ className, hover = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-3xl border border-white/10 bg-white/5 p-3 shadow-none backdrop-blur-lg transition-shadow duration-75",
          hover && "hover:shadow-glow-accent",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardSurface.displayName = "CardSurface";
