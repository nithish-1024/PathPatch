export type Mode = "cs_repo" | "ece_circuit" | "civil_mech" | "mechanical_beam" | "custom_upskiller";
export type ViewLayer = "overview" | "topology" | "thermal" | "flow" | "logs" | "diff";

export interface GraphNode {
  id: string;
  label: string;
  layer: string;
  kind?: string;
  status?: string;
  position: [number, number, number] | number[];
  facts?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
  status?: string;
}

export interface SystemGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  faults?: string[];
  patches?: string[];
  evidence_note?: string;
}

export interface BreadboardComponent {
  id: string;
  label: string;
  kind: string;
  value: string;
  position: [number, number];
  pins?: { label: string; position: [number, number] }[];
}

export interface BreadboardWire {
  id: string;
  label: string;
  color: string;
  points: [number, number][];
}

export interface BreadboardModel {
  template: string;
  evidence_note: string;
  components: BreadboardComponent[];
  wires: BreadboardWire[];
}

export interface CandidatePlan {
  id: "plan_a" | "plan_b" | "plan_c";
  name: string;
  label: string;
  recommended?: boolean;
  summary: string;
  reason: string;
  evidence: string[];
  risks: string[];
  evidence_status: string;
  estimated_scope: string;
  source?: string;
  scenario?: Record<string, number>;
}

export interface AnalysisRun {
  id: string;
  mode: Mode;
  title: string;
  raw_input: string;
  selected_plan_id: string;
  system_graph_json: SystemGraph;
  candidate_plans_json: CandidatePlan[];
  upskilled_blueprint_json?: Record<string, unknown> | null;
  analysis_json: Record<string, any> & { health_score?: { score: number; label: string; factors: string[]; method: string } };
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  department: string;
}

export interface AuthSession {
  user: User;
}

export interface ProgressEvent {
  execution_id: string;
  sequence: number;
  step_name: string;
  status: string;
  message: string;
  duration_ms: number;
}
