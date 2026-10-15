"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, Download, ExternalLink, ChevronDown } from "lucide-react";
import { generateGoogleCalendarUrl, downloadIcsFile, CalendarEventData } from "@/lib/calendar";

interface AddToCalendarButtonProps {
  event: CalendarEventData;
  size?: "sm" | "md";
  variant?: "outline" | "subtle" | "primary";
  showLabel?: boolean;
}

export function AddToCalendarButton({
  event,
  size = "sm",
  variant = "outline",
  showLabel = true,
}: AddToCalendarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const googleUrl = generateGoogleCalendarUrl(event);

  const handleDownloadIcs = () => {
    if (event.id) {
      // Direct backend API endpoint
      window.open(`/api/reservations/${event.id}/ics`, "_blank");
    } else {
      // Client-side RFC 5545 generator fallback
      downloadIcsFile(event);
    }
    setIsOpen(false);
  };

  const isSmall = size === "sm";

  const getButtonStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-900/30";
      case "subtle":
        return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60";
      case "outline":
      default:
        return "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 rounded-xl font-medium transition-all cursor-pointer ${
          isSmall ? "px-2.5 py-1 text-xs" : "px-3.5 py-2 text-sm"
        } ${getButtonStyles()}`}
        title="Add reservation to Calendar (Google, Outlook, Apple)"
      >
        <Calendar
          className={
            isSmall
              ? "h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400"
              : "h-4 w-4 text-emerald-500 dark:text-emerald-400"
          }
        />
        {showLabel && <span>Add to Calendar</span>}
        <ChevronDown
          className={`h-3 w-3 opacity-60 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-56 origin-top-right rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Export Event
          </div>

          {/* Google Calendar Link */}
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">🗓️</span>
              <span>Google Calendar</span>
            </span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
          </a>

          {/* RFC 5545 .ics Download for Apple & Outlook */}
          <button
            type="button"
            onClick={handleDownloadIcs}
            className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white transition-colors text-left cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">📥</span>
              <span>Download .ics (Outlook / Apple)</span>
            </span>
            <Download className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Direct inline 2-button row component for Confirmation Screens
 */
export function AddToCalendarActionGroup({
  event,
  className = "",
}: {
  event: CalendarEventData;
  className?: string;
}) {
  const googleUrl = generateGoogleCalendarUrl(event);

  const handleDownloadIcs = () => {
    if (event.id) {
      window.open(`/api/reservations/${event.id}/ics`, "_blank");
    } else {
      downloadIcsFile(event);
    }
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full ${className}`}>
      {/* 🗓️ Add to Google Calendar */}
      <a
        href={googleUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer"
      >
        <span className="text-base leading-none">🗓️</span>
        <span>Add to Google Calendar</span>
        <ExternalLink className="h-3.5 w-3.5 text-zinc-400 ml-auto" />
      </a>

      {/* 📥 Download .ics (Outlook / Apple) */}
      <button
        type="button"
        onClick={handleDownloadIcs}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-zinc-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 cursor-pointer text-left"
      >
        <span className="text-base leading-none">📥</span>
        <span>Download .ics (Outlook/Apple)</span>
        <Download className="h-3.5 w-3.5 text-zinc-400 ml-auto" />
      </button>
    </div>
  );
}
