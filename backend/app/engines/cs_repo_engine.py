"""Deterministic manifest analysis. This module never imports or executes project code."""

import json
import re
from urllib.parse import urlparse

import httpx
from packaging.version import InvalidVersion, Version


ADVISORIES = [
    {
        "id": "CVE-2021-23337",
        "package": "lodash",
        "title": "Command injection through the template function",
        "affected": "versions before 4.17.21",
        "fixed": "4.17.21",
        "source": "https://nvd.nist.gov/vuln/detail/CVE-2021-23337",
    },
    {
        "id": "CVE-2020-8203",
        "package": "lodash",
        "title": "Prototype pollution through zipObjectDeep",
        "affected": "versions before 4.17.20",
        "fixed": "4.17.20",
        "source": "https://nvd.nist.gov/vuln/detail/CVE-2020-8203",
    },
    {
        "id": "CVE-2025-13465",
        "package": "lodash",
        "title": "Prototype pollution through unset and omit paths",
        "affected": "versions 4.0.0 through 4.17.22",
        "fixed": "4.17.23",
        "source": "https://github.com/advisories/GHSA-xxjr-mmjv-4gpg",
    },
    {
        "id": "CVE-2026-4800",
        "package": "lodash",
        "title": "Code injection through template imports key names",
        "affected": "4.0.0 through 4.17.23",
        "fixed": "4.18.0",
        "source": "https://github.com/advisories/GHSA-r5fr-rjxr-66jc",
    },
]

CURRENT_LODASH_RELEASE = "4.18.1"
LODASH_RELEASE_SOURCE = "https://github.com/lodash/lodash/releases/tag/4.18.1"
MAX_MANIFEST_BYTES = 100_000
_VERSION = re.compile(r"^\s*[v=]?(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?\s*$")
_GITHUB_PART = re.compile(r"^[A-Za-z0-9_.-]{1,100}$")


def _exact_version(raw: str) -> Version | None:
    if not _VERSION.match(raw):
        return None
    try:
        return Version(raw.strip().lstrip("v="))
    except InvalidVersion:
        return None


def _affected(advisory: dict, version: Version) -> bool:
    if advisory["id"] == "CVE-2026-4800":
        # GHSA-r5fr-rjxr-66jc lists 4.0.0 through 4.17.23 as affected.
        return Version("4.0.0") <= version <= Version("4.17.23")
    return version < Version(advisory["fixed"])


def parse_manifest(raw: str) -> dict:
    if len(raw.encode("utf-8")) > MAX_MANIFEST_BYTES:
        raise ValueError("package.json is larger than 100 KB.")
    try:
        manifest = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc.msg} at line {exc.lineno}.") from exc
    if not isinstance(manifest, dict):
        raise ValueError("package.json must contain a JSON object.")
    deps: dict[str, str] = {}
    for section in ("dependencies", "devDependencies", "optionalDependencies"):
        section_value = manifest.get(section, {})
        if not isinstance(section_value, dict):
            raise ValueError(f"{section} must be a JSON object.")
        for name, version in section_value.items():
            if isinstance(name, str) and isinstance(version, (str, int, float)):
                deps[name] = str(version)
    return {"manifest": manifest, "dependencies": deps}


def fetch_github_package_json(url: str) -> tuple[str, str]:
    """Fetch only a GitHub repository's package.json from a fixed public host."""
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "github.com" or parsed.port not in (None, 443):
        raise ValueError("Repository URL must use https://github.com/owner/repository.")
    if parsed.query or parsed.fragment:
        raise ValueError("Repository URL must not include query parameters or a fragment.")
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) != 2 or not all(_GITHUB_PART.fullmatch(part) for part in parts):
        raise ValueError("Use a public repository URL in the form github.com/owner/repository.")
    owner, repo = (part.removesuffix(".git") for part in parts)
    if not owner or not repo:
        raise ValueError("Repository owner and name are required.")
    raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/package.json"
    try:
        with httpx.Client(timeout=5.0, follow_redirects=False, headers={"Accept": "application/json"}) as client:
            with client.stream("GET", raw_url) as response:
                if response.status_code != 200:
                    raise ValueError("Could not read package.json from that repository. Paste the manifest instead.")
                chunks = bytearray()
                for chunk in response.iter_bytes():
                    chunks.extend(chunk)
                    if len(chunks) > MAX_MANIFEST_BYTES:
                        raise ValueError("Remote package.json is larger than 100 KB.")
    except httpx.HTTPError as exc:
        raise ValueError("Could not reach the public repository. Paste package.json to analyze offline.") from exc
    try:
        return chunks.decode("utf-8"), raw_url
    except UnicodeDecodeError as exc:
        raise ValueError("Remote package.json is not valid UTF-8. Paste the manifest instead.") from exc


