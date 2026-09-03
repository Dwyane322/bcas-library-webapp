"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  HelpCircle,
  LogOut,
  Settings,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  Menu,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { logout } from "@/app/auth/actions";

const sidebarNav = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/user" },
  { label: "Circulation", icon: ArrowLeftRight, href: "/user/scan" },
  { label: "Books", icon: BookOpen, href: "/user/books" },
  { label: "Transactions", icon: ClipboardList, href: "/user/transactions" },
  { label: "Reports", icon: BarChart3, href: "/user/reports" },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-emerald-800 text-white transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:flex lg:flex-col shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-emerald-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-800" />
              </div>
              <div>
                <h1 className="font-bold text-sm leading-tight">BCAS Library</h1>
                <p className="text-xs text-emerald-200">Management System</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-emerald-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {sidebarNav.map((item) => {
            const isActive = item.href === "/user"
              ? pathname === "/user"
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-900 text-white"
                    : "text-emerald-100 hover:bg-emerald-700"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-emerald-700 space-y-1">
          <Link
            href="/user/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/user/settings"
                ? "bg-emerald-900 text-white"
                : "text-emerald-100 hover:bg-emerald-700"
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-emerald-700 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button className="text-slate-500 hover:text-slate-700 hidden sm:block">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
