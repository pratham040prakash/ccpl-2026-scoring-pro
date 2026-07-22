import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** default max-w-7xl */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** extra bottom padding for mobile bottom nav */
  padBottom?: boolean;
}

const SIZES = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-[1600px]",
};

export function PageContainer({
  children,
  className,
  size = "xl",
  padBottom = true,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        SIZES[size],
        padBottom && "pb-6 md:pb-10",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 md:mb-8">
      <div className="min-w-0">
        {badge}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
