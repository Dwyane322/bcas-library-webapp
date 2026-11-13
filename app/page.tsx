"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { login } from "@/app/auth/actions";
import { useRouter } from "next/navigation";
import { clearLastActivity, LOGOUT_REASON_KEY } from "@/hooks/use-idle-logout";
import campusPhoto from "@/public/images/bcas-campus.jpg";

export default function BCASLibraryLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loggedOutForIdle = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return sessionStorage.getItem(LOGOUT_REASON_KEY) === "idle";
      } catch {
        return false;
      }
    },
    () => false
  );
  const [idleNoticeDismissed, setIdleNoticeDismissed] = useState(false);
  const idleNotice =
    loggedOutForIdle && !idleNoticeDismissed && !error
      ? "You were logged out due to inactivity. Please sign in again."
      : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIdleNoticeDismissed(true);
    try {
      sessionStorage.removeItem(LOGOUT_REASON_KEY);
    } catch {}
    setLoading(true);
    try {
      const result = await login(staffId, password);
      if (result.success) {
        clearLastActivity();
        router.push("/user");
      } else {
        setError(result.error ?? "Login failed.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative isolate min-h-dvh w-full flex items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* Full-bleed campus photo behind everything */}
      <Image
        src={campusPhoto}
        alt=""
        fill
        sizes="100vw"
        preload
        placeholder="blur"
        className="object-cover -z-20"
      />
      {/* Dark gradient keeps the glass card readable over any part of the photo */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950/70 via-slate-900/50 to-emerald-950/60" />

      <div className="animate-fade-in-up w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-6 sm:p-8 shadow-2xl shadow-black/40 backdrop-blur-xl backdrop-saturate-150">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          BCAS Library
        </h1>
        <p className="text-white/70 mt-1 mb-6 text-sm">
          Sign in to manage library resources.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="staffId"
              className="block text-sm font-medium text-white/90 mb-1.5"
            >
              Staff ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                id="staffId"
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="Enter your staff ID"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-white/25 bg-white/10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/90 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-white/25 bg-white/10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 focus:bg-white/15 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm text-red-100">
              {error}
            </div>
          )}
          {idleNotice && (
            <div className="rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-2 text-sm text-amber-100">
              {idleNotice}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
