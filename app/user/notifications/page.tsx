"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, CheckCheck, BookOpen, User } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import {
  getNotificationsWithDetails,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/supabase";
import type { NotificationWithDetails } from "@/lib/types";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  useEffect(() => {
    async function load() {
      try {
        const data = await getNotificationsWithDetails();
        setNotifications(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.is_read);
    if (filter === "read") return notifications.filter((n) => n.is_read);
    return notifications;
  }, [notifications, filter]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // silent
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        actions={
          unreadCount > 0 ? (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All as Read
            </button>
          ) : null
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(["all", "unread", "read"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === tab
                ? "bg-emerald-100 text-emerald-800"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {filter === "all"
                ? "No notifications yet."
                : `No ${filter} notifications.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                className={`flex items-start gap-3 px-4 sm:px-5 py-4 transition-colors ${
                  notification.is_read
                    ? "bg-white"
                    : "bg-emerald-50/50 cursor-pointer hover:bg-emerald-50"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    notification.is_read
                      ? "bg-slate-100"
                      : "bg-emerald-100"
                  }`}
                >
                  <Bell
                    className={`w-4 h-4 ${
                      notification.is_read
                        ? "text-slate-400"
                        : "text-emerald-600"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      notification.is_read
                        ? "text-slate-600"
                        : "text-slate-800 font-medium"
                    }`}
                  >
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                    {notification.students && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {notification.students.name}
                      </span>
                    )}
                    {notification.books && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {notification.books.title}
                      </span>
                    )}
                    <span>
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {!notification.is_read && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
