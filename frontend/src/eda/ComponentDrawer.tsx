import { useState } from "react";
import {
  Activity,
  Cpu,
  Layers,
  Plus,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import type { ComponentCategory, EdaComponentDef } from "./types";
import { EDA_COMPONENT_CATALOG } from "./componentsCatalog";
import { ComponentGlyph } from "./ComponentGlyphs";

interface ComponentDrawerProps {
  onAddComponent: (def: EdaComponentDef) => void;
}

const CATEGORIES: Array<{ id: "all" | ComponentCategory; label: string }> = [
  { id: "all", label: "All Components" },
  { id: "passives", label: "Passives" },
  { id: "semiconductors", label: "Semiconductors" },
  { id: "ics", label: "Analog ICs" },
  { id: "digital", label: "Digital (Vivado)" },
  { id: "sources", label: "Power & Sources" },
  { id: "outputs", label: "Outputs & Actuators" },
];

export default function ComponentDrawer({ onAddComponent }: ComponentDrawerProps) {
  const [selectedCategory, setSelectedCategory] = useState<"all" | ComponentCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredComponents = EDA_COMPONENT_CATALOG.filter((comp) => {
    const matchCategory = selectedCategory === "all" || comp.category === selectedCategory;
    const matchSearch =
      comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <aside className="eda-component-drawer" aria-label="Component Catalog">
      {/* Drawer Header */}
      <div className="drawer-header">
        <div className="drawer-title-row">
          <Layers size={15} className="drawer-icon" />
          <h3>Component Catalog</h3>
          <span className="part-count-badge">{filteredComponents.length}</span>
        </div>
        <p className="drawer-sub">
          Basic to advanced components. Click <strong>+ Place</strong> to mount on breadboard.
        </p>
      </div>

      {/* Instant Search Bar */}
      <div className="drawer-search-box">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Search 555, BJT, Resistor, Gate..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => setSearchQuery("")}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="drawer-category-pills" role="tablist">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`cat-pill ${selectedCategory === cat.id ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat.id)}
            role="tab"
            aria-selected={selectedCategory === cat.id}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Component Cards Scroll Grid */}
      <div className="drawer-parts-list">
        {filteredComponents.map((def) => (
          <div key={def.type} className="drawer-part-card">
            <div className="card-top-row">
              <span className="part-prefix-badge">{def.prefix}</span>
              <strong className="part-name">{def.name}</strong>
            </div>

            {/* Tinkercad Authentic SVG Component Glyph Preview */}
            <div className="card-glyph-container" aria-hidden="true">
              <ComponentGlyph type={def.type} width={56} height={36} />
            </div>

            <p className="part-desc">{def.description}</p>

            <div className="card-pins-row">
              <span className="pins-label">
                {def.pins.length} Terminals: {def.pins.map((p) => p.name).join(", ")}
              </span>
            </div>

            <div className="card-actions">
              <button
                type="button"
                className="btn-place-part"
                onClick={() => onAddComponent(def)}
                title={`Place ${def.name} onto canvas`}
              >
                <Plus size={13} />
                <span>+ Place on Canvas</span>
              </button>
            </div>
          </div>
        ))}

        {filteredComponents.length === 0 && (
          <div className="drawer-empty-state">
            <p>No components match &ldquo;{searchQuery}&rdquo;</p>
            <button
              type="button"
              className="btn-reset-filter"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