def analyze_manifest(
    raw: str,
    title: str = "Dependency scan",
    source_url: str | None = None,
    resolved_versions: dict[str, str] | None = None,
) -> dict:
    parsed = parse_manifest(raw)
    manifest = parsed["manifest"]
    dependencies = parsed["dependencies"]
    resolved_versions = resolved_versions or {}
    findings = []
    uncertainty = []
    lodash_raw = dependencies.get("lodash")
    lodash_resolved = resolved_versions.get("lodash")
    lodash_version = _exact_version(lodash_resolved or lodash_raw) if (lodash_resolved or lodash_raw) else None

    if lodash_raw and lodash_version:
        for advisory in ADVISORIES:
            if _affected(advisory, lodash_version):
                findings.append({**advisory, "installed_version": str(lodash_version), "status": "affected"})
        if lodash_version.is_prerelease:
            uncertainty.append({
                "package": "lodash",
                "declared_range": lodash_raw,
                "message": "Pre-release versions are not covered by the bundled advisory matcher; verify the exact build and upstream advisory.",
            })
    elif lodash_raw:
        uncertainty.append({
            "package": "lodash",
            "declared_range": lodash_raw,
            "message": "The manifest declares a range, not the resolved install. Supply a supported package-lock.json for exact-version findings.",
        })

    plan_b = {
        "id": "plan_b",
        "name": "PatchPath · focused patch",
        "label": "B",
        "recommended": bool(findings),
        "summary": f"Raise lodash to {CURRENT_LODASH_RELEASE} or a later compatible release.",
        "reason": "The project advisory marks the 4.18.0 line as patched; 4.18.1 is the current upstream release checked for this demo.",
        "evidence": [
            "CVE-2026-4800 advisory patched version: 4.18.0",
            "Upstream lodash release: 4.18.1",
        ],
        "risks": ["Run the project's compatibility and unit checks before merging."],
        "evidence_status": "advisory-backed; compatibility tests not run",
        "estimated_scope": "one declared dependency; lockfile update required",
        "source": LODASH_RELEASE_SOURCE,
    }
    plans = [
        {
            "id": "plan_a", "name": "Blind major upgrade", "label": "A", "recommended": False,
            "summary": "Do not select an unverified major target from a security alert alone.",
            "reason": "The manifest and API callers were not analyzed deeply enough to claim a major version is compatible.",
            "evidence": ["No target version or caller test was supplied."],
            "risks": ["Potential API breaks; no compatibility evidence."],
            "evidence_status": "not evaluated", "estimated_scope": "unknown",
        },
        plan_b,
        {
            "id": "plan_c", "name": "Replace with native helpers", "label": "C", "recommended": False,
            "summary": "Consider a dependency removal only after mapping its call sites.",
            "reason": "No source tree or import graph was supplied, so a safe refactor size cannot be calculated.",
            "evidence": ["Source analysis was not run."],
            "risks": ["Higher change surface; behavior differences need regression tests."],
            "evidence_status": "not evaluated", "estimated_scope": "potentially broad",
        },
    ]

    if not findings and not uncertainty:
        plan_b["recommended"] = False
        plan_b["summary"] = "No matching advisory in the bundled lodash records."
        plan_b["reason"] = "This is not a complete or live scan; verify against the current package lock and advisory database."

    nodes = [
        {"id": "app", "label": manifest.get("name") or title, "layer": "experience", "kind": "system", "status": "stable", "position": [0, 0, 0]},
    ]
    edges = []
    for index, (name, version) in enumerate(sorted(dependencies.items())[:32]):
        x = ((index % 8) - 3.5) * 0.78
        z = ((index // 8) - 1.5) * 0.85
        node_id = f"dep-{index}"
        is_fault = name == "lodash" and bool(findings)
        nodes.append({
            "id": node_id, "label": name, "layer": "product", "kind": "dependency",
            "status": "fault" if is_fault else "stable", "position": [x, 0.2, z],
            "facts": {"declared": version, "resolved": resolved_versions.get(name) or (str(_exact_version(version)) if _exact_version(version) else "unknown")},
        })
        edges.append({"source": "app", "target": node_id, "label": "depends on", "status": "fault" if is_fault else "stable"})

    return {
        "title": manifest.get("name") or title,
        "mode": "cs_repo",
        "package_count": len(dependencies),
        "findings": findings,
        "uncertainty": uncertainty,
        "source_url": source_url,
        "advisory_checked_at": "2026-10-27",
        "evidence_note": "Package-manifest analysis only. Application call-site reachability and non-Lodash advisories are not checked.",
        "system_graph": {"nodes": nodes, "edges": edges, "faults": [f["id"] for f in findings], "patches": ["upgrade lodash to a compatible patched version"] if findings else [], "evidence_note": "Nodes visualize declared manifest dependencies, not a complete runtime call graph."},
        "candidate_plans": plans,
    }


def analyze_repository_files(files: dict[str, str], title: str = "Repository review") -> tuple[str, dict]:
    """Analyze selected package manifests and an npm lockfile; never inspect or execute source files."""
    manifests = [(path, content) for path, content in files.items() if path.replace("\\", "/").endswith("package.json")]
    if not manifests:
        raise ValueError("The selected folder does not contain a package.json file.")
    if len(manifests) > 20:
        raise ValueError("Select a repository with no more than 20 package.json files for this prototype.")
    manifests.sort(key=lambda item: (item[0].count("/"), len(item[0])))
    parsed_manifests = [(path, content, parse_manifest(content)["manifest"]) for path, content in manifests]
    root_path, root_raw, root_manifest = parsed_manifests[0]
    merged: dict[str, object] = {"name": root_manifest.get("name") or title}
    all_dependencies: dict[str, str] = {}
    for _, _, manifest in parsed_manifests:
        for section in ("dependencies", "devDependencies", "optionalDependencies"):
            values = manifest.get(section, {})
            if not isinstance(values, dict):
                raise ValueError(f"{section} in a selected package.json must be an object.")
            for name, version in values.items():
                if isinstance(name, str) and isinstance(version, (str, int, float)):
                    all_dependencies[name] = str(version)
    merged["dependencies"] = all_dependencies

    resolved: dict[str, str] = {}
    lockfiles = [(path, content) for path, content in files.items() if path.replace("\\", "/").endswith("package-lock.json")]
    if lockfiles:
        lockfiles.sort(key=lambda item: (item[0].count("/"), len(item[0])))
        try:
            lock = json.loads(lockfiles[0][1])
        except json.JSONDecodeError as exc:
            raise ValueError("The selected package-lock.json is not valid JSON.") from exc
        if not isinstance(lock, dict):
            raise ValueError("package-lock.json must contain a JSON object.")
        packages = lock.get("packages")
        if isinstance(packages, dict):
            for package_path, metadata in packages.items():
                if not isinstance(package_path, str) or not isinstance(metadata, dict):
                    continue
                parts = package_path.replace("\\", "/").split("node_modules/")
                if len(parts) < 2:
                    continue
                tail = parts[-1].split("/")
                package_name = "/".join(tail[:2]) if tail and tail[0].startswith("@") and len(tail) > 1 else tail[0]
                version = metadata.get("version")
                if isinstance(version, str):
                    resolved[package_name] = version
        else:
            def collect_nested(entries: object) -> None:
                if not isinstance(entries, dict):
                    return
                for package_name, metadata in entries.items():
                    if not isinstance(metadata, dict):
                        continue
                    if isinstance(metadata.get("version"), str):
                        resolved[package_name] = metadata["version"]
                    collect_nested(metadata.get("dependencies"))
            collect_nested(lock.get("dependencies"))

    result = analyze_manifest(json.dumps(merged), str(merged["name"]), resolved_versions=resolved)
    result["repository_scan"] = {
        "manifest_count": len(parsed_manifests),
        "manifest_paths": [path for path, _, _ in parsed_manifests],
        "lockfile_path": lockfiles[0][0] if lockfiles else None,
        "resolved_package_count": len(resolved),
        "coverage_note": "Only package.json and npm package-lock.json metadata were parsed. Source code was not uploaded, indexed, executed, or checked for call-site reachability.",
    }
    result["evidence_note"] = result["repository_scan"]["coverage_note"]
    result["system_graph"]["evidence_note"] = result["repository_scan"]["coverage_note"]
    return root_raw, result


def demo_manifest() -> str:
    return json.dumps({
        "name": "ledger-service-demo",
        "version": "1.0.0",
        "dependencies": {
            "lodash": "4.17.20", "express": "4.18.2", "axios": "1.6.8",
            "jsonwebtoken": "9.0.2", "zod": "3.23.8", "pino": "8.21.0",
            "dayjs": "1.11.10", "nanoid": "5.0.7", "undici": "6.18.0",
            "helmet": "7.1.0", "cors": "2.8.5", "dotenv": "16.4.5",
        },
    }, indent=2)

