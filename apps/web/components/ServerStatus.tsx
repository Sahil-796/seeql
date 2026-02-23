"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";

type Status = "checking" | "online" | "offline";

const POLL_INTERVAL = 10_000;
const INITIAL_DELAY = 500;

type ServerStatusContextType = {
  status: Status;
  isServerOnline: boolean;
};

const ServerStatusContext = createContext<ServerStatusContextType>({
  status: "checking",
  isServerOnline: false,
});

export function useServerStatus() {
  return useContext(ServerStatusContext);
}

export function ServerStatusProvider({
  children,
}: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [coldStartElapsed, setColdStartElapsed] = useState(0);
  const coldStartTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingStartTime = useRef<number>(Date.now());

  const check = useCallback(async () => {
    try {
      await api.health();
      setStatus("online");
      setLastChecked(new Date());
      checkingStartTime.current = 0;
      setColdStartElapsed(0);
    } catch {
      setStatus("offline");
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(check, INITIAL_DELAY);
    const pollTimer = setInterval(check, POLL_INTERVAL);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
    };
  }, [check]);

  useEffect(() => {
    if (status === "checking" || status === "offline") {
      if (!checkingStartTime.current) {
        checkingStartTime.current = Date.now();
      }
      coldStartTimer.current = setInterval(() => {
        if (checkingStartTime.current) {
          setColdStartElapsed(
            Math.floor((Date.now() - checkingStartTime.current) / 1000),
          );
        }
      }, 1000);
    } else {
      if (coldStartTimer.current) {
        clearInterval(coldStartTimer.current);
        coldStartTimer.current = null;
      }
    }

    return () => {
      if (coldStartTimer.current) {
        clearInterval(coldStartTimer.current);
      }
    };
  }, [status]);

  const config = {
    checking: {
      bg: "bg-amber-500/10 border-amber-500/20",
      dot: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      label: "Container starting...",
      tooltipTitle: "Container Cold Start",
      tooltipBody:
        "The server runs on Azure Container Apps with scale-to-zero. It may take 15-30 seconds to wake up on the first request.",
    },
    offline: {
      bg: "bg-amber-500/10 border-amber-500/20",
      dot: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      label: "Container starting...",
      tooltipTitle: "Container Cold Start",
      tooltipBody:
        "The server is waking up from scale-to-zero. This usually takes 15-30 seconds. Hang tight!",
    },
    online: {
      bg: "bg-emerald-500/10 border-emerald-500/20",
      dot: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
      label: "Server online",
      tooltipTitle: "Server Online",
      tooltipBody:
        "The backend is healthy and responding. Queries will execute normally.",
    },
  } as const;

  const c = config[status];

  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (status === "online") {
      const timer = setTimeout(() => {
        setHiding(true);
        const removeTimer = setTimeout(() => setVisible(false), 500);
        return () => clearTimeout(removeTimer);
      }, 2000);
      return () => clearTimeout(timer);
    }
    setVisible(true);
    setHiding(false);
  }, [status]);

  return (
    <ServerStatusContext value={{ status, isServerOnline: status === "online" }}>
      {visible && (
        <div
          className={`
            w-full border-b transition-all duration-500
            ${c.bg}
            ${hiding ? "opacity-0 max-h-0 border-b-0 overflow-hidden" : "opacity-100 max-h-12"}
          `}
        >
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex items-center gap-2 cursor-default ${c.text}`}
                >
                  <span className="relative flex h-2 w-2">
                    {status !== "online" && (
                      <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${c.dot}`}
                      />
                    )}
                    <span
                      className={`relative inline-flex h-2 w-2 rounded-full ${c.dot}`}
                    />
                  </span>
                  <span>
                    {c.label}
                    {status !== "online" && coldStartElapsed > 0 && (
                      <span className="ml-1 tabular-nums">
                        ({coldStartElapsed}s)
                      </span>
                    )}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-xs bg-popover text-popover-foreground border shadow-md"
              >
                <div className="space-y-1 py-1">
                  <p className="font-semibold text-xs">{c.tooltipTitle}</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {c.tooltipBody}
                  </p>
                  {lastChecked && (
                    <p className="text-[10px] text-muted-foreground/70 pt-0.5">
                      Last checked: {lastChecked.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
      {children}
    </ServerStatusContext>
  );
}
