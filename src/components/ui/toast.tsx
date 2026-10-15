"use client";

import React, { useState, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number; // In ms, default 3000
}

type ToastListener = (toast: ToastItem) => void;

// In-memory event bus for client-side toast triggers
const listeners: Set<ToastListener> = new Set();

const QUEUE_STORAGE_KEY = "primewave_queued_toasts";

/**
 * Dispatch an immediate toast to any mounted ToastContainer
 */
function dispatchToast(type: ToastType, message: string, title?: string, duration: number = 3000) {
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    message,
    title,
    duration,
  };

  if (listeners.size > 0) {
    listeners.forEach((listener) => listener(item));
  } else if (typeof window !== "undefined") {
    // If no listener currently active (e.g. before mount or during navigation), queue in sessionStorage
    try {
      const existing = JSON.parse(sessionStorage.getItem(QUEUE_STORAGE_KEY) || "[]");
      existing.push(item);
      sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // Fallback ignore storage quota errors
    }
  }
}

/**
 * Queue a toast for after a page redirect (e.g. router.push)
 */
function queueToast(type: ToastType, message: string, title?: string, duration: number = 3000) {
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(sessionStorage.getItem(QUEUE_STORAGE_KEY) || "[]");
      existing.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type,
        message,
        title,
        duration,
      });
      sessionStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // Fallback ignore
    }
  }
}

/**
 * Global toast triggers accessible anywhere across the codebase
 */
export const toast = {
  success: (message: string, title?: string, duration: number = 3000) => {
    dispatchToast("success", message, title, duration);
  },
  error: (message: string, title?: string, duration: number = 3000) => {
    dispatchToast("error", message, title, duration);
  },
  info: (message: string, title?: string, duration: number = 3000) => {
    dispatchToast("info", message, title, duration);
  },
  warning: (message: string, title?: string, duration: number = 3000) => {
    dispatchToast("warning", message, title, duration);
  },
  // Persist across page navigations (e.g. router.push)
  queueSuccess: (message: string, title?: string, duration: number = 3000) => {
    queueToast("success", message, title, duration);
  },
  queueError: (message: string, title?: string, duration: number = 3000) => {
    queueToast("error", message, title, duration);
  },
};

/**
 * Individual Toast Component with a 3-second animated countdown bar
 */
function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const duration = item.duration ?? 3000;
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(item.id);
    }, 150);
  }, [item.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, handleDismiss]);

  const config = {
    success: {
      border: "border-emerald-500/50 dark:border-emerald-500/40",
      bg: "bg-white/95 dark:bg-zinc-900/95",
      iconBg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400",
      progressBg: "bg-emerald-500",
      icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
      defaultTitle: "Success",
    },
    error: {
      border: "border-rose-500/50 dark:border-rose-500/40",
      bg: "bg-white/95 dark:bg-zinc-900/95",
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400",
      progressBg: "bg-rose-500",
      icon: <AlertCircle className="w-4 h-4 shrink-0" />,
      defaultTitle: "Action Failed",
    },
    warning: {
      border: "border-amber-500/50 dark:border-amber-500/40",
      bg: "bg-white/95 dark:bg-zinc-900/95",
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400",
      progressBg: "bg-amber-500",
      icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
      defaultTitle: "Warning",
    },
    info: {
      border: "border-blue-500/50 dark:border-blue-500/40",
      bg: "bg-white/95 dark:bg-zinc-900/95",
      iconBg: "bg-blue-100 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400",
      progressBg: "bg-blue-500",
      icon: <Info className="w-4 h-4 shrink-0" />,
      defaultTitle: "Notice",
    },
  }[item.type];

  return (
    <div
      role="alert"
      className={`relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-200 pointer-events-auto ${
        config.bg
      } ${config.border} ${
        isExiting
          ? "opacity-0 translate-y-[-8px] scale-95"
          : "opacity-100 translate-y-0 scale-100 animate-in slide-in-from-top-3 fade-in duration-200"
      }`}
    >
      <div className="flex items-start gap-3 p-3.5 sm:p-4">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${config.iconBg}`}
        >
          {config.icon}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
            <span>{item.title || config.defaultTitle}</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed break-words">
            {item.message}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close notification"
          className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer shrink-0 mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3-Second Visual Progress Indicator Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        <div
          className={`h-full ${config.progressBg} transition-all ease-linear`}
          style={{
            animation: `toastCountdown ${duration}ms linear forwards`,
          }}
        />
      </div>

      <style jsx>{`
        @keyframes toastCountdown {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Toast Container mounted at the root layout
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((item: ToastItem) => {
    setToasts((prev) => [item, ...prev].slice(0, 5)); // Keep up to 5 concurrent toasts
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Subscribe to toast emitter and drain queued toasts from sessionStorage
  useEffect(() => {
    listeners.add(addToast);

    // Drain queued toasts from redirects
    if (typeof window !== "undefined") {
      try {
        const queued = JSON.parse(sessionStorage.getItem(QUEUE_STORAGE_KEY) || "[]");
        if (Array.isArray(queued) && queued.length > 0) {
          sessionStorage.removeItem(QUEUE_STORAGE_KEY);
          queued.forEach((item) => addToast(item));
        }
      } catch {
        // Fallback ignore
      }
    }

    return () => {
      listeners.delete(addToast);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={removeToast} />
      ))}
    </div>
  );
}
