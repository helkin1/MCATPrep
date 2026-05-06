import { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./Dialog";
import { Button } from "./Button";
import { Input, Label } from "./Input";

const ConfirmCtx = createContext(null);

/**
 * useConfirm — returns two async helpers:
 *   confirm({ title, description, confirmLabel, cancelLabel, danger })  → Promise<boolean>
 *   prompt({ title, description, label, defaultValue, placeholder, confirmLabel }) → Promise<string|null>
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  // resolver for the in-flight dialog
  const resolverRef = useRef(null);

  const close = useCallback((result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState(null);
  }, []);

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ kind: "confirm", ...opts });
    });
  }, []);

  const promptFn = useCallback((opts) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ kind: "prompt", value: opts.defaultValue ?? "", ...opts });
    });
  }, []);

  const onCancel = () => close(state?.kind === "prompt" ? null : false);
  const onConfirm = () =>
    close(state?.kind === "prompt" ? state.value : true);

  return (
    <ConfirmCtx.Provider value={{ confirm, prompt: promptFn }}>
      {children}
      <Dialog open={!!state} onClose={onCancel} size="sm">
        {state && (
          <>
            <DialogHeader>
              <DialogTitle>{state.title}</DialogTitle>
              {state.description && (
                <DialogDescription>{state.description}</DialogDescription>
              )}
            </DialogHeader>

            {state.kind === "prompt" && (
              <div>
                {state.label && <Label>{state.label}</Label>}
                <Input
                  autoFocus
                  value={state.value}
                  placeholder={state.placeholder}
                  onChange={(e) =>
                    setState((s) => ({ ...s, value: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onConfirm();
                  }}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={onCancel}>
                {state.cancelLabel || "Cancel"}
              </Button>
              <Button
                variant={state.danger ? "danger" : "primary"}
                onClick={onConfirm}
                disabled={
                  state.kind === "prompt" && !state.value?.trim()
                }
              >
                {state.confirmLabel ||
                  (state.kind === "prompt" ? "Save" : "Confirm")}
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
