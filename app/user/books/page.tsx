"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Search,
  Plus,
  Pencil,
  BookCopy,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  X,
  Trash2,
  Printer,
} from "lucide-react";
import { getBooks, createBook, updateBook, deleteBook } from "@/lib/supabase/books";
import { getClassifications } from "@/lib/supabase/classifications";
import type { BookWithClassification, Classification, BookStatus, MaterialType } from "@/lib/types";

const statusStyles: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Borrowed: "bg-blue-50 text-blue-700 border border-blue-200",
  Lost: "bg-red-50 text-red-700 border border-red-200",
  Damaged: "bg-amber-50 text-amber-700 border border-amber-200",
};

interface BookForm {
  title: string;
  author: string;
  accession_number: string;
  classification_id: string;
  shelf_location: string;
  material_type: MaterialType;
  status: BookStatus;
  is_library_use_only: boolean;
  notes: string;
}

const emptyForm: BookForm = {
  title: "",
  author: "",
  accession_number: "",
  classification_id: "",
  shelf_location: "",
  material_type: "Book",
  status: "Available",
  is_library_use_only: false,
  notes: "",
};

interface BookFormModalProps {
  title: string;
  form: BookForm;
  setForm: (f: BookForm) => void;
  formError: string | null;
  classifications: Classification[];
  submitting: boolean;
  isEdit: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onClose: () => void;
}

