# PatchPath learning and continuation plan

This plan follows the user's Path B choice: build the three-domain learning workbench with authentication, saved runs, a streaming simulation, a custom idea analyzer, and procedural 3D scenes. The attached masterplan is a product brief, not a source of verified engineering results.

## Architecture decisions

- Keep the first version local and deterministic: FastAPI, SQLite, typed Pydantic/TypeScript contracts, and a small number of domain engines. Browser sessions use an HttpOnly, SameSite=Lax cookie; HTTPS deployments must enable the Secure flag.
- The five-step job is a persisted linear simulation. A DAG framework or agent runtime would add moving parts without adding useful branching or recovery at this stage.
- Submitted code is never imported, executed, or built. GitHub mode fetches only `package.json` from a fixed raw GitHub host and enforces a 100 KB response limit. The UI calls the job a simulation; it is not an isolated execution sandbox.
- The repo analyzer uses a small, versioned advisory fixture set, not a complete live vulnerability database. Exact versions are checked; ranges stay uncertain. The frontend labels compatibility and reachability as unverified.
- The ECE and structural examples are teaching models. Their input assumptions and exclusions travel with results; neither produces a design approval.
- The 3D view is procedural and loads near the viewport. Static text and callouts remain available if WebGL fails or is reduced.

## What changed after challenging the brief

- The brief's recommendation of lodash `4.17.21` is stale. The local fixture now includes the later `CVE-2025-13465` and `CVE-2026-4800` advisories and recommends the checked upstream `4.18.1` release. The matcher still covers only its listed records.
- The brief associates lodash `4.17.20` with `CVE-2020-8203`, but that CVE affects versions *before* `4.17.20`. The demo version is instead affected by the `CVE-2021-23337`, `CVE-2025-13465`, and `CVE-2026-4800` records in the current fixture.
- An MCP1702 cannot supply the example's 350 mA continuous load: its datasheet maximum is 250 mA for outputs at or above 2.5 V. The example recommends a rated TSR 1-2450 module and leaves PCB validation open.
- The civil result is calculated for an 11-node, 19-member 2D truss created in code. The masterplan's 10-node/17-member counts and its asserted safety factors were not carried over as facts. Connections, code checks, imperfections, and out-of-plane stability remain outside the solver.
- The Awwwards example is used for information pacing, navigation, responsive composition, and purposeful data visualization. PatchPath uses its own parchment/field-notebook art direction; no page or motion sequence is copied.

## Learning route

Follow one complete request before changing anything:

1. **Frontend state and contract:** `frontend/src/App.tsx` calls `frontend/src/api/client.ts`; compare those types with `backend/app/schemas/contracts.py`.
2. **Input boundary:** follow `/api/v1/upskiller/analyze` in `backend/app/main.py`. See why JSON manifests and idea text take different paths, and why source code is never executed.
3. **Deterministic domain logic:** start with `backend/app/engines/cs_repo_engine.py`, then compare the stated assumptions in `ece_circuit_engine.py` and `civil_truss_engine.py`.
4. **Identity and storage:** trace `auth/security.py`, `db/models.py`, and `db/seed.py`. Confirm that every private run query checks the authenticated owner.
5. **Streaming:** read the simulation creation route, `_run_simulation`, log rows, and `/api/v1/stream/{execution_id}`; map each event to the UI log.
6. **Visual mapping:** follow `system_graph_json` into `frontend/src/scenes/`. Compare the 3D view with the text evidence beside it.
7. **Change one thing at a time:** run the backend tests and frontend build, then inspect the relevant failure state as well as the success state.

### Exercises

- Add one advisory fixture and boundary tests without turning a version range into an exact installed version.
- Change the ECE load in a test fixture and calculate the linear loss by hand before comparing output.
- Change a truss load or section, inspect the solver assumptions, and explain why passing this model is not construction approval.
- Add a project-input failure case and carry its error through Pydantic, FastAPI, and the modal without losing the evidence boundary.
- Add one scene affordance, then verify touch, keyboard text access, reduced motion, and the no-WebGL state.

## Skill plan and fit

Use the skills that change the work; do not force every installed skill into this project.

| Skill | Use in PatchPath |
|---|---|
| `lexicon-lantern-fox` | Turn the broad masterplan into a bounded local product and typed contracts before implementation. |
| `source-scout-squirrel` | Keep a dated source ledger; separate source claims, model output, assumptions, and unresolved checks. |
| `backend-beaver` | Build the API, persistence, auth, analysis services, and SSE lifecycle. |
| `security-shield-hedgehog` | Keep inputs untrusted, limit remote fetches, enforce ownership, hash passwords, and avoid code execution. |
| `pixel-penguin-ui` | Shape the responsive, accessible workbench and the evidence/results states. |
| `motion-magic-moth` | Keep scroll and interface motion restrained and respect reduced motion. |
| `threejs-stardust-cat` | Build procedural domain scenes with deferred loading and a static fallback. |
| `evals-watch-owl` | Verify advisory boundaries, domain fixtures, ownership, persistence, and streamed completion. |
| `devops-cloud-owl` | Keep setup reproducible and identify local-runtime limits; deployment remains a later decision. |

