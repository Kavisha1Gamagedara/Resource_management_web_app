import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "PrimeWave Lab | Resource Reservation Management System",
  description:
    "Enterprise resource reservation management system with real-time visual scheduling, atomic conflict prevention, and role-based access control.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('primewave-theme');
                  var isDark = stored ? stored === 'dark' : false;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#0b0f17] dark:text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-700 dark:selection:text-emerald-200 transition-colors duration-200"
      >
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8">
              {children}
            </main>
            <footer className="border-t border-slate-200 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/70 py-6 text-center text-xs text-slate-600 dark:text-slate-500 transition-colors">
              <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p>
                  © 2026 PrimeWave Lab (Pvt) Ltd · Resource Reservation Management System
                </p>
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    ACID Overlap Guard Active
                  </span>
                  <span>PostgreSQL 18</span>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
