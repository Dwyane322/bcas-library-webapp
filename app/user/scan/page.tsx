"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Camera,
  CameraOff,
  User,
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  getBookById,
} from "@/lib/supabase/books";
import { borrowBook } from "@/lib/supabase/transactions";
import type { BookWithClassification } from "@/lib/types";

const QRScanner = dynamic(() => import("@/components/qr-scanner"), {
  ssr: false,
  loading: () => (
    <div className="w-[288px] h-[288px] mx-auto bg-slate-100 rounded-lg flex items-center justify-center">
      <p className="text-slate-500 text-sm">Loading scanner...</p>
    </div>
  ),
});

type Step = "scan" | "form" | "result";

export default function ScanPage() {
  const [step, setStep] = useState<Step>("scan");
  const [scannerActive, setScannerActive] = useState(true);
  const [bookInfo, setBookInfo] = useState<BookWithClassification | null>(null);
  const [studentName, setStudentName] = useState("");
  const [dateBorrowed, setDateBorrowed] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleQRScan = useCallback(async (decodedText: string) => {
    setScannerActive(false);
    setLoading(true);

    try {
      let book: BookWithClassification | null = null;

      try {
        const url = new URL(decodedText, window.location.origin);
        const bookId = url.searchParams.get("bookId");
        if (bookId) {
          book = await getBookById(bookId).catch(() => null);
        }
      } catch {
        // Not a valid URL
      }

      if (!book) {
        setResult({
          success: false,
          message: `No book found for code: ${decodedText}`,
        });
        setStep("result");
        return;
      }

      setBookInfo(book);

      // If book is already borrowed, auto-return it
      if (book.status === "Borrowed") {
        setLoading(true);
        try {
          const tx = await borrowBook("", book.id);
          setResult({
            success: true,
            message: `Successfully returned "${book.title}".`,
          });
          setStep("result");
        } catch (err: unknown) {
          setResult({
            success: false,
            message:
              err instanceof Error ? err.message : "Failed to return book.",
          });
          setStep("result");
        } finally {
          setLoading(false);
        }
        return;
      }

      // Book is available, show borrow form
      setStep("form");
    } catch {
      setResult({
        success: false,
        message: "Failed to look up book. Please try again.",
      });
      setStep("result");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!bookInfo || !studentName.trim()) return;

    setLoading(true);
    try {
      const tx = await borrowBook(studentName.trim(), bookInfo.id);
      const wasReturned = tx.status === "Returned";
      setResult({
        success: true,
        message: wasReturned
          ? `Successfully returned "${bookInfo.title}" for ${studentName.trim()}.`
          : `Successfully borrowed "${bookInfo.title}" for ${studentName.trim()}.`,
      });
      setStep("result");
    } catch (err: unknown) {
      setResult({
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to process borrow.",
      });
      setStep("result");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("scan");
    setScannerActive(true);
    setBookInfo(null);
    setStudentName("");
    setDateBorrowed(new Date().toISOString().split("T")[0]);
    setResult(null);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          QR Scanner
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Scan a book QR code to begin the borrowing process.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {["scan", "form", "result"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === s
                    ? "bg-emerald-700 text-white"
                    : i < ["scan", "form", "result"].indexOf(step)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`w-12 h-0.5 ${
                    i < ["scan", "form", "result"].indexOf(step)
                      ? "bg-emerald-700"
                      : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Scanner Step */}
        {step === "scan" && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="text-center mb-4">
              <Camera className="w-10 h-10 text-emerald-700 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-slate-900">
                Scan Book QR Code
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Point your camera at the book&apos;s QR code.
              </p>
            </div>

            {scannerActive ? (
              <QRScanner onScan={handleQRScan} isActive={scannerActive} />
            ) : (
              <div className="w-[288px] h-[288px] mx-auto bg-slate-100 rounded-lg flex items-center justify-center">
                <CameraOff className="w-8 h-8 text-slate-400" />
              </div>
            )}

            <div className="flex justify-center mt-4">
              <button
                onClick={() => setScannerActive(!scannerActive)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scannerActive
                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {scannerActive ? (
                  <>
                    <CameraOff className="w-4 h-4" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Start Scanner
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Form Step */}
        {step === "form" && bookInfo && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
              Borrowing Details
            </h3>

            {/* Book Information (Auto-filled) */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-semibold text-slate-700">
                  Book Information
                </h4>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Auto-filled
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={bookInfo.title}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={bookInfo.author}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Accession Number
                  </label>
                  <input
                    type="text"
                    value={bookInfo.accession_number}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Status
                  </label>
                  <input
                    type="text"
                    value={bookInfo.status}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* Student Information (Manual input) */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-semibold text-slate-700">
                  Student Information
                </h4>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Student Name / ID
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student name or ID"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Date Borrowed */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-emerald-700" />
                <h4 className="text-sm font-semibold text-slate-700">
                  Transaction Details
                </h4>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Date Borrowed
                </label>
                <input
                  type="date"
                  value={dateBorrowed}
                  onChange={(e) => setDateBorrowed(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Scan New Book
              </button>
              <button
                onClick={handleSubmit}
                disabled={!studentName.trim() || loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? "Processing..." : "Confirm Borrow"}
              </button>
            </div>
          </div>
        )}

        {/* Result Step */}
        {step === "result" && result && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            {result.success ? (
              <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            )}
            <h3
              className={`text-lg font-bold mb-2 ${
                result.success ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {result.success ? "Success!" : "Error"}
            </h3>
            <p className="text-sm text-slate-600 mb-6">{result.message}</p>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Scan Another Book
            </button>
          </div>
        )}
      </div>
    </>
  );
}