function BookFormModal({
  title,
  form,
  setForm,
  formError,
  classifications,
  submitting,
  isEdit,
  onSubmit,
  onClose,
}: BookFormModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Author *</label>
              <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Accession Number *</label>
              <input type="text" value={form.accession_number} onChange={(e) => setForm({ ...form, accession_number: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
              <select value={form.classification_id} onChange={(e) => setForm({ ...form, classification_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="">Select category</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shelf Location</label>
              <input type="text" value={form.shelf_location} onChange={(e) => setForm({ ...form, shelf_location: e.target.value })} placeholder="e.g. CS-A1-04" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Material Type</label>
              <select value={form.material_type} onChange={(e) => setForm({ ...form, material_type: e.target.value as MaterialType })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="Book">Book</option>
                <option value="Non-Book">Non-Book</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BookStatus })} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                <option value="Available">Available</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Lost">Lost</option>
                <option value="Damaged">Damaged</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_library_use_only} onChange={(e) => setForm({ ...form, is_library_use_only: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-sm font-medium text-slate-700">Library Use Only</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50">
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<BookWithClassification[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBook, setEditingBook] = useState<BookWithClassification | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [printingBook, setPrintingBook] = useState<BookWithClassification | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [booksData, classData] = await Promise.all([
        getBooks(),
        getClassifications(),
      ]);
      setBooks(booksData);
      setClassifications(classData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard data-fetch pattern
  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = books.filter((b) => {
    const catName = b.classifications?.name ?? "";
    const matchSearch =
      !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      catName.toLowerCase().includes(search.toLowerCase()) ||
      b.accession_number.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || catName === category;
    const matchStatus = status === "all" || b.status === status;
    return matchSearch && matchCat && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, filtered.length);

  const openAddModal = () => {
    setForm(emptyForm);
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (book: BookWithClassification) => {
    setForm({
      title: book.title,
      author: book.author,
      accession_number: book.accession_number,
      classification_id: book.classification_id,
      shelf_location: book.shelf_location ?? "",
      material_type: book.material_type,
      status: book.status,
      is_library_use_only: book.is_library_use_only,
      notes: book.notes ?? "",
    });
    setEditingBook(book);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author || !form.accession_number || !form.classification_id) {
      setFormError("Title, author, accession number, and category are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const newBook = await createBook({
        title: form.title,
        author: form.author,
        accession_number: form.accession_number,
        classification_id: form.classification_id,
        shelf_location: form.shelf_location || null,
        material_type: form.material_type,
        status: form.status,
        is_library_use_only: form.is_library_use_only,
        notes: form.notes || null,
      });
      setShowAddModal(false);
      await fetchData();
      setPrintingBook(newBook as BookWithClassification);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to add book");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    if (!form.title || !form.author || !form.accession_number || !form.classification_id) {
      setFormError("Title, author, accession number, and category are required.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await updateBook(editingBook.id, {
        title: form.title,
        author: form.author,
        accession_number: form.accession_number,
        classification_id: form.classification_id,
        shelf_location: form.shelf_location || null,
        material_type: form.material_type,
        status: form.status,
        is_library_use_only: form.is_library_use_only,
        notes: form.notes || null,
      });
      setShowEditModal(false);
      setEditingBook(null);
      await fetchData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update book");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (book: BookWithClassification) => {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    try {
      await deleteBook(book.id);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete book");
    }
  };

  const getQrUrl = (bookId: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/borrow?bookId=${bookId}`;
    }
    return `/borrow?bookId=${bookId}`;
  };

  const handlePrintQr = (book: BookWithClassification) => {
    setPrintingBook(book);
  };

  const printLabel = () => {
    window.print();
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Book Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage catalog, categories, and inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add New Book</span>
            <span className="sm:hidden">Add Book</span>
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, or category..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1 sm:flex-none">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Category</option>
                {classifications.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative flex-1 sm:flex-none">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">Status</option>
                <option value="Available">Available</option>
                <option value="Borrowed">Borrowed</option>
                <option value="Lost">Lost</option>
                <option value="Damaged">Damaged</option>
              </select>
              <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {/* Table */}
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 hidden sm:table-cell">
                    Preview
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">
                    Title &amp; Author
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 hidden md:table-cell">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 hidden lg:table-cell">
                    Shelf Location
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      Loading books...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      No books found.
                    </td>
                  </tr>
                ) : (
                  filtered.slice((page - 1) * perPage, page * perPage).map((book) => (
                    <tr
                      key={book.id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="w-10 h-14 rounded bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <BookCopy className="w-5 h-5 text-slate-300" />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">{book.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{book.author}</p>
                        <p className="text-xs text-slate-400 mt-0.5 md:hidden">
                          {book.classifications?.name}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-slate-600 hidden md:table-cell">
                        {book.classifications?.name}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600 hidden lg:table-cell">
                        {book.shelf_location ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${statusStyles[book.status] ?? "bg-slate-100 text-slate-600"}`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handlePrintQr(book)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Print QR Code">
                            <Printer className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(book)} className="text-slate-400 hover:text-slate-600 transition-colors" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(book)} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Showing {filtered.length > 0 ? start : 0} to {end} of{" "}
            {filtered.length} entries
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                  p === page
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Book Modal */}
      {showAddModal && (
        <BookFormModal
          title="Add New Book"
          form={form}
          setForm={setForm}
          formError={formError}
          classifications={classifications}
          submitting={submitting}
          isEdit={false}
          onSubmit={handleAddSubmit}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Edit Book Modal */}
      {showEditModal && (
        <BookFormModal
          title="Edit Book"
          form={form}
          setForm={setForm}
          formError={formError}
          classifications={classifications}
          submitting={submitting}
          isEdit={true}
          onSubmit={handleEditSubmit}
          onClose={() => { setShowEditModal(false); setEditingBook(null); }}
        />
      )}

      {/* Print QR Modal */}
      {printingBook && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPrintingBook(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Print QR Code</h3>
              <button onClick={() => setPrintingBook(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div data-print-label className="flex flex-col items-center">
                <QRCodeSVG
                  value={getQrUrl(printingBook.id)}
                  size={180}
                  level="M"
                  includeMargin
                />
                <div className="mt-4 text-center">
                  <p className="text-sm font-bold text-slate-900">{printingBook.title}</p>
                  <p className="text-xs text-slate-500">{printingBook.author}</p>
                  <p className="text-xs text-slate-400 mt-1">Accession #: {printingBook.accession_number}</p>
                </div>
              </div>
              <button
                onClick={printLabel}
                className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
