"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Waves,
  Layers,
  CalendarDays,
  BookmarkCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  ChevronDown,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin = session?.user?.role === "ADMIN";

  const navItems = [
    { label: "Home", href: "/", icon: Home },
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
        <div className="flex items-center gap-2.5">
          {session?.user ? (
            <div className="relative" ref={userMenuRef}>
              <div className="flex items-center gap-2">
                {/* Clickable Profile Trigger */}
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all text-left cursor-pointer group"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {session.user.name}
                      </span>
                      <Badge
                        variant={isAdmin ? "purple" : "success"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {session.user.role}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[140px]">
                      {session.user.department || session.user.email}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="h-9 w-9 rounded-full ring-2 ring-emerald-500/40 overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-xs text-white shrink-0 group-hover:ring-emerald-400 transition-all">
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
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform hidden sm:block" />
                </button>

                {/* Direct Prominent Sign Out Button */}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-800/60 transition-all cursor-pointer shadow-sm"
                  title="Sign out of your session"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>

              {/* Profile Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 mb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {session.user.name}
                      </span>
                      <Badge
                        variant={isAdmin ? "purple" : "success"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {session.user.role}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {session.user.email}
                    </p>
                    {session.user.department && (
                      <p className="text-[10px] text-emerald-400 font-medium mt-1">
                        Department: {session.user.department}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Link
                      href="/my-reservations"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                    >
                      <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                      <span>My Bookings</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
                      >
                        <ShieldAlert className="w-4 h-4 text-purple-400" />
                        <span>Admin Hub</span>
                      </Link>
                    )}

                    <div className="my-1 border-t border-slate-800" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
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
        {session?.user ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex flex-col items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="text-[11px]">Sign Out</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="flex flex-col items-center gap-1 px-2 py-1 rounded text-emerald-400"
          >
            <LogIn className="w-4 h-4" />
            <span className="text-[11px]">Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