`data-garden-bear` is not needed for this small relational store: there is no RAG, vector search, or complex retrieval problem. `agent-flow-otter` is also not needed as a runtime framework: this job is a fixed five-step state sequence with no agent tools or branching DAG. The persisted state-machine idea is retained without adding LangGraph. A real isolated code runner would need its own explicit threat model and resource boundary before implementation.

## Implementation phases

| Phase | Scope | Status |
|---|---|---|
| 0. Brief and evidence audit | Inspect the attached masterplan; correct stale advisory and component claims; mark assumptions. | Complete |
| 1. Contracts and backend | FastAPI, SQLAlchemy models, bcrypt/JWT HttpOnly-cookie auth with sign-out, demo seed data, domain engines, owner-scoped history. | Complete |
| 2. Custom analyzer and jobs | Deterministic idea scaffold, bounded manifest intake, persisted five-step simulation, SSE stream. | Complete |
| 3. Product UI | Editorial landing page, mode switcher, inspection rail, evidence panel, plan deck, auth/history/diff modals. | Complete |
| 4. Procedural studio | Three domain scenes and custom graph view, accessible text, reduced-motion behavior, deferred 3D bundle. | Complete |
| 5. Verification | Domain/API tests and TypeScript/Vite production build. | Complete |
| 6. Next learning milestone | Ask a real learner to use the prototype; select one narrow failure in the current flow and add an evaluation case before expanding domains. | Not started |

## Separate Codex chat prompts

These prompts are for separate chats opened in the same `dt_lab` project. The chats share the project files, so run them **in sequence**, not concurrently. Each prompt starts from the implementation already present and assigns a narrow ownership boundary.

### Chat 1 — Backend and security hardening

```text
In the dt_lab project, read Patchpath Dt Codex Masterplan, LEARNING_AND_AGENT_PLAN.md, SOURCES.md, and the current backend. Continue the existing implementation; do not scaffold a second app. Own backend/ only. Review the auth/session boundary, API input limits, persisted simulation lifecycle, and advisory fixture freshness. Implement one well-scoped hardening pass with tests. Never execute submitted source, run submitted build scripts, or fetch arbitrary URLs. Keep exact-version evidence separate from ranges and label the advisory set as incomplete. Preserve the simple persisted five-step flow unless a measured need justifies more machinery. Report changed files, tests run, trade-offs, and remaining risks.
```

### Chat 2 — UI craft and accessibility

```text
In the same dt_lab project, read DESIGN.md, LEARNING_AND_AGENT_PLAN.md, and the current frontend/API types. Improve the existing interface; do not replace it with a generic dashboard. Own frontend/src/components/layout, frontend/src/components/modals, and frontend/src/index.css. Preserve the editorial field-notebook direction and make evidence, assumptions, and recommendations easy to distinguish. Check responsive behavior, keyboard focus, readable loading/error/empty states, and reduced motion. Do not invent scores or backend results, and do not change backend contracts. Run the frontend build and report the specific UX changes and remaining gaps.
```

### Chat 3 — 3D scene and motion

```text
In the same dt_lab project, read DESIGN.md, LEARNING_AND_AGENT_PLAN.md, and the existing graph/types. Own frontend/src/scenes and the motion integration only. Improve the procedural scenes to explain one domain relationship at a time; keep text facts outside the canvas. Preserve deferred loading, touch controls, reduced-motion behavior, and the static WebGL fallback. Use only values that come from the typed analysis or visibly labeled assumptions. Do not expand the API schema or add scroll choreography without a clear learning benefit. Run the frontend build and summarize bundle/runtime trade-offs.
```

### Chat 4 — Evaluation and product review

```text
In the same dt_lab project, read the masterplan, LEARNING_AND_AGENT_PLAN.md, SOURCES.md, and current implementation. Own backend/tests and review documentation only. Add a compact evaluation set for verified claims, boundary inputs, ownership isolation, job interruption, SSE ordering, and unsupported engineering assumptions. Keep expected outcomes explicit. If code changes outside tests/docs are needed, identify the issue and propose the smallest patch before editing those files. Run the relevant checks and report exactly what ran, what failed, and what remains unverified. Do not call this local prototype production-ready or an isolated code sandbox.
```

## Current verification

- Backend: `backend/.venv/Scripts/python.exe -m pytest -q` — 5 tests passed, including HttpOnly cookie login, sign-out, and protected-route checks.
- Frontend: `pnpm build` — TypeScript checks and Vite production build passed. The initial JS bundle is about 324 KB (111 KB gzip); the deferred 3D bundle is about 1.01 MB (284 KB gzip).
- A single deprecation warning remains in FastAPI's test-client integration with the installed Starlette/httpx combination. It does not fail the tests.
- Manual desktop browser review confirmed the editorial hero, studio layout, data card, and procedural scene render. Mobile device review and production deployment checks have not been performed.
