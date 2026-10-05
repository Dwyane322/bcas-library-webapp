"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Camera,
  CameraOff,
  CheckCircle,
  RotateCcw,
  DollarSign,
} from "lucide-react";
import Modal from "@/components/ui/modal";
import {
  getBookById,
} from "@/lib/supabase/books";
import { getStudentByNumber } from "@/lib/supabase/students";
import { borrowBook } from "@/lib/supabase/transactions";
import type { BookWithClassification, Student } from "@/lib/types";

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
  // Idle until the user explicitly presses "Start Scanner".
  // Auto-starting the camera on page load causes play() to race
  // mount/unmount (StrictMode, navigation, instant scan-stop) which is
  // what throws "The play() request was interrupted because the media
  // was removed from the document."
  const [scannerActive, setScannerActive] = useState(false);
  const [bookInfo, setBookInfo] = useState<BookWithClassification | null>(null);
  const [studentName, setStudentName] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [dateBorrowed, setDateBorrowed] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    fine?: number;
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
          const fine = tx.fine_amount ?? 0;
          setResult({
            success: true,
            message: fine > 0
              ? `Successfully returned "${book.title}". Fine of ₱${fine.toFixed(2)} applied for overdue.`
              : `Successfully returned "${book.title}".`,
            fine,
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

  const handleStudentLookup = async (value: string) => {
    setStudentName(value);
    setStudentError(null);
    if (!value.trim()) {
      setStudent(null);
      return;
    }
    setStudentLoading(true);
    try {
      const s = await getStudentByNumber(value.trim());
      setStudent(s);
      if (!s) {
        setStudentError(`No student found with ID "${value.trim()}".`);
      }
    } catch {
      setStudent(null);
      setStudentError(`No student found with ID "${value.trim()}".`);
    } finally {
      setStudentLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!bookInfo || !studentName.trim()) return;
    if (!student) {
      setStudentError("Please enter a valid student ID.");
      return;
    }

    setLoading(true);
    try {
      const tx = await borrowBook(studentName.trim(), bookInfo.id);
      const wasReturned = tx.status === "Returned";
      const fine = tx.fine_amount ?? 0;
      setResult({
        success: true,
        message: wasReturned
          ? fine > 0
            ? `Successfully returned "${bookInfo.title}" for ${studentName.trim()}. Fine of ₱${fine.toFixed(2)} applied for overdue.`
            : `Successfully returned "${bookInfo.title}" for ${studentName.trim()}.`
          : `Successfully borrowed "${bookInfo.title}" for ${studentName.trim()}.`,
        fine,
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
    // Back to idle — the next scan requires another explicit Start press
    // so camera start is always inside a user gesture.
    setStep("scan");
    setScannerActive(false);
    setBookInfo(null);
    setStudentName("");
    setStudent(null);
    setStudentError(null);
    setDateBorrowed(new Date().toISOString().split("T")[0]);
    setResult(null);
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6 animate-fade-in-up stagger-1">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          QR Scanner
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Scan a book QR code to begin the borrowing process.
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 animate-fade-in-up stagger-2">
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
          <div className="bg-white rounded-xl border border-slate-200 p-6 animate-fade-in-up stagger-3">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Scan Book QR Code
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {scannerActive
                  ? "Point your camera at the book's QR code."
                  : "Press Start Scanner to turn on your camera."}
              </p>
            </div>

            {scannerActive ? (
              <QRScanner onScan={handleQRScan} isActive={scannerActive} />
            ) : (
              <div className="w-[288px] h-[288px] mx-auto bg-slate-100 rounded-lg flex flex-col items-center justify-center gap-3">
                <Camera className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-slate-500 px-6 text-center">
                  Camera is off. Starting it with a tap keeps playback
                  inside a user gesture.
                </p>
              </div>
            )}

            <div className="flex justify-center mt-4">
              <button
                onClick={() => setScannerActive(!scannerActive)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  scannerActive
                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
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

        {/* Borrowing Details Modal */}
        <Modal
          open={step === "form" && !!bookInfo}
          onClose={handleReset}
          title="Borrowing Details"
          subtitle={bookInfo ? `${bookInfo.title} • ${bookInfo.accession_number}` : undefined}
          size="lg"
          footer={
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Scan New Book
              </button>
              <button
                onClick={handleSubmit}
                disabled={!studentName.trim() || !student || loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                {loading ? "Processing..." : "Confirm Borrow"}
              </button>
            </>
          }
        >
          {bookInfo && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Book Information
                </h4>
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

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Student Information
                </h4>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Student ID
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => handleStudentLookup(e.target.value)}
                  placeholder="Enter student ID"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {studentLoading && (
                  <p className="text-xs text-slate-400 mt-1">Looking up student...</p>
                )}
                {studentError && (
                  <p className="text-xs text-red-600 mt-1">{studentError}</p>
                )}
                {student && !studentLoading && (
                  <div className="mt-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-800">{student.name}</p>
                    <p className="text-xs text-emerald-600">Section: {student.section}</p>
                    {student.grade_level && (
                      <p className="text-xs text-emerald-600">Grade: {student.grade_level}</p>
                    )}
                    {student.program && (
                      <p className="text-xs text-emerald-600">Program: {student.program}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Transaction Details
                </h4>
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
          )}
        </Modal>

        {/* Result Modal */}
        <Modal
          open={step === "result" && !!result}
          onClose={handleReset}
          title={result?.success ? "Success" : "Error"}
          size="sm"
          footer={
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Scan Another Book
            </button>
          }
        >
          {result && (
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-4">{result.message}</p>
              {result.fine && result.fine > 0 && (
                <div className="mb-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">Fine Applied</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">₱{result.fine.toFixed(2)}</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Please collect this fine from the student.
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
