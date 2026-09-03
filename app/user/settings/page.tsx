import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account and application preferences.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-sm text-slate-500">Settings options will appear here.</p>
      </div>
    </>
  );
}
