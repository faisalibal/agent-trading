import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bullish" | "bearish" | "neutral" | "buy" | "sell" | "hold" | "error" | "warn";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    default: "bg-terminal-border text-terminal-text",
    bullish: "bg-terminal-green/15 text-terminal-green border-terminal-green/30",
    bearish: "bg-terminal-red/15 text-terminal-red border-terminal-red/30",
    neutral: "bg-terminal-cyan/15 text-terminal-cyan border-terminal-cyan/30",
    buy: "bg-terminal-green/15 text-terminal-green border-terminal-green/30",
    sell: "bg-terminal-red/15 text-terminal-red border-terminal-red/30",
    hold: "bg-terminal-yellow/15 text-terminal-yellow border-terminal-yellow/30",
    error: "bg-red-500/15 text-red-400 border-red-500/30",
    warn: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-mono uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
