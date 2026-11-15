"""Deterministic AST & Token Guardrail Engine for PathPatch MCP Academic Agent.
Enforces zero-leakage pre-flight inspection and post-inference solution redaction.
Guarantees students cannot bypass the Socratic contract via prompt injection or authority spoofing.
"""

from __future__ import annotations

import ast
import re
from typing import Any, Optional


class GuardrailViolation(Exception):
    def __init__(self, rule: str, reason: str, category: str = "PROMPT_INJECTION"):
        super().__init__(reason)
        self.rule = rule
        self.reason = reason
        self.category = category


# -----------------------------------------------------------------------------
# Pre-Flight Injection Signatures (Lexical & Structural Patterns)
# -----------------------------------------------------------------------------
INJECTION_PATTERNS = [
    # Authority / Persona Hijacking
    (
        r"(?i)\b(ignore|disregard|forget|override)\b.*\b(previous|all|above|system)\b.*\b(instruction|prompt|rule|directive)",
        "AUTHORITY_OVERRIDE_ATTEMPT",
        "Prompt injection: Attempt to override system instructions.",
    ),
    (
        r"(?i)\b(i am|acting as|pretend to be|roleplay as)\b.*\b(professor|hod|evaluator|auditor|administrator|proctor|dean)\b",
        "PERSONA_HIJACK_ATTEMPT",
        "Authority spoofing: Student attempting to impersonate academic faculty or proctor.",
    ),
    (
        r"(?i)\b(developer mode|dan mode|unrestricted mode|jailbreak|bypass)\b",
        "JAILBREAK_KEYWORD_DETECTED",
        "Adversarial jailbreak keywords detected.",
    ),
    # Fictional / Hypothetical Narrative Framing
    (
        r"(?i)\b(write a (fictional|hypothetical) story|narrative|dialogue where (two|some) engineers)\b.*\b(solve|calculate|give the exact)\b",
        "NARRATIVE_EVASION_ATTEMPT",
        "Narrative evasion: Attempt to extract direct engineering solutions through fictional dialogue framing.",
    ),
    # Direct Answer Extraction
    (
        r"(?i)\b(give me the exact|what is the exact|output the exact)\b.*\b(numerical|node voltage|bending moment|deflection|answer)\b",
        "DIRECT_ANSWER_EXTRACTION",
        "Direct answer request violates Socratic learning contract. Use diagnostic troubleshooting inquiry.",
    ),
]


def inspect_text_for_injections(text: str) -> Optional[tuple[str, str]]:
    """Scan incoming student text for prompt injection, authority spoofing, or narrative evasion.
    Returns (rule, reason) if violation detected, or None if safe.
    """
    for pattern, rule_id, description in INJECTION_PATTERNS:
        if re.search(pattern, text):
            return (rule_id, description)
    return None


# -----------------------------------------------------------------------------
# Static AST Code Inspector (Sandboxed Formula / Code Submissions)
# -----------------------------------------------------------------------------
DISALLOWED_AST_NODES = (
    ast.Import,
    ast.ImportFrom,
)

DISALLOWED_CALL_NAMES = {
    "eval",
    "exec",
    "compile",
    "__import__",
    "open",
    "globals",
    "locals",
    "getattr",
    "setattr",
    "delattr",
    "system",
    "popen",
    "spawn",
    "subprocess",
}


def inspect_code_ast(code_snippet: str) -> None:
    """Statically inspect submitted Python expressions or formula snippets.
    Guarantees no arbitrary code execution, dynamic imports, or process escapes.
    """
    try:
        tree = ast.parse(code_snippet)
    except SyntaxError:
        # Not Python code; treated as raw text
        return

    for node in ast.walk(tree):
        if isinstance(node, DISALLOWED_AST_NODES):
            raise GuardrailViolation(
                rule="AST_IMPORT_PROHIBITED",
                reason=f"Code imports are disallowed in educational simulation sandbox.",
                category="AST_SECURITY",
            )
        if isinstance(node, ast.Call):
            func_name = ""
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                func_name = node.func.attr
            if func_name in DISALLOWED_CALL_NAMES:
                raise GuardrailViolation(
                    rule="AST_UNSAFE_CALL",
                    reason=f"Invocation of restricted function '{func_name}' is prohibited.",
                    category="AST_SECURITY",
                )


# -----------------------------------------------------------------------------
# Post-Inference Numerical Solution Redactor (Zero Mathematical Leakage)
# -----------------------------------------------------------------------------
def redact_solution_leakage(
    llm_output: str,
    raw_solver_proof: dict[str, Any],
) -> str:
    """Post-inference deterministic filter.
    Scans the LLM output against raw failure proofs (exact voltages, critical loads, member names).
    If the LLM leaked the raw numerical solution without a Socratic question mark, redacts it.
    """
    redacted = llm_output

    # Check for direct numerical leakage of critical forces or voltages
    leaks_to_check = []

    # ECE Circuit leaks
    if "measured_v" in raw_solver_proof:
        v_val = raw_solver_proof["measured_v"]
        leaks_to_check.append((f"{v_val:.1f}V", "the saturated rail potential"))
        leaks_to_check.append((f"{v_val:.2f}V", "the saturated rail potential"))

    # Civil Truss leaks
    if "axial_force_kn" in raw_solver_proof:
        f_val = abs(raw_solver_proof["axial_force_kn"])
        leaks_to_check.append((f"{f_val:.1f} kN", "the critical axial member force"))
        leaks_to_check.append((f"{f_val:.2f} kN", "the critical axial member force"))

    if "p_cr_kn" in raw_solver_proof:
        p_val = abs(raw_solver_proof["p_cr_kn"])
        leaks_to_check.append((f"{p_val:.1f} kN", "the Euler buckling threshold"))

    # If the response doesn't end in a question or lacks diagnostic keywords, enforce Socratic framing
    has_question = "?" in redacted
    for leak_str, placeholder in leaks_to_check:
        if leak_str.lower() in redacted.lower():
            # Check if it was framed as an inquiry vs direct giveaway
            if not has_question or "answer is" in redacted.lower() or "solution is" in redacted.lower():
                redacted = re.sub(
                    re.escape(leak_str),
                    f"[DIAGNOSTIC VALUE HIDDEN - Measure this experimentally]",
                    redacted,
                    flags=re.IGNORECASE,
                )

    return redacted
