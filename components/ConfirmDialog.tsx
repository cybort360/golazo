"use client";

// Small yes/no modal. Used to confirm irreversible actions like locking a pick.
export default function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 cursor-default bg-slate-900/40 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-xs rounded-2xl border border-slate-200 bg-white p-5 shadow-card-md">
        <h3 className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-slate-500">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
