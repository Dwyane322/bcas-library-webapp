"use client";

import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  HelpCircle,
  GraduationCap,
} from "lucide-react";
import { login } from "@/app/auth/actions";
import { useRouter } from "next/navigation";

export default function BCASLibraryLogin() {
  const [showPassword, setShowPassword] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(staffId, password);
      if (result.success) {
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 border-2 border-emerald-600 flex items-center justify-center">
            <GraduationCap
              className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600"
              strokeWidth={1.75}
            />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-xl sm:text-2xl font-bold text-center text-slate-900">
          BCAS Library
        </h1>
        <p className="text-center text-slate-500 mt-1 mb-6 text-sm">
          Sign in to manage library resources.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Staff ID */}
          <div>
            <label
              htmlFor="staffId"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              Staff ID
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="staffId"
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="Enter your staff ID"
                required
                className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
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
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <div className="mt-6 pt-5 border-t border-slate-200 flex items-center justify-center gap-1.5 text-sm text-slate-600">
          <HelpCircle className="w-4 h-4" />
          <span>Need access?</span>
          <a
            href="#"
            className="font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Contact Administrator
          </a>
        </div>
      </div>
    </div>
  );
}
