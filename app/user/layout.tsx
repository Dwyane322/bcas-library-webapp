"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  Settings,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  BarChart3,
  Menu,
  X,
  ArrowLeftRight,
  Upload,
  User,
  Archive,
  ScrollText,
} from "lucide-react";
import { logout, getSession } from "@/app/auth/actions";
import type { SessionData } from "@/app/auth/actions";
import {
  getNotificationsWithDetails,
  markNotificationRead,
} from "@/lib/supabase";
import type { NotificationWithDetails } from "@/lib/types";
import { ConfirmModal } from "@/components/ui/modal";
import {
  useIdleLogout,
  clearLastActivity,
  LOGOUT_REASON_KEY,
} from "@/hooks/use-idle-logout";

const sidebarNav: {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
  adminOnly?: boolean;
  hideForStaff?: boolean;
}[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/user" },
  { label: "Circulation", icon: ArrowLeftRight, href: "/user/scan" },
  { label: "Books", icon: BookOpen, href: "/user/books" },
  { label: "Transactions", icon: ClipboardList, href: "/user/transactions" },
  { label: "Reports", icon: BarChart3, href: "/user/reports" },
  { label: "Activity Logs", icon: ScrollText, href: "/user/logs" },
  { label: "Archive", icon: Archive, href: "/user/archive" },
  { label: "Import", icon: Upload, href: "/user/import", hideForStaff: true },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<SessionData | null>(null);
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSession().then(setSession);
  }, []);

  useEffect(() => {
    getNotificationsWithDetails()
      .then((data) => {
        setNotifications(data.slice(0, 5));
        setUnreadCount(data.filter((n) => !n.is_read).length);
      })
      .catch(() => {});
  }, []);

  const handleNotifEnter = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setNotifOpen(true);
  }, []);

  const handleNotifLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => setNotifOpen(false), 200);
  }, []);

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  const handleIdleLogout = useCallback(async () => {
    try {
      sessionStorage.setItem(LOGOUT_REASON_KEY, "idle");
    } catch {}
    clearLastActivity();
    try {
      await logout();
    } finally {
      router.replace("/");
      router.refresh();
    }
  }, [router]);

  useIdleLogout(handleIdleLogout);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      clearLastActivity();
      await logout();
      router.push("/");
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  const filteredNav = sidebarNav.filter(item => {
    if (item.adminOnly && session?.role !== "Admin") {
      return false;
    }
    if (item.hideForStaff && session?.role === "Staff") {
      return false;
    }
    return true;
  });

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-emerald-800 text-white flex flex-col transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-emerald-700 shrink-0">
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

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1 overscroll-contain">
          {filteredNav.map((item) => {
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

        <div className="p-3 border-t border-emerald-700 space-y-1 shrink-0">
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
            onClick={() => setLogoutOpen(true)}
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
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            {session && (
              <div className="flex items-center gap-2 text-sm min-w-0">
                <span className="text-slate-500 shrink-0">Welcome,</span>
                <span className="font-medium text-slate-700 truncate">{session.name}</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium shrink-0">
                  {session.role}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div
              ref={notifRef}
              onMouseEnter={handleNotifEnter}
              onMouseLeave={handleNotifLeave}
              className="relative"
            >
              <button
                onClick={() => router.push("/user/notifications")}
                className="relative text-slate-500 hover:text-slate-700"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold border-2 border-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={async () => {
                          try {
                            const { markAllNotificationsRead } = await import("@/lib/supabase");
                            await markAllNotificationsRead();
                            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
                            setUnreadCount(0);
                          } catch {}
                        }}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No notifications yet.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.is_read) handleMarkRead(n.id);
                          }}
                          className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 transition-colors ${
                            n.is_read
                              ? "bg-white hover:bg-slate-50"
                              : "bg-emerald-50/40 cursor-pointer hover:bg-emerald-50"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              n.is_read ? "bg-slate-100" : "bg-emerald-100"
                            }`}
                          >
                            <Bell
                              className={`w-4 h-4 ${
                                n.is_read ? "text-slate-400" : "text-emerald-600"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-snug ${
                                n.is_read ? "text-slate-600" : "text-slate-800 font-medium"
                              }`}
                            >
                              {n.message}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                              {n.students && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {n.students.name}
                                </span>
                              )}
                              <span>
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <Link
                    href="/user/notifications"
                    className="block text-center px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 border-t border-slate-100 transition-colors"
                  >
                    View More
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>

      <ConfirmModal
        open={logoutOpen}
        onClose={() => !loggingOut && setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Log out?"
        message="Are you sure you want to log out? You'll need to sign in again to continue."
        confirmLabel="Logout"
        confirming={loggingOut}
      />
    </div>
  );
}
