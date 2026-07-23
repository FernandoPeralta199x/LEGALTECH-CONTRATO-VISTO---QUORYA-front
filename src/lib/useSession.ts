"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getServerSessionSnapshot,
  getSessionSnapshot,
  refreshSession,
  subscribeSession,
  type SessionState
} from "@/lib/sessionClient";
import type { Session } from "@/types/auth";

const SERVER_SNAPSHOT = getServerSessionSnapshot();

function getStableServerSnapshot(): SessionState {
  return SERVER_SNAPSHOT;
}

export function useSessionState(): SessionState {
  const current = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getStableServerSnapshot
  );

  useEffect(() => {
    if (getSessionSnapshot().status === "loading") {
      void refreshSession();
    }
  }, []);

  return current;
}

export function useSession(): Session | null {
  return useSessionState().session;
}
