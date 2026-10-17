import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-3xl text-center", className)}>
      <p className="text-sm font-bold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-[1.75rem] leading-tight font-extrabold tracking-tight text-balance text-slate-900 sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-relaxed text-pretty text-slate-600 sm:text-lg">{description}</p>}
    </div>
  );
}
