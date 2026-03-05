import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "muted";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-stone-800 text-stone-200 border border-stone-700",
        variant === "accent" && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
        variant === "muted" && "bg-stone-900/50 text-stone-400 border border-stone-800",
        className
      )}
    >
      {children}
    </span>
  );
}
