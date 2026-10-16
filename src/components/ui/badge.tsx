import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        soft: "border-blue-200/70 bg-secondary text-secondary-foreground",
        outline: "border-border bg-background text-foreground",
        emerald: "border-emerald-200 bg-emerald-soft text-emerald-700",
        amber: "border-amber-200 bg-amber-soft text-amber-700",
        muted: "border-transparent bg-muted text-muted-foreground",
        destructive: "border-red-200 bg-red-50 text-red-700",
      },
    },
    defaultVariants: { variant: "soft" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
