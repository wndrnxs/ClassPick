import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** 접근성과 모바일 호환성을 위해 네이티브 select를 스타일링해 사용합니다. */
function NativeSelect({
  className,
  wrapperClassName,
  children,
  ...props
}: React.ComponentProps<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(
          "flex h-10 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background py-2 pr-9 pl-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
