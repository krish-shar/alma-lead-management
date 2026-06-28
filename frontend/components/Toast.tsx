"use client";

import { useCallback, useRef, useState } from "react";

// A small bottom-center confirmation toast (e.g. "Marked as reached out.").

export function useToast() {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, ms = 2600) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), ms);
  }, []);

  return { toast, showToast };
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-toast fixed bottom-[26px] left-1/2 z-[80] flex -translate-x-1/2 items-center gap-[10px] rounded-[11px] bg-ink px-[18px] py-3 text-sm font-medium text-canvas shadow-[0_12px_30px_-10px_rgba(28,24,20,0.5)]"
    >
      <span className="inline-flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-accent">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2.5 6.2l2.2 2.2 4.8-5"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {message}
    </div>
  );
}
