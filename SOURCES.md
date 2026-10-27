# PatchPath source ledger

Reviewed 2026-10-27. This ledger tracks only decision-driving sources used for this local educational prototype. Current pages can change; re-check them before reusing recommendations.

## Supplied file

| ID | Source | Status | Reviewed claim / project fit | Unverified |
|---|---|---|---|---|
| LOCAL-01 | `Patchpath Dt Codex Masterplan` (extensionless, ~40 KB; content reviewed) | `content-reviewed` | Detailed product and UI specification. It contains engineering result assertions but no linked evidence URLs, so asserted temperatures, ripple, safety factors, test coverage, and blast-radius scores were not treated as facts. | No other supplied project source files were present in the folder inventory. |

## Web sources

| ID | Source | Status | Claim supported and how it was applied | Unverified / limits |
|---|---|---|---|---|
| DESIGN-01 | [Awwwards: State of AI 2025](https://www.awwwards.com/sites/state-of-ai-2025) | `content-reviewed` | Awwwards labels the report with on-scroll animation, mobile, navigation, timeline, transitions, and data visualization. Applied as a lesson in pacing and clear information navigation. | Award metadata does not prove the source page's usability or provide permission to copy its design. No style was copied. |
| DESIGN-02 | [Vention State of AI report](https://ventionteams.com/solutions/ai/report) | `content-reviewed` | The report's current page presents a navigable long-form report with linked topic sections. Used as a reference for editorial sequencing and readable data presentation. | HTML text was reviewed; the full visual interaction was not independently tested across devices. |
| CS-01 | [NVD CVE-2020-8203](https://nvd.nist.gov/vuln/detail/CVE-2020-8203) | `claim-verified` | Lodash versions before 4.17.20 are affected. Therefore 4.17.20 is not flagged for this CVE. | The app does not inspect call-site reachability or the installed lockfile version. |
| CS-02 | [NVD CVE-2021-23337](https://nvd.nist.gov/vuln/detail/CVE-2021-23337) | `claim-verified` | NVD marks lodash versions before 4.17.21 as affected. | Exact versions only; manifest ranges remain uncertain. |
| CS-03 | [GitHub advisory GHSA-xxjr-mmjv-4gpg / CVE-2025-13465](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg) | `claim-verified` | Lodash 4.0.0–4.17.22 affected; 4.17.23 patched. Added to the local matcher. | This is one bundled advisory, not a comprehensive dependency database. |
| CS-04 | [GitHub advisory GHSA-r5fr-rjxr-66jc / CVE-2026-4800](https://github.com/advisories/GHSA-r5fr-rjxr-66jc) | `claim-verified` | Lodash 4.0.0–4.17.23 affected; 4.18.0 patched. Added to the local matcher. | No reachability or runtime call graph analysis. |
| CS-05 | [Lodash release 4.18.1](https://github.com/lodash/lodash/releases/tag/4.18.1) | `claim-verified` | GitHub labels 4.18.1 as the latest release when reviewed. Used as the example recommendation floor with compatibility checks still required. | A release tag does not prove compatibility with an arbitrary consuming project. |
| ECE-01 | [Microchip MCP1702 datasheet](https://ww1.microchip.com/downloads/aemDocuments/documents/APID/ProductDocuments/DataSheets/MCP1702-Data-Sheet-DS20002008.pdf) | `claim-verified` | Maximum output is 250 mA for outputs at or above 2.5 V (200 mA below 2.5 V); the example's 350 mA load exceeds the rating. | Exact package, thermal layout, input/output behavior, and board conditions are not modeled. |
| ECE-02 | [TRACO TSR 1 series datasheet page](https://www.tracopower.com/tsr1-datasheet) | `content-reviewed` | The vendor table gives TSR 1-2450 as 5 V, 1 A, 6.5–36 V input, and 94% typical efficiency at minimum input. Used for the example rating comparison. | Vendor PDF URL returned 403 on a direct fetch; the official product data page was accessible. Efficiency at 12 V and board temperature/ripple were not measured. |
| FE-01 | [Three.js installation documentation](https://threejs.org/manual/pages/installation.html), [@types/three package](https://www.npmjs.com/package/@types/three) | `content-reviewed` | The project adds the community-maintained Three.js TypeScript declarations matching its pinned Three.js release. | Type compatibility is verified by the local build, not by the package page. |
| TOOL-01 | [pnpm approve-builds documentation](https://pnpm.io/cli/approve-builds) | `content-reviewed` | pnpm 11 records allowed dependency install scripts in `pnpm-workspace.yaml`. This project allows only esbuild, needed for the Vite build. | This approves that package's install step; it is not a general security review of the dependency tree. |

No source code, lockfile, circuit schematic, PCB layout, structural drawing, or test suite was supplied in the original folder. Consequently the bundled findings are teaching fixtures, not a complete scan or sign-off.
