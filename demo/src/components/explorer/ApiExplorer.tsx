import React, { useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { AuthPanel } from "./panels/AuthPanel";
import { CrudPanel } from "./panels/CrudPanel";
import { FiltersPanel } from "./panels/FiltersPanel";
import { SortPagePanel } from "./panels/SortPagePanel";
import { RelationsPanel } from "./panels/RelationsPanel";
import { ProjectionPanel } from "./panels/ProjectionPanel";
import { CustomRoutesPanel } from "./panels/CustomRoutesPanel";
import { TemplatesPanel } from "./panels/TemplatesPanel";
import { HandlersPanel } from "./panels/HandlersPanel";

const TABS = [
  { id: "auth", label: "Auth" },
  { id: "crud", label: "CRUD" },
  { id: "filters", label: "Filters" },
  { id: "sortpage", label: "Sort & Page" },
  { id: "relations", label: "Relations" },
  { id: "projection", label: "Fields" },
  { id: "custom", label: "Custom Routes" },
  { id: "templates", label: "Templates" },
  { id: "handlers", label: "Handlers" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PANELS: Record<TabId, React.ComponentType> = {
  auth: AuthPanel,
  crud: CrudPanel,
  filters: FiltersPanel,
  sortpage: SortPagePanel,
  relations: RelationsPanel,
  projection: ProjectionPanel,
  custom: CustomRoutesPanel,
  templates: TemplatesPanel,
  handlers: HandlersPanel,
};

/**
 * Tabbed API Explorer that lets users exercise every yrest feature interactively.
 *
 * Only the active panel is mounted — switching tabs unmounts the previous one
 * so each panel resets to its initial state cleanly.
 */
export function ApiExplorer() {
  const [activeTab, setActiveTab] = useState<TabId>("auth");
  const { state } = useAppContext();
  const session = state.session;

  const ActivePanel = PANELS[activeTab];

  return (
    <section className="explorer-section">
      <div className="explorer-header">
        <div className="explorer-top">
          <p className="explorer-title">API Explorer</p>
          {session ? (
            <div className="session-badge logged-in" title={`${session.name} · ${session.email}`}>
              <span className="session-avatar-lg">{session.avatar}</span>
              <span className="session-name">{session.name}</span>
            </div>
          ) : (
            <div className="session-badge logged-out" title="Not signed in">
              <span className="session-avatar-lg">?</span>
              <span className="session-name">Not signed in</span>
            </div>
          )}
        </div>
        <nav className="tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab${activeTab === tab.id ? " active" : ""}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="tab-panel">
        <ActivePanel />
      </div>
    </section>
  );
}
