import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_rgb(37_99_235/0.55)] hover:bg-primary-deep",
        gradient:
          "bg-gradient-to-r from-primary to-primary-deep text-primary-foreground shadow-[0_10px_24px_-10px_rgb(37_99_235/0.7)] hover:brightness-110",
        secondary: "bg-secondary text-secondary-foreground hover:bg-blue-100",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
        ghost: "hover:bg-muted text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-red-700",
        emerald: "bg-emerald text-white hover:bg-emerald-600",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        xl: "h-14 rounded-xl px-7 text-base sm:text-lg",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
