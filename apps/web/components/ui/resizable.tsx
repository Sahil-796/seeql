"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ResizablePrimitive.PanelGroup;

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  className,
  withHandle,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "relative flex w-full items-center justify-center bg-[#111]",
      "after:absolute after:left-0 after:top-1/2 after:h-0.5 after:w-full after:-translate-y-1/2 after:bg-[#333]",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-6 w-8 items-center justify-center rounded border border-[#333] bg-[#0a0a0a]">
        <GripVertical className="h-3.5 w-3.5 text-[#39ff14]" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
