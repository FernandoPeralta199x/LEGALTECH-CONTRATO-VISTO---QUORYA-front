"use client";

import { Bell, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { listCases } from "@/services/cases";
import { listDocuments } from "@/services/documents";
import type { Case, Document } from "@/types";

const READ_NOTICES_KEY = "legaltech_read_notices";

type Notice = {
  id: string;
  caseId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
};

function getReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(READ_NOTICES_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(READ_NOTICES_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function buildNotices(cases: Case[], documents: Document[]): Notice[] {
  const readIds = getReadIds();
  const notices: Notice[] = [];

  for (const c of cases) {
    let n: Omit<Notice, "read"> | null = null;
    if (c.status === "report_ready") {
      n = { id: `report-${c.id}`, caseId: c.id, title: c.title || "Relatório gerado",
            message: "Relatório gerado — aguardando revisão.",
            date: c.updatedAt || c.createdAt || new Date().toISOString() };
    } else if (c.status === "triage_completed") {
      n = { id: `triage-${c.id}`, caseId: c.id, title: c.title || "Triagem concluída",
            message: "Triagem concluída — pronto para revisão.",
            date: c.updatedAt || c.createdAt || new Date().toISOString() };
    } else if (c.status === "completed" || c.progress === 100) {
      n = { id: `done-${c.id}`, caseId: c.id, title: c.title || "Caso concluído",
            message: "Caso concluído.",
            date: c.updatedAt || c.createdAt || new Date().toISOString() };
    }
    if (n) notices.push({ ...n, read: readIds.has(n.id) });
  }

  for (const d of documents) {
    if (d.status !== "processed") continue;
    const id = `doc-${d.id}`;
    notices.push({
      id,
      caseId: d.caseId,
      title: d.filename || "Documento processado",
      message: "Documento processado — pronto para análise.",
      date: d.processedAt || d.updatedAt || d.uploadedAt || new Date().toISOString(),
      read: readIds.has(id),
    });
  }

  return notices
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 12);
}

async function fetchNotices(): Promise<Notice[]> {
  try {
    const [cases, documents] = await Promise.all([
      listCases().catch(() => ({ data: [] as Case[] })),
      listDocuments().catch(() => ({ data: [] as Document[] })),
    ]);
    return buildNotices(cases.data ?? [], documents.data ?? []);
  } catch {
    return [];
  }
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notices.filter((n) => !n.read).length;

  async function loadNotices() {
    setLoading(true);
    setNotices(await fetchNotices());
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetchNotices().then((items) => {
      if (cancelled) return;
      setNotices(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    if (notices.length === 0) {
      loadNotices();
    }
  }

  function markAsRead(ids: string[]) {
    if (ids.length === 0) return;
    setNotices((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
    );
    const currentReadIds = getReadIds();
    ids.forEach((id) => currentReadIds.add(id));
    saveReadIds(Array.from(currentReadIds));
  }

  function handleClick(notice: Notice) {
    markAsRead([notice.id]);
    setOpen(false);
    router.push(`/cases/${notice.caseId}`);
  }

  function handleMarkAllRead() {
    const allIds = notices.map((n) => n.id);
    markAsRead(allIds);
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  return (
    <div ref={ref} className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Notificações"
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg",
          "min-h-11 min-w-11 text-[var(--text2)] hover:bg-[var(--surf3)] hover:text-[var(--text)]",
          "transition-colors duration-fast"
        )}
        onClick={handleOpen}
        onMouseEnter={() => {
          if (!open) handleOpen();
        }}
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--teal)] px-1 text-[9px] font-bold text-white ring-2 ring-[var(--surf)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-80 rounded-xl border border-[var(--bd)]",
            "bg-[var(--surf)] shadow-xl shadow-black/20",
            "animate-in fade-in slide-in-from-top-2 duration-200"
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--bd)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--text)]">Notificações</h3>
            {notices.length > 0 && (
              <button
                className="text-xs text-[var(--text2)] hover:text-[var(--accent)]"
                onClick={handleMarkAllRead}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notices.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[var(--text2)]">Carregando...</p>
            ) : notices.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-[var(--text2)]">Nenhum caso finalizado.</p>
            ) : (
              notices.map((notice) => (
                <button
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-[var(--bd)] px-4 py-3 text-left",
                    "transition-colors hover:bg-[var(--surf3)]",
                    notice.read ? "opacity-70" : "bg-[var(--surf2)]/30"
                  )}
                  key={notice.id}
                  onClick={() => handleClick(notice)}
                >
                  <span className="mt-0.5 shrink-0 text-[var(--teal)]">
                    <CheckCircle2 size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text)]">
                      {notice.title}
                    </p>
                    <p className="text-xs text-[var(--text2)]">{notice.message}</p>
                    <p className="mt-1 text-[10px] text-[var(--text3)]">
                      {formatDate(notice.date)}
                    </p>
                  </div>
                  {!notice.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--teal)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
