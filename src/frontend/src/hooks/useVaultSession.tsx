import { deriveVaultKey, keyFingerprint } from "@/lib/crypto";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** Auto-lock after this many milliseconds of inactivity. */
export const AUTO_LOCK_MS = 5 * 60 * 1000;

interface VaultSessionValue {
  /** The in-memory AES key, or null while the vault is locked. */
  key: CryptoKey | null;
  /** Short fingerprint of the derived key, shown in the status bar. */
  fingerprint: string | null;
  /** True while the key is being derived. */
  isUnlocking: boolean;
  /** Human-readable error from the last unlock attempt. */
  error: string | null;
  /** Milliseconds remaining before auto-lock. */
  remainingMs: number;
  /** Derive the key for the signed-in principal. */
  unlock: () => Promise<void>;
  /** Wipe the key and decrypted data immediately. */
  lock: () => void;
  /** Record user activity to reset the inactivity timer. */
  touch: () => void;
}

const VaultSessionContext = createContext<VaultSessionValue | null>(null);

export function VaultSessionProvider({ children }: { children: ReactNode }) {
  const { identity } = useInternetIdentity();
  const principal =
    identity && !identity.getPrincipal().isAnonymous()
      ? identity.getPrincipal().toText()
      : null;

  const [key, setKey] = useState<CryptoKey | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(AUTO_LOCK_MS);
  const lastActivity = useRef(Date.now());

  const lock = useCallback(() => {
    setKey(null);
    setFingerprint(null);
    setError(null);
    setRemainingMs(AUTO_LOCK_MS);
  }, []);

  const touch = useCallback(() => {
    lastActivity.current = Date.now();
    setRemainingMs(AUTO_LOCK_MS);
  }, []);

  const unlock = useCallback(async () => {
    if (!principal) {
      setError("Sign in to unlock your vault.");
      return;
    }
    setIsUnlocking(true);
    setError(null);
    try {
      const derived = await deriveVaultKey(principal);
      const print = await keyFingerprint(derived);
      setKey(derived);
      setFingerprint(print);
      lastActivity.current = Date.now();
      setRemainingMs(AUTO_LOCK_MS);
    } catch {
      setError("Could not derive your vault key. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  }, [principal]);

  // Wipe the key whenever the signed-in principal changes or disappears.
  // biome-ignore lint/correctness/useExhaustiveDependencies: principal is the reset trigger; lock is stable.
  useEffect(() => {
    lock();
  }, [principal, lock]);

  // Reset the inactivity timer on any user activity while unlocked, so
  // typing in an editor, toggling preview, or generating a password keeps
  // the vault open instead of locking mid-edit.
  useEffect(() => {
    if (!key) return;
    const onActivity = () => touch();
    const events: (keyof WindowEventMap)[] = [
      "pointerdown",
      "keydown",
      "input",
      "wheel",
      "touchstart",
    ];
    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    return () => {
      for (const event of events) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [key, touch]);

  // Countdown toward auto-lock while the vault is unlocked.
  useEffect(() => {
    if (!key) return;
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;
      const remaining = AUTO_LOCK_MS - elapsed;
      if (remaining <= 0) {
        lock();
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [key, lock]);

  const value = useMemo<VaultSessionValue>(
    () => ({
      key,
      fingerprint,
      isUnlocking,
      error,
      remainingMs,
      unlock,
      lock,
      touch,
    }),
    [key, fingerprint, isUnlocking, error, remainingMs, unlock, lock, touch],
  );

  return (
    <VaultSessionContext.Provider value={value}>
      {children}
    </VaultSessionContext.Provider>
  );
}

export function useVaultSession(): VaultSessionValue {
  const context = useContext(VaultSessionContext);
  if (!context) {
    throw new Error("useVaultSession must be used within VaultSessionProvider");
  }
  return context;
}
