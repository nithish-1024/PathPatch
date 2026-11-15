"""PathPatch Local-to-Cloud MCP Stdio Bridge.
Enables Claude Desktop, Claude Code, and Cursor on student laptops to seamlessly connect
to the remote PathPatch MCP Server on Vercel/Cloud with zero friction and secure JWT auth.
Standard library only: requires zero extra pip packages!
"""

import json
import os
import sys
import urllib.error
import urllib.request


def run_bridge():
    # Read configuration from environment or CLI arguments
    remote_url = os.getenv("PATHPATCH_MCP_URL", "https://path-patch.vercel.app/api/v1/mcp")
    auth_token = os.getenv("PATHPATCH_AUTH_TOKEN", "")

    if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        remote_url = sys.argv[1]
    if len(sys.argv) > 2:
        auth_token = sys.argv[2]

    # Stdio loop for JSON-RPC 2.0
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req_data = line.encode("utf-8")
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "PathPatch-Stdio-Bridge/1.0",
            }
            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"

            req = urllib.request.Request(remote_url, data=req_data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                response_bytes = resp.read()
                sys.stdout.write(response_bytes.decode("utf-8") + "\n")
                sys.stdout.flush()

        except urllib.error.HTTPError as http_err:
            error_body = http_err.read().decode("utf-8")
            try:
                err_json = json.loads(error_body)
                sys.stdout.write(json.dumps(err_json) + "\n")
            except Exception:
                sys.stdout.write(
                    json.dumps({
                        "jsonrpc": "2.0",
                        "id": None,
                        "error": {"code": -32603, "message": f"Remote HTTP error {http_err.code}: {http_err.reason}"},
                    }) + "\n"
                )
            sys.stdout.flush()

        except Exception as exc:
            sys.stdout.write(
                json.dumps({
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {"code": -32603, "message": f"Bridge error: {str(exc)}"},
                }) + "\n"
            )
            sys.stdout.flush()


if __name__ == "__main__":
    run_bridge()
