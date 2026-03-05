import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 disabled:opacity-40 disabled:pointer-events-none",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" &&
        "bg-amber-600 text-stone-50 hover:bg-amber-500 active:bg-amber-700 shadow-lg shadow-amber-900/30",
        variant === "secondary" &&
        "bg-stone-50 text-stone-800 hover:bg-stone-200 border border-stone-300 hover:border-stone-400",
        variant === "ghost" &&
        "text-stone-400 hover:text-stone-100 hover:bg-stone-800/50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
