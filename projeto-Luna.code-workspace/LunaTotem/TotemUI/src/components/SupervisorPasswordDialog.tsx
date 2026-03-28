"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type SupervisorPasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Short label used in title/description (e.g., "Reimpressão" or "Cancelamento"). */
  actionLabel: string;

  /** If true, disables inputs/buttons and shows a simple busy state. */
  busy?: boolean;

  /** Called only after user confirms. Password is never logged by this component. */
  onConfirm: (password: string) => void | Promise<void>;
};

export function SupervisorPasswordDialog(props: SupervisorPasswordDialogProps) {
  const { open, onOpenChange, actionLabel, busy, onConfirm } = props;

  const [password, setPassword] = useState<string>("");

  const canConfirm = useMemo(() => {
    return !busy && password.trim().length > 0;
  }, [busy, password]);

  useEffect(() => {
    // Clear password whenever dialog closes.
    if (!open) {
      setPassword("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    const pwd = password;
    // Clear ASAP to minimize password lifetime in memory.
    setPassword("");
    await onConfirm(pwd);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Senha do Supervisor</DialogTitle>
          <DialogDescription>
            Para <b>{actionLabel}</b>, confirme a senha do supervisor.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 grid gap-2">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#C4A07C]">
              Senha
            </span>
            <Input
              type="password"
              name="supervisor-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              inputMode="numeric"
              disabled={Boolean(busy)}
              spellCheck={false}
              onKeyDown={(e) => {
                // Avoid form submission quirks; use Enter to confirm.
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleConfirm();
                }
              }}
            />
          </label>

          <p className="text-xs text-[#4A4A4A]/70">
            Por segurança, a senha não é exibida nem registrada.
          </p>
        </div>

        <DialogFooter className="mt-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(busy)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canConfirm}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#D3A67F] px-4 text-sm font-semibold text-white shadow-md shadow-[#D3A67F]/40 disabled:opacity-60"
          >
            {busy ? "Confirmando…" : "Confirmar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
