"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  Building2,
  CalendarDays,
  BookmarkCheck,
  LayoutDashboard,
  Menu,
  X,
  Shield,
  ShieldCheck,
  LogOut,
  User,
  ChevronDown,
  LogIn,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navLinks = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/resources", label: "Resources", icon: Building2 },
    { href: "/reservations", label: "Team Schedule", icon: CalendarDays },
    { href: "/my-reservations", label: "My Bookings", icon: BookmarkCheck },
  ];

  const isAdmin = session?.user?.role === "ADMIN";

  const handleQuickSwitch = async (email: string, pass: string) => {
    setUserMenuOpen(false);
    await signIn("credentials", {
      email,
      password: pass,
      redirect: false,
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/90 transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-base">
                  PrimeWave
                </span>
                <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  HUB
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-normal">
                Resource Reservation System
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-teal-700 dark:bg-zinc-900 dark:text-teal-400"
                      : "text-zinc-600 hover:bg-zinc-100/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}

            {/* Admin Dashboard link (Story 1) */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith("/admin")
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300"
                    : "text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/50"
                }`}
              >
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span>Admin Panel</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right Section: Auth & User Profile */}
        <div className="hidden sm:flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-9 w-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ) : session?.user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 rounded-2xl border border-zinc-200/90 bg-white p-1.5 pr-3 shadow-sm hover:border-teal-500/40 dark:border-zinc-800 dark:bg-zinc-900 transition-all"
              >
                {session.user.avatarUrl ? (
                  <img
                    src={session.user.avatarUrl}
                    alt={session.user.name || "User"}
                    className="h-8 w-8 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-xs font-bold">
                    {session.user.name?.charAt(0) || "U"}
                  </div>
                )}

                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-none">
                      {session.user.name}
                    </span>
                    <Badge
                      variant={isAdmin ? "purple" : "success"}
                      size="sm"
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {session.user.role}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-none mt-1">
                    {session.user.department || "PrimeWave Lab"}
                  </p>
                </div>

                <ChevronDown className="h-3.5 w-3.5 text-zinc-400 ml-1" />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 transition-all z-50">
                  <div className="border-b border-zinc-100 p-3 dark:border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {session.user.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 truncate">
                      {session.user.email}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={isAdmin ? "purple" : "success"} size="sm">
                        {isAdmin ? "Administrator" : "Team Member"}
                      </Badge>
                      {session.user.department && (
                        <span className="text-[11px] text-zinc-500">
                          {session.user.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Fast Switch Personas */}
                  <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span>Quick Switch Persona</span>
                    </div>

                    <button
                      onClick={() =>
                        handleQuickSwitch("admin@primewave.com", "admin123")
                      }
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-purple-50 hover:text-purple-700 dark:text-zinc-300 dark:hover:bg-purple-950/50 transition-colors"
                    >
                      <span>Admin User (Full Control)</span>
                      {isAdmin && <CheckCircle2 className="h-3.5 w-3.5 text-purple-600" />}
                    </button>

                    <button
                      onClick={() =>
                        handleQuickSwitch("sarah@primewave.com", "password123")
                      }
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-teal-50 hover:text-teal-700 dark:text-zinc-300 dark:hover:bg-teal-950/50 transition-colors"
                    >
                      <span>Sarah (Engineering User)</span>
                      {session.user.email === "sarah@primewave.com" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        handleQuickSwitch("alex@primewave.com", "password123")
                      }
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-blue-50 hover:text-blue-700 dark:text-zinc-300 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      <span>Alex (Product User)</span>
                      {session.user.email === "alex@primewave.com" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                      )}
                    </button>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-teal-300 transition-colors"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In / Demo</span>
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {mobileMenuOpen && (
        <div className="border-b border-zinc-200 bg-white px-4 pt-2 pb-4 dark:border-zinc-800 dark:bg-zinc-950 sm:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium ${
                    isActive
                      ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium text-purple-700 bg-purple-50 dark:bg-purple-950/50 dark:text-purple-300"
              >
                <Shield className="h-5 w-5" />
                <span>Admin Panel</span>
              </Link>
            )}

            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              {session?.user ? (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-500">
                    Signed in as <strong>{session.user.name}</strong> ({session.user.role})
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex w-full items-center gap-2 rounded-lg py-2 text-sm text-rose-600 font-medium"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
