"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { getBookById } from "@/lib/supabase/books";
import { getStudentById } from "@/lib/supabase/students";
import { borrowBook } from "@/lib/supabase/transactions";
import type { BookWithClassification, Student } from "@/lib/types";

function BorrowForm() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get("bookId");

  const [book, setBook] = useState<BookWithClassification | null>(null);
  const [bookLoading, setBookLoading] = useState(() => !!bookId);
  const [bookError, setBookError] = useState<string | null>(
    bookId ? null : "No book ID provided. Please scan a valid book QR code."
  );

  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    (async () => {
      try {
        const b = await getBookById(bookId);
        if (!cancelled) {
          setBook(b);
          setBookLoading(false);
        }
      } catch {
        if (!cancelled) {
          setBookError("Book not found. Please scan a valid book QR code.");
          setBookLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [bookId]);

  const handleStudentIdChange = async (value: string) => {
    setStudentId(value);
    if (!value.trim()) {
      setStudent(null);
      return;
    }
    setStudentLoading(true);
    try {
      const s = await getStudentById(value.trim());
      setStudent(s);
    } catch {
      setStudent(null);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (!student || !book) return;
    setSubmitting(true);
    setResult(null);
    try {
      const tx = await borrowBook(student.name, book.id);
      const wasReturned = tx.status === "Returned";
      setResult({
        success: true,
        message: wasReturned
          ? `Successfully returned "${book.title}".`
          : `Successfully borrowed "${book.title}". Please return it on or before 5 days from now.`,
      });
      setStudentId("");
      setStudent(null);
    } catch (err: unknown) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : "Failed to borrow book.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!bookId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">Invalid QR Code</h1>
          <p className="text-sm text-slate-500">No book ID provided. Please scan a valid book QR code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-emerald-700 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-6 h-6 text-emerald-700" />
          </div>
          <h1 className="text-lg font-bold text-white">BCAS Library</h1>
          <p className="text-sm text-emerald-100 mt-1">Borrow a Book</p>
        </div>

        <div className="p-6">
          {bookLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              <span className="ml-2 text-sm text-slate-500">Loading book info...</span>
            </div>
          ) : bookError ? (
            <div className="text-center py-8">
              <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-sm text-red-600">{bookError}</p>
            </div>
          ) : result?.success ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-900 mb-2">Borrow Successful!</h2>
              <p className="text-sm text-slate-600 mb-4">{result.message}</p>
              <p className="text-xs text-slate-400">Book: {book?.title}</p>
            </div>
          ) : (
            <>
              {/* Book Info */}
              <div className="mb-5 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Book Details</p>
                <p className="text-sm font-semibold text-slate-900">{book?.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{book?.author}</p>
                <p className="text-xs text-slate-400 mt-0.5">Accession #: {book?.accession_number}</p>
                {book?.is_library_use_only && (
                  <p className="text-xs text-amber-600 font-medium mt-2">Library Use Only — cannot be borrowed</p>
                )}
                {book?.status !== "Available" && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    Status: {book?.status} — not available for borrowing
                  </p>
                )}
              </div>

              {/* Student ID Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Student ID
                </label>
                <input
                  type="text"
                  placeholder="Enter your student ID..."
                  value={studentId}
                  onChange={(e) => handleStudentIdChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Student Info */}
              <div className="mb-5 p-4 rounded-lg bg-slate-50 border border-slate-200 min-h-[60px]">
                {studentLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span className="text-sm text-slate-500">Looking up student...</span>
                  </div>
                ) : student ? (
                  <div>
                    <p className="text-sm font-medium text-slate-900">{student.name}</p>
                    <p className="text-xs text-slate-500">Section: {student.section}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic text-center">
                    Enter your student ID to continue.
                  </p>
                )}
              </div>

              {/* Error */}
              {result && !result.success && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <XCircle className="w-4 h-4 inline mr-1" />
                  {result.message}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleBorrow}
                disabled={!student || !book || book.status !== "Available" || book.is_library_use_only || submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Confirm Borrow"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BorrowPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      }
    >
      <BorrowForm />
    </Suspense>
  );
}
