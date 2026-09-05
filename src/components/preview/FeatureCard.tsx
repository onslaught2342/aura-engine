import { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  className?: string;
  configPath?: string;
}

export const FeatureCard = ({ title, children, className = "", configPath }: Props) => (
  <div className={`group flex flex-col items-center gap-2 ${className}`}>
    <div className="relative w-[200px] h-[140px] overflow-hidden rounded-xl border border-border/20 bg-background/10 backdrop-blur-sm shadow-lg transition-transform duration-200 group-hover:scale-105 group-hover:border-primary/40 flex items-center justify-center">
      {children}
      {configPath && (
        <div className="absolute inset-0 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <span className="mb-1.5 px-2 py-0.5 rounded bg-background/80 backdrop-blur-sm text-[9px] font-mono text-primary/90 border border-primary/20 max-w-[190px] truncate">
            {configPath}
          </span>
        </div>
      )}
    </div>
    <span className="text-xs font-medium text-foreground/80 tracking-wide text-center">{title}</span>
  </div>
);
