import { useState } from 'react';
import { CrudPanel }         from './panels/CrudPanel';
import { FiltersPanel }      from './panels/FiltersPanel';
import { SortPagePanel }     from './panels/SortPagePanel';
import { RelationsPanel }    from './panels/RelationsPanel';
import { ProjectionPanel }   from './panels/ProjectionPanel';
import { CustomRoutesPanel } from './panels/CustomRoutesPanel';
import { TemplatesPanel }    from './panels/TemplatesPanel';
import { HandlersPanel }     from './panels/HandlersPanel';

const TABS = [
  { id: 'crud',       label: 'Phase 1 — CRUD'      },
  { id: 'filters',    label: 'Phase 2 — Filters'    },
  { id: 'sortpage',   label: 'Sort · Pagination'    },
  { id: 'relations',  label: 'Relations'             },
  { id: 'projection', label: 'Projection'            },
  { id: 'custom',     label: '4A — Static routes'   },
  { id: 'templates',  label: '4B — Templates'       },
  { id: 'handlers',   label: '4D — Handlers'        },
] as const;

type TabId = (typeof TABS)[number]['id'];

const PANELS: Record<TabId, React.ComponentType> = {
  crud:       CrudPanel,
  filters:    FiltersPanel,
  sortpage:   SortPagePanel,
  relations:  RelationsPanel,
  projection: ProjectionPanel,
  custom:     CustomRoutesPanel,
  templates:  TemplatesPanel,
  handlers:   HandlersPanel,
};

export function ApiExplorer() {
  const [activeTab, setActiveTab] = useState<TabId>('crud');
  const ActivePanel = PANELS[activeTab];

  return (
    <section className="explorer-section">
      <div className="explorer-header">
        <p className="explorer-title">API Explorer</p>
        <nav className="tabs" role="tablist">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab${activeTab === tab.id ? ' active' : ''}`}
              role="tab"
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
