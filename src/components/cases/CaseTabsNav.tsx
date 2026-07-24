import { Bot, ClipboardList, Clock, FileText, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type CaseTab = { id: string; label: string; icon: LucideIcon };

export const CASE_TABS: CaseTab[] = [
  { id: "overview", label: "Visão geral", icon: ClipboardList },
  { id: "parties", label: "Partes", icon: Users },
  { id: "documents", label: "Documentos", icon: FileText },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "agents", label: "Triagem local", icon: Bot },
  { id: "report", label: "Relatório", icon: Shield }
];

/** Ids válidos de aba — usado pela página para validar o deep-link via hash. */
export const CASE_TAB_IDS = CASE_TABS.map((t) => t.id);

/** Barra de abas do caso (padrão ARIA Tabs — A11Y-05: roving tabindex + setas/Home/End).
 *  Apresentacional — extraído de cases/[id]/page.tsx sem alterar o comportamento. */
export function CaseTabsNav({
  activeTab,
  onTabChange
}: {
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div
      aria-label="Seções do caso"
      className="mb-6 flex overflow-x-auto border-b border-[var(--bd)]"
      onKeyDown={(event) => {
        const i = CASE_TABS.findIndex((t) => t.id === activeTab);
        let nextIndex: number;
        if (event.key === "ArrowRight") nextIndex = (i + 1) % CASE_TABS.length;
        else if (event.key === "ArrowLeft")
          nextIndex = (i - 1 + CASE_TABS.length) % CASE_TABS.length;
        else if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = CASE_TABS.length - 1;
        else return;
        event.preventDefault();
        const next = CASE_TABS[nextIndex];
        onTabChange(next.id);
        document.getElementById(`tab-${next.id}`)?.focus();
      }}
      role="tablist"
    >
      {CASE_TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            aria-controls={active ? `panel-${tab.id}` : undefined}
            aria-selected={active}
            className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-xs transition ${
              active
                ? "border-[var(--teal)] font-semibold text-[var(--teal)]"
                : "border-transparent font-medium text-[var(--text2)] hover:text-[var(--text)]"
            }`}
            id={`tab-${tab.id}`}
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
          >
            <Icon aria-hidden="true" size={14} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
