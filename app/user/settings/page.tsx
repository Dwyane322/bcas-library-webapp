"use client";

import { useState, useEffect } from "react";
import { DollarSign, Calendar, Users, Plus, Trash2, KeyRound } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Modal, { ConfirmModal } from "@/components/ui/modal";
import { getFineSettings, updateFineSettings } from "@/lib/supabase/fines";
import { getSchoolYears, createSchoolYear, setActiveSchoolYear, deleteSchoolYear } from "@/lib/supabase/school-years";
import { getStaff, createStaff, updateStaff, deleteStaff, setStaffPassword } from "@/lib/supabase/staff";
import { getSession } from "@/app/auth/actions";
import type { FineSetting, SchoolYear, Staff, StaffRole } from "@/lib/types";

export default function SettingsPage() {
  const [session, setSession] = useState<{ role: StaffRole } | null>(null);
  const [activeTab, setActiveTab] = useState<"fines" | "school-years" | "staff">("fines");

  // Fine settings
  const [fineSettings, setFineSettings] = useState<FineSetting | null>(null);
  const [fineRate, setFineRate] = useState("");
  const [maxFine, setMaxFine] = useState("");
  const [savingFine, setSavingFine] = useState(false);

  // School years
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [newYearName, setNewYearName] = useState("");
  const [newYearStart, setNewYearStart] = useState("");
  const [newYearEnd, setNewYearEnd] = useState("");
  const [showAddYear, setShowAddYear] = useState(false);

  // Staff
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ staff_id: "", name: "", role: "Staff" as StaffRole, password: "" });
  const [passwordStaff, setPasswordStaff] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [yearToDelete, setYearToDelete] = useState<SchoolYear | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  useEffect(() => {
    getSession().then(setSession);
    loadData();
  }, []);

  async function loadData() {
    try {
      const [fine, years, staff] = await Promise.all([
        getFineSettings(),
        getSchoolYears(),
        getStaff(),
      ]);
      setFineSettings(fine);
      setFineRate(fine.fine_rate_per_day.toString());
      setMaxFine(fine.max_fine.toString());
      setSchoolYears(years);
      setStaffList(staff);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  }

  async function handleSaveFine() {
    if (!fineSettings) return;
    setSavingFine(true);
    try {
      await updateFineSettings(fineSettings.id, {
        fine_rate_per_day: parseFloat(fineRate) || 5,
        max_fine: parseFloat(maxFine) || 500,
      });
      await loadData();
    } finally {
      setSavingFine(false);
    }
  }

  async function handleAddYear() {
    if (!newYearName || !newYearStart || !newYearEnd) {
      setModalError("Year name, start date, and end date are required.");
      return;
    }
    setModalBusy(true);
    setModalError(null);
    try {
      await createSchoolYear({
        name: newYearName,
        start_date: newYearStart,
        end_date: newYearEnd,
        is_active: false,
      });
      setNewYearName("");
      setNewYearStart("");
      setNewYearEnd("");
      setShowAddYear(false);
      await loadData();
    } catch {
      setModalError("Failed to add school year. It may already exist.");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleSetActiveYear(id: string) {
    try {
      await setActiveSchoolYear(id);
      await loadData();
    } catch {
      alert("Failed to set active school year.");
    }
  }

  async function handleDeleteYear() {
    if (!yearToDelete) return;
    setModalBusy(true);
    try {
      await deleteSchoolYear(yearToDelete.id);
      setYearToDelete(null);
      await loadData();
    } catch {
      setModalError("Failed to delete school year.");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleAddStaff() {
    if (!newStaff.staff_id || !newStaff.name || !newStaff.password) {
      setModalError("Staff ID, name, and password are required.");
      return;
    }
    setModalBusy(true);
    setModalError(null);
    try {
      const { password, ...staffData } = newStaff;
      const passwordHash = btoa(password);
      await createStaff({ ...staffData, is_active: true, password_hash: passwordHash });
      setNewStaff({ staff_id: "", name: "", role: "Staff", password: "" });
      setShowAddStaff(false);
      await loadData();
    } catch (e: unknown) {
      console.error("Staff creation error:", e);
      setModalError(e instanceof Error ? `Failed to add staff: ${e.message}` : "Failed to add staff.");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleSetPassword() {
    if (!passwordStaff || !newPassword) {
      setModalError("Please enter a new password.");
      return;
    }
    setModalBusy(true);
    setModalError(null);
    try {
      await setStaffPassword(passwordStaff.id, newPassword);
      setPasswordStaff(null);
      setNewPassword("");
    } catch {
      setModalError("Failed to update password.");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDeleteStaff() {
    if (!staffToDelete) return;
    setModalBusy(true);
    try {
      await deleteStaff(staffToDelete.id);
      setStaffToDelete(null);
      await loadData();
    } catch {
      setModalError("Failed to delete staff member.");
    } finally {
      setModalBusy(false);
    }
  }

  const tabs = [
    { id: "fines" as const, label: "Fine Settings", icon: DollarSign },
    { id: "school-years" as const, label: "School Years", icon: Calendar },
    { id: "staff" as const, label: "Staff Management", icon: Users, adminOnly: true },
  ];

  const filteredTabs = tabs.filter(t => !t.adminOnly || session?.role === "Admin");

  return (
    <>
      <PageHeader
        title="Settings"
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {filteredTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Fine Settings Tab */}
      {activeTab === "fines" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Fine Configuration</h3>
          <p className="text-sm text-slate-600 mb-6">
            Configure the fine rate for overdue books. Fines are calculated per day overdue.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fine Rate per Day (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fineRate}
                onChange={(e) => setFineRate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Maximum Fine (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={maxFine}
                onChange={(e) => setMaxFine(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
          <button
            onClick={handleSaveFine}
            disabled={savingFine}
            className="mt-6 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
          >
            {savingFine ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}

      {/* School Years Tab */}
      {activeTab === "school-years" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">School Years</h3>
            <button
              onClick={() => { setModalError(null); setShowAddYear(true); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Year
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Manage school years for archiving circulation records. Only one year can be active at a time.
          </p>

          {/* Years List */}
          <div className="space-y-2">
            {schoolYears.map((year) => (
              <div
                key={year.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  year.is_active ? "border-emerald-300 bg-emerald-50" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="font-medium text-slate-800">{year.name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {year.is_active ? (
                    <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                      Active
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetActiveYear(year.id)}
                      className="px-2 py-1 rounded text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Set Active
                    </button>
                  )}
                  {!year.is_active && (
                    <button
                      onClick={() => { setModalError(null); setYearToDelete(year); }}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {schoolYears.length === 0 && (
              <p className="text-center text-slate-400 py-8">No school years configured.</p>
            )}
          </div>
        </div>
      )}

      {/* Staff Management Tab */}
      {activeTab === "staff" && session?.role === "Admin" && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Staff Management</h3>
            <button
              onClick={() => { setModalError(null); setShowAddStaff(true); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Manage staff accounts and their access levels.
          </p>

          {/* Staff List */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Staff ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-800">{staff.staff_id}</td>
                    <td className="px-4 py-3 text-slate-800">{staff.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        staff.role === "Admin" ? "bg-purple-100 text-purple-700" :
                        staff.role === "Librarian" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${
                        staff.is_active ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${staff.is_active ? "bg-emerald-500" : "bg-slate-300"}`} />
                        {staff.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setModalError(null); setNewPassword(""); setPasswordStaff(staff); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Set Password
                          </button>
                          <button
                            onClick={() => { setModalError(null); setStaffToDelete(staff); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {staffList.length === 0 && (
              <p className="text-center text-slate-400 py-8">No staff members configured.</p>
            )}
          </div>
        </div>
      )}

      {/* Add School Year Modal */}
      <Modal
        open={showAddYear}
        onClose={() => setShowAddYear(false)}
        title="Add School Year"
        subtitle="Create a new school year record."
        footer={
          <>
            <button onClick={() => setShowAddYear(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleAddYear} disabled={modalBusy} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50">{modalBusy ? "Saving..." : "Save"}</button>
          </>
        }
      >
        <div className="space-y-4">
          {modalError && showAddYear && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{modalError}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Year Name</label>
            <input type="text" placeholder="e.g., 2026-2027" value={newYearName} onChange={(e) => setNewYearName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={newYearStart} onChange={(e) => setNewYearStart(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" value={newYearEnd} onChange={(e) => setNewYearEnd(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Add Staff Modal */}
      <Modal
        open={showAddStaff}
        onClose={() => setShowAddStaff(false)}
        title="Add Staff"
        subtitle="Create a new staff account."
        footer={
          <>
            <button onClick={() => setShowAddStaff(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleAddStaff} disabled={modalBusy} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50">{modalBusy ? "Saving..." : "Save"}</button>
          </>
        }
      >
        <div className="space-y-4">
          {modalError && showAddStaff && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{modalError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Staff ID</label>
              <input type="text" placeholder="e.g., STAFF001" value={newStaff.staff_id} onChange={(e) => setNewStaff({ ...newStaff, staff_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" placeholder="Full name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" placeholder="Enter password" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <select value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as StaffRole })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="Staff">Staff</option>
                <option value="Librarian">Librarian</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Set Password Modal */}
      <Modal
        open={!!passwordStaff}
        onClose={() => { setPasswordStaff(null); setNewPassword(""); setModalError(null); }}
        title="Set Password"
        subtitle={passwordStaff ? `Update password for ${passwordStaff.name} (${passwordStaff.staff_id})` : undefined}
        size="sm"
        footer={
          <>
            <button onClick={() => { setPasswordStaff(null); setNewPassword(""); }} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleSetPassword} disabled={modalBusy} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50">{modalBusy ? "Saving..." : "Update"}</button>
          </>
        }
      >
        {modalError && passwordStaff && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{modalError}</div>}
        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
        <input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
      </Modal>

      <ConfirmModal
        open={!!yearToDelete}
        onClose={() => setYearToDelete(null)}
        onConfirm={handleDeleteYear}
        title="Delete School Year"
        message={yearToDelete ? `Delete school year "${yearToDelete.name}"? This cannot be undone.` : ""}
        confirming={modalBusy}
      />
      <ConfirmModal
        open={!!staffToDelete}
        onClose={() => setStaffToDelete(null)}
        onConfirm={handleDeleteStaff}
        title="Delete Staff"
        message={staffToDelete ? `Delete staff "${staffToDelete.name}" (${staffToDelete.staff_id})? This cannot be undone.` : ""}
        confirming={modalBusy}
      />
    </>
  );
}
