"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);

const TONE = {
  success: "border-success/30 bg-success-tint text-success-ink",
  error: "border-danger/30 bg-danger-tint text-danger-ink",
  info: "border-brand-200 bg-brand-50 text-brand-700",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (message, tone = "success") => {
      const id = ++nextId.current;
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${TONE[t.tone] || TONE.info}`}
          >
            <span>{t.message}</span>
            <button onClick={() => remove(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
