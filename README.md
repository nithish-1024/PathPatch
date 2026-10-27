# PatchPath Universal

An educational engineering workbench for inspecting software dependencies, breadboard circuits, an ideal truss, and a simple mechanical beam. Each example separates calculated values from assumptions. The 3D scenes are explanatory views; they are not engineering certification or a sandbox for submitted code.

## Start locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --env-file .env
```

The API is at `http://127.0.0.1:8000`; interactive API docs are at `/docs`.

### Frontend

```powershell
cd frontend
pnpm install
pnpm dev
```

If `pnpm` is not on PATH, use the bundled executable at:
`C:\Users\red\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd`.

If port 8000 is already in use, start the backend with `uvicorn app.main:app --reload --port 8001` and create `frontend/.env.local` containing `VITE_API_PROXY_TARGET=http://127.0.0.1:8001` before starting Vite.

## Demo account

- Email: `demo@patchpath.ai`
- Password: `patchpath2026`

This fixed credential is only for the local educational demo. Set a new secret and password before exposing the app to a network.

The browser session is an `HttpOnly`, `SameSite=Lax` cookie and the API does not return the JWT to JavaScript. Set `PATCHPATH_COOKIE_SECURE=true` when serving over HTTPS. Keep the frontend and API same-site behind the development proxy or a same-site reverse proxy.

## Learn in this order

1. **Contracts:** inspect `backend/app/schemas/contracts.py` and the TypeScript types.
2. **Deterministic analysis:** follow the input through the domain engines. No uploaded source is executed.
3. **Persistence and identity:** inspect SQLAlchemy models, demo seeding, and ownership checks.
4. **Streaming:** run a rule-based plan simulation and follow the sequenced SSE events.
5. **Visualization:** map the same typed graph to procedural scene geometry.

See [LEARNING_AND_AGENT_PLAN.md](LEARNING_AND_AGENT_PLAN.md) for the phase plan, exercises, skill map, and separate same-project Codex chat prompts. See [SOURCES.md](SOURCES.md) for claim provenance and evidence limits.

## Use the workbench

- **Repositories:** choose a local project folder. The browser reads only `package.json` and npm `package-lock.json` metadata; it does not upload or execute source files. The current bundled advisory matcher is limited to Lodash.
- **Breadboard:** start from the regulator sample, or draft one of the currently supported circuits: a series LED with resistor, or ESP32 + DHT22. The generated 3D layout is a wiring draft with explicit assumptions, not a circuit simulator or hardware certification.
- **Civil truss:** inspect the fixed five-panel 2D truss and change its total load in kN. It is an idealized axial-member model, not a general CAD or mechanical solver.
- **Mechanical beam:** describe a simply supported rectangular beam with one center point load. Span, load, width, depth, and Young’s modulus accept explicit units; omitted values use the starter assumptions shown in the input example. The view compares a wider section, a deeper section, and a lower load. Its closed-form Euler–Bernoulli estimate does not calculate a safety factor or check a design code.
- **Your idea:** enter an idea to get a deterministic, keyword-based architecture learning template. It is not an LLM-generated or validated design.
- Use **Overview** for the inputs and key values, **Topology** for parts, **Risk / Stress / Thermal** for findings and assumptions, **Flow** for connections, **Run log** for the rule-based teaching simulation, and **Patch notes** for the selected option and its evidence/risks.

## Local data

The default local SQLite database is `backend/patchpath.db` (when the backend is started from the `backend` directory as shown above). Open it with a SQLite viewer such as DB Browser for SQLite. Analysis runs and demo-user records are stored there. Use **Runs** in the app to review runs saved to your signed-in account.

## Evidence limits

- A manifest version range does not prove which package version is installed; a lockfile is needed for that.
- The ECE example uses an explicitly stated thermal-resistance assumption. The switching-regulator estimate uses a typical-efficiency data point and is not a measured board temperature.
- The truss solver models ideal 2D axial members. It does not check connection design, fatigue, lateral stability, codes, or construction conditions.
- The beam solver uses the fixed, static, center-load case with a homogeneous rectangular section. It omits shear deformation, self-weight, material failure, buckling, joints, fatigue, and design codes; its deflection curve is visually exaggerated.
- The idea upskiller uses a deterministic template and keyword lens. It is not an LLM and cannot establish that a suggested architecture is correct for every project.
- The “isolated sandbox” action is an educational rule simulation. It does not run code or containers.

