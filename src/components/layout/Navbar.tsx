"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Waves,
  Layers,
  CalendarDays,
  BookmarkCheck,
  ShieldAlert,
  LogIn,
  LayoutDashboard,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Resources", href: "/resources", icon: Layers },
    ...(isAdmin ? [{ label: "Team Schedule", href: "/reservations", icon: CalendarDays }] : []),
    { label: "My Bookings", href: "/my-reservations", icon: BookmarkCheck },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-950/50 group-hover:shadow-emerald-500/20 transition-all duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Waves className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">
                PrimeWave
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Lab
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
              Resource Hub
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-800/90 text-white shadow-sm border border-slate-700/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-emerald-400" : "text-slate-400"
                  }`}
                />
                {item.label}
              </Link>
            );
          })}

          {/* Admin console link */}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname.startsWith("/admin")
                  ? "bg-purple-950/60 text-purple-200 border border-purple-800/60 shadow-sm"
                  : "text-slate-400 hover:text-purple-300 hover:bg-purple-950/30"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Admin Hub
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            </Link>
          )}
        </nav>

        {/* User Profile / Auth State */}
        <div className="flex items-center gap-3">
          {session?.user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs font-semibold text-white">
                    {session.user.name}
                  </span>
                  <Badge
                    variant={isAdmin ? "purple" : "success"}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {session.user.role}
                  </Badge>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  {session.user.department || session.user.email}
                </span>
              </div>

              {/* Avatar */}
              <div className="h-9 w-9 rounded-full ring-2 ring-emerald-500/40 overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                {session.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.avatarUrl}
                    alt={session.user.name || "User"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (session.user.name || "U")[0].toUpperCase()
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950/50"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/60 bg-slate-950/95 px-2 py-2 text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
                isActive ? "text-emerald-400 font-semibold" : "text-slate-400"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
              pathname.startsWith("/admin")
                ? "text-purple-400 font-semibold"
                : "text-slate-400"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Admin</span>
          </Link>
        )}
      </div>
    </header>
  );
}
