"use client";

import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import PageHeader from "@/components/ui/page-header";
import Modal from "@/components/ui/modal";
import { parseCSV, studentToInsert } from "@/utils/csv-parser";
import { upsertStudents } from "@/lib/supabase/students";
import { getSession } from "@/app/auth/actions";
import { STAFF_RESTRICTED_MESSAGE } from "@/lib/permissions";
import type { ParsedStudent } from "@/utils/csv-parser";
import type { StaffRole } from "@/lib/types";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: string[] } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showErrorsModal, setShowErrorsModal] = useState(false);
  const [role, setRole] = useState<StaffRole | null>(null);

  useEffect(() => {
    getSession().then((s) => {
      if (s) setRole(s.role);
    });
  }, []);

  const staffRestricted = role === "Staff";

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setParsedData([]);
    setErrors([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const { data, errors: parseErrors } = parseCSV(content);
      setParsedData(data);
      setErrors(parseErrors);
    };
    reader.readAsText(f);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleImport = async () => {
    if (parsedData.length === 0 || staffRestricted) return;

    setImporting(true);
    try {
      const students = parsedData.map(studentToInsert);
      const importResult = await upsertStudents(students);
      setResult(importResult);
    } catch (e) {
      setResult({
        inserted: 0,
        errors: [e instanceof Error ? e.message : "Import failed"],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setResult(null);
  };

  return (
    <>
      <div className="animate-fade-in-up stagger-1">
        <PageHeader
        title="Import Students from OASIS"
        subtitle="Upload enrollment list in CSV format to bulk import student records."
      />
      </div>

      {staffRestricted && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 animate-fade-in-up stagger-2">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-medium">{STAFF_RESTRICTED_MESSAGE} Bulk import requires a Librarian or Admin.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up stagger-2">
        {/* Upload Area */}
        <div className="lg:col-span-2">
          <div
            className={`bg-white rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragActive ? "border-emerald-500 bg-emerald-50" : "border-slate-300"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-lg font-medium text-slate-700 mb-2">
                {file ? file.name : "Drop CSV file here or click to browse"}
              </p>
              <p className="text-sm text-slate-500">
                Supports CSV files from BCAS OASIS enrollment list
              </p>
            </label>
          </div>

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div className="mt-6 bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">
                  Preview ({parsedData.length} students found)
                </h3>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold text-slate-600">Student #</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-600">Name</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-600">Grade</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-600">Program</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 50).map((student, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-800 font-mono">{student.student_number}</td>
                        <td className="px-4 py-2 text-slate-800">{student.name}</td>
                        <td className="px-4 py-2 text-slate-600">{student.grade_level}</td>
                        <td className="px-4 py-2 text-slate-600">{student.program}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 50 && (
                  <div className="p-3 text-center text-sm text-slate-500">
                    Showing first 50 of {parsedData.length} students
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={importing || parsedData.length === 0 || staffRestricted}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {parsedData.length} Students
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-800 font-medium">{errors.length} parse errors found</span>
              </div>
              <button onClick={() => setShowErrorsModal(true)} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors">View Errors</button>
            </div>
          )}
        </div>

        {/* Help Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Required CSV Columns</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                <span><strong>Student Number</strong> - Unique identifier</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                <span><strong>Student&apos;s Name</strong> - Full name (LASTNAME, FIRSTNAME)</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <span><strong>Last Name</strong> - Surname</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <span><strong>First Name</strong> - Given name</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <span><strong>Middle Name</strong> - Optional</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <span><strong>Grade/Level</strong> - e.g., First Year</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <span><strong>Program</strong> - e.g., BEED</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Import Rules</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• Students with existing <strong>Student Number</strong> will be updated</li>
              <li>• Names are automatically converted to UPPERCASE</li>
              <li>• Section is derived from Program field</li>
              <li>• Student Number is required for all records</li>
            </ul>
          </div>

          {errors.length === 0 && parsedData.length === 0 && null}
        </div>
      </div>

      {/* Import Result Modal */}
      <Modal
        open={!!result}
        onClose={() => setResult(null)}
        title="Import Complete"
        subtitle={result ? `Successfully imported ${result.inserted} students` : undefined}
        size="sm"
        footer={
          <>
            <button onClick={() => setResult(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Close</button>
            <button onClick={() => { setResult(null); handleReset(); }} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors">Import Another File</button>
          </>
        }
      >
        {result && (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${result.errors.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
              {result.errors.length === 0 ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              )}
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{result.inserted}</span> students imported
                {result.errors.length > 0 && <span> with <span className="font-semibold">{result.errors.length}</span> errors</span>}
              </p>
            </div>
            {result.errors.length > 0 && (
              <ul className="text-xs text-amber-700 max-h-48 overflow-auto space-y-1 border border-amber-200 rounded-lg p-3 bg-amber-50/50">
                {result.errors.map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>

      {/* Parse Errors Modal */}
      <Modal
        open={showErrorsModal}
        onClose={() => setShowErrorsModal(false)}
        title="Parse Errors"
        subtitle={`${errors.length} rows could not be parsed`}
        size="sm"
        footer={
          <button onClick={() => setShowErrorsModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Close</button>
        }
      >
        <ul className="space-y-1 text-sm text-amber-700 max-h-64 overflow-auto">
          {errors.map((err, i) => (
            <li key={i}>• {err}</li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
