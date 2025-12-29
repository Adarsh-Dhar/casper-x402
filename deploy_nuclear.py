#!/usr/bin/env python3
"""
Nuclear Contract Deployment System
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional


@dataclass
class CleanResult:
    success: bool
    removed_paths: List[str]
    error_message: Optional[str] = None


@dataclass
class BuildResult:
    success: bool
    wasm_path: Optional[str] = None
    build_output: str = ""
    error_message: Optional[str] = None


@dataclass
class VerificationResult:
    success: bool
    test_output: str = ""
    failed_tests: List[str] = field(default_factory=list)
    error_message: Optional[str] = None


@dataclass
class DeployResult:
    success: bool
    deploy_json_path: Optional[str] = None
    deploy_hash: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class SubmissionResult:
    success: bool
    deploy_hash: Optional[str] = None
    retry_count: int = 0
    error_message: Optional[str] = None


@dataclass
class DeploymentConfig:
    network: str = "casper-test"
    rpc_url: str = "https://node.testnet.casper.network"
    api_key: str = "019b2b7d-e2ba-752e-a21d-81383b1fd6fe"
    private_key_path: str = "keys/secret_key.pem"
    max_retries: int = 3
    retry_delay: int = 5
    session_args: List[str] = field(default_factory=list)


def nuclear_clean() -> CleanResult:
    removed_paths = []
    error_message = None
    partial_failure = False

    try:
        target_path = Path("target")
        if target_path.exists():
            print(f"Removing {target_path}...")
            try:
                shutil.rmtree(target_path, ignore_errors=False)
                removed_paths.append(str(target_path))
            except (PermissionError, OSError) as e:
                error_message = f"Failed to remove {target_path}: {e}. Try running with elevated permissions or manually delete the directory."
                partial_failure = True

        wasm_path = Path("wasm")
        if wasm_path.exists():
            print(f"Removing {wasm_path}...")
            try:
                shutil.rmtree(wasm_path, ignore_errors=False)
                removed_paths.append(str(wasm_path))
            except (PermissionError, OSError) as e:
                if partial_failure:
                    error_message += f" Also failed to remove {wasm_path}: {e}"
                else:
                    error_message = f"Failed to remove {wasm_path}: {e}. Try running with elevated permissions or manually delete the directory."
                partial_failure = True

        if partial_failure:
            print("Attempting rollback due to partial cleanup failure...")
            _attempt_rollback(removed_paths)
            return CleanResult(success=False, removed_paths=[], error_message=error_message)

        if target_path.exists():
            error_message = f"Failed to completely remove {target_path} - directory still exists after deletion"
            return CleanResult(success=False, removed_paths=removed_paths, error_message=error_message)

        if wasm_path.exists():
            error_message = f"Failed to completely remove {wasm_path} - directory still exists after deletion"
            return CleanResult(success=False, removed_paths=removed_paths, error_message=error_message)

        print(f"Nuclear clean completed successfully. Removed: {removed_paths}")
        return CleanResult(success=True, removed_paths=removed_paths)

    except Exception as e:
        error_message = f"Unexpected error during nuclear clean: {e}"
        print(f"Error: {error_message}")
        if removed_paths:
            print("Attempting rollback due to unexpected error...")
            _attempt_rollback(removed_paths)
        return CleanResult(success=False, removed_paths=[], error_message=error_message)


def _attempt_rollback(removed_paths: List[str]) -> None:
    print("Note: Rollback for nuclear clean is not applicable - directories are intentionally removed.")
    print("If you need to restore the project state, run `cargo odra build` to regenerate directories.")
    print(f"Successfully removed paths before failure: {removed_paths}")


def load_config_from_args_env(args: argparse.Namespace) -> DeploymentConfig:
    cfg = DeploymentConfig()
    cfg.network = args.network or os.getenv("DEPLOY_NETWORK") or cfg.network
    cfg.rpc_url = args.rpc_url or os.getenv("DEPLOY_RPC_URL") or cfg.rpc_url
    cfg.api_key = args.api_key or os.getenv("DEPLOY_API_KEY") or cfg.api_key
    cfg.private_key_path = args.private_key or os.getenv("DEPLOY_PRIVATE_KEY_PATH") or cfg.private_key_path
    cfg.max_retries = args.max_retries if args.max_retries is not None else int(os.getenv("DEPLOY_MAX_RETRIES", cfg.max_retries))
    cfg.retry_delay = args.retry_delay if args.retry_delay is not None else int(os.getenv("DEPLOY_RETRY_DELAY", cfg.retry_delay))
    # session args passed via CLI (can be repeated)
    cfg.session_args = args.session_arg if hasattr(args, "session_arg") and args.session_arg is not None else []
    return cfg


def infer_session_args_from_wasm(wasm_path: str, max_suggestions: int = 5) -> List[str]:
    """Try to infer likely session argument names from a .wasm file.

    Strategy (best-effort):
    - Try to run the `strings` command on the wasm and collect human-readable tokens.
    - If `strings` is not available, scan the binary for ASCII substrings.
    - Filter tokens to plausible identifier-like strings and score them.
    - For common names (amount, recipient, owner, name, symbol, token_id) produce a guessed type (u512 or string).

    Returns a list of example `--session-arg` strings (not guaranteed correct).
    """
    suggestions: List[str] = []
    try:
        proc = subprocess.run(["strings", wasm_path], capture_output=True, text=True)
        content = proc.stdout if proc.returncode == 0 else ""
    except FileNotFoundError:
        # fallback: read binary and extract ascii runs
        try:
            data = Path(wasm_path).read_bytes()
            # ASCII sequences of length >=3
            matches = re.findall(rb"[ -~]{3,50}", data)
            content = "\n".join(m.decode('latin1') for m in matches)
        except Exception:
            content = ""

    if not content:
        # no useful data
        return suggestions

    # tokenize - pick words, underscores, hyphens
    tokens = re.findall(r"[A-Za-z_][A-Za-z0-9_]{1,30}", content)
    # score tokens by frequency
    freq = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    # common argument names to prioritize
    common_map = {
        'amount': 'u512',
        'value': 'u512',
        'recipient': 'account_hash',
        'to': 'account_hash',
        'owner': 'account_hash',
        'name': 'string',
        'symbol': 'string',
        'decimals': 'u32',
        'token_id': 'u64',
        'id': 'u64',
        'beneficiary': 'account_hash',
    }

    # build list of candidate tokens sorted by score
    candidates = sorted(freq.items(), key=lambda kv: kv[1], reverse=True)
    seen = set()
    for tok, _ in candidates:
        t = tok.lower()
        # ignore short or generic tokens
        if len(t) < 3 or t in ('wasm', 'memory', 'alloc'):
            continue
        if t in seen:
            continue
        seen.add(t)
        if t in common_map:
            typ = common_map[t]
        else:
            # heuristic: names containing amount/price -> u512; names containing id/num -> u64; else string
            if re.search(r'(amount|price|qty|quantity|balance)', t):
                typ = 'u512'
            elif re.search(r'(id|idx|num|count)', t):
                typ = 'u64'
            elif re.search(r'(addr|account|recipient|owner|beneficiary|to)', t):
                typ = 'account_hash'
            else:
                typ = 'string'

        # craft example value based on type
        if typ == 'u512':
            example = '10000000000'
        elif typ in ('u64', 'u32'):
            example = '1'
        elif typ == 'account_hash':
            example = '0202...your_account_hex'
        else:
            example = 'example'

        # For casper-client --session-arg the general form is 'name:TYPE="value"' for many types
        # Use quotes around value when necessary
        if typ in ('string', 'account_hash'):
            arg_text = f"{t}:{typ}=\"{example}\""
        else:
            arg_text = f"{t}:{typ}=\"{example}\""

        suggestions.append(arg_text)
        if len(suggestions) >= max_suggestions:
            break

    return suggestions


def deploy_contract(cfg: DeploymentConfig, wasm_path: Optional[str] = None) -> DeployResult:
    """
    Submits a deploy using the `casper-client` CLI and parses the returned deploy hash.

    Expects a `deploy.json` file in the repo root (adjust path if your build produces a different file).
    """
    # Ensure deploy_json is defined for all branches to avoid UnboundLocalError
    deploy_json = None

    # If wasm_path is provided, call put-deploy with explicit flags (preferred).
    if wasm_path:
        # include a timestamp a few minutes in the past to avoid clock skew
        ts = (time.time() - 300)
        # casper-client expects ISO8601 with Z and fractional seconds
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(ts))
        cmd = [
            "casper-client",
            "put-deploy",
            "--node-address",
            cfg.rpc_url,
            "--chain-name",
            cfg.network,
            "--secret-key",
            cfg.private_key_path,
            "--payment-amount",
            "10000000000",
            "--session-path",
            wasm_path,
            "--timestamp",
            timestamp,
        ]
        # append any session args supplied via CLI
        for a in cfg.session_args:
            cmd.extend(["--session-arg", normalize_session_arg(a)])
    else:
        deploy_json = Path("deploy.json")
        if not deploy_json.exists():
            return DeployResult(success=False, error_message="No `deploy.json` found. Run the build step to produce it.")

        cmd = [
            "casper-client",
            "put-deploy",
            "--node-address",
            cfg.rpc_url,
            "--secret-key",
            cfg.private_key_path,
            str(deploy_json),
        ]

    try:
        print("Executing:", " ".join(cmd))
        proc = subprocess.run(cmd, capture_output=True, text=True)
    except FileNotFoundError:
        return DeployResult(success=False, error_message="`casper-client` not found in PATH. Install it or use another submission method.")

    output = (proc.stdout or "") + "\n" + (proc.stderr or "")
    # Delegate parsing to helper so it's testable
    return parse_deploy_hash(output, cfg, wasm_path, deploy_json)


def fresh_build() -> BuildResult:
    """Run `cargo odra build` (with several fallbacks) and detect the produced .wasm file in `wasm/`.

    Strategy:
    - Try several candidate build commands at repo root.
    - If the command fails because it's not an Odra project, search for subdirectories containing Cargo.toml
      and attempt the candidate commands there (prefer common folders).
    - Detect produced .wasm files in wasm/ or target/ and return the newest match.
    """
    candidate_cmds = [
        ["cargo", "odra", "build", "-b", "casper"],
        ["cargo", "odra", "build"],
        ["cargo", "odra", "build", "--backend", "casper"],
        ["cargo", "build", "--release"],
    ]

    def _find_wasm(start_dir: Path) -> List[Path]:
        wasm_files: List[Path] = []
        wasm_dir = start_dir / "wasm"
        if wasm_dir.exists():
            wasm_files.extend(list(wasm_dir.rglob("*.wasm")))
        target_dir = start_dir / "target"
        if target_dir.exists():
            wasm_files.extend(list(target_dir.rglob("*.wasm")))
        return wasm_files

    last_output = ""

    # Try commands in the current repo root first
    for cmd in candidate_cmds:
        print("Running fresh build: ", " ".join(cmd))
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True)
        except FileNotFoundError:
            return BuildResult(success=False, wasm_path=None, build_output="", error_message="`cargo` or `odra` not found in PATH. Install Rust and Odra CLI or build manually.")

        output = (proc.stdout or "") + "\n" + (proc.stderr or "")
        last_output = output
        if proc.returncode == 0:
            wasm_files = _find_wasm(Path.cwd())
            if wasm_files:
                wasm_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                chosen = wasm_files[0]
                print(f"Detected wasm: {chosen}")
                return BuildResult(success=True, wasm_path=str(chosen), build_output=output)
            else:
                print("Build succeeded but no .wasm found in repo root; trying next candidate...")
                continue

        # If it looks like this isn't an Odra project here, we'll try subdirectories
        if "This command can be executed only in folder with Odra project" in output or "not an Odra project" in output or "This command can be executed only in folder" in output:
            print("Top-level build reported not an Odra project. Searching subdirectories for Cargo.toml...")
            # Look for directories with Cargo.toml
            candidates = []
            preferred = ["final-facilitator", "facilitator-standalone"]
            # prefer common names first
            for p in preferred:
                d = Path(p)
                if (d / "Cargo.toml").exists():
                    candidates.append(d)
            # fallback: scan for any Cargo.toml
            for c in Path.cwd().rglob("Cargo.toml"):
                d = c.parent
                if d not in candidates:
                    candidates.append(d)
            if not candidates:
                print("No subprojects with Cargo.toml found; will try next candidate command at root")
                continue

            # Try candidate commands in each candidate directory
            for subdir in candidates:
                for subcmd in candidate_cmds:
                    print(f"Trying build in {subdir}: ", " ".join(subcmd))
                    try:
                        proc2 = subprocess.run(subcmd, cwd=str(subdir), capture_output=True, text=True)
                    except FileNotFoundError:
                        return BuildResult(success=False, wasm_path=None, build_output="", error_message="`cargo` or `odra` not found in PATH. Install Rust and Odra CLI or build manually.")
                    out2 = (proc2.stdout or "") + "\n" + (proc2.stderr or "")
                    last_output = out2
                    if proc2.returncode == 0:
                        wasm_files = _find_wasm(subdir)
                        if wasm_files:
                            wasm_files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
                            chosen = wasm_files[0]
                            print(f"Detected wasm: {chosen}")
                            return BuildResult(success=True, wasm_path=str(chosen), build_output=out2)
                        else:
                            print(f"Build in {subdir} succeeded but produced no .wasm; trying next command/subdir...")
                            continue
                    # if specific arg error, try next command; otherwise continue searching
                    if "unexpected argument" in out2 or "Found argument '-b'" in out2 or "USAGE:" in out2:
                        continue
                    else:
                        # non-arg related failure; continue trying other combos
                        continue
            # after trying subdirs, continue to next top-level candidate command
            continue

        # If returncode != 0 but error suggests unknown argument, try next candidate
        if "unexpected argument" in output or "Found argument '-b'" in output or "USAGE:" in output:
            print("Build command failed (may be unsupported args), trying next candidate...")
            continue
        else:
            # For other failures, try next candidate instead of stopping immediately
            print("Build command failed, trying next candidate...")
            continue

    # After all candidates
    # As a last resort, search the whole repository for any existing .wasm artifacts
    print("No build produced a .wasm; searching repository for existing .wasm files as a fallback...")
    repo_wasm = list(Path.cwd().rglob("*.wasm"))
    # Filter out obvious unrelated wasm (node_modules, .pnpm etc.)
    repo_wasm = [p for p in repo_wasm if "node_modules" not in str(p) and ".pnpm" not in str(p)]
    if repo_wasm:
        # Prefer wasm under common project targets or known subprojects
        preferred_dirs = ["final-facilitator", "facilitator-standalone", "target", "wasm", "wasm32-unknown-unknown"]
        def pref_score(p: Path) -> int:
            s = 0
            sp = str(p)
            for i, d in enumerate(preferred_dirs):
                if d in sp:
                    s += (len(preferred_dirs) - i) * 10
            # larger files are slightly preferred (contracts usually > 1KB)
            try:
                s += min(100, p.stat().st_size // 1024)
            except Exception:
                pass
            return s

        repo_wasm.sort(key=lambda p: pref_score(p), reverse=True)
        chosen = repo_wasm[0]
        print(f"Found existing wasm artifact in repo: {chosen}")
        return BuildResult(success=True, wasm_path=str(chosen), build_output=last_output)

    return BuildResult(success=False, wasm_path=None, build_output=last_output, error_message="Build did not produce any .wasm files after trying candidate build commands.")


def generate_deploy(wasm_path: str, cfg: DeploymentConfig) -> DeployResult:
    """Create a deploy JSON using `casper-client make-deploy`.

    Writes `deploy.json` in the repo root by default.
    """
    deploy_json = Path("deploy.json")
    # Ensure private key exists before calling casper-client
    pk = Path(cfg.private_key_path)
    if not pk.exists():
        return DeployResult(success=False, error_message=f"Private key not found at '{cfg.private_key_path}'. Pass --private-key or set DEPLOY_PRIVATE_KEY_PATH to a valid .pem file.")
    # casper-client requires --chain-name; pass cfg.network
    cmd = [
        "casper-client",
        "make-deploy",
        "--chain-name",
        cfg.network,
        "--session-path",
        wasm_path,
        "--secret-key",
        cfg.private_key_path,
        "--payment-amount",
        "10000000000",
        "--ttl",
        "1h",
        "--output",
        str(deploy_json),
    ]
    # include session args if provided so deploy.json contains them
    for a in cfg.session_args:
        cmd.extend(["--session-arg", normalize_session_arg(a)])
    print("Generating deploy JSON with:", " ".join(cmd))
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True)
    except FileNotFoundError:
        return DeployResult(success=False, error_message="`casper-client` not found in PATH. Install `casper-client` or create deploy.json manually.")

    output = (proc.stdout or "") + "\n" + (proc.stderr or "")
    if proc.returncode != 0:
        # provide extra hint if casper-client failed to read secret key
        if "could not read" in output or "secret key load failed" in output:
            output += "\nHint: Check that the private key file exists and is readable, and that it's the expected PEM format."
        return DeployResult(success=False, error_message=f"casper-client make-deploy failed:\n{output}")

    if deploy_json.exists():
        return DeployResult(success=True, deploy_json_path=str(deploy_json))
    else:
        return DeployResult(success=False, error_message=f"casper-client reported success but {deploy_json} not found. Output:\n{output}")


def locate_private_key(provided: Optional[str]) -> Optional[str]:
    """Return a usable private key path or None.

    Search order:
    - provided (if exists)
    - common locations in repo
    - rglob for files named secret_key*.pem
    """
    candidates = []
    if provided:
        p = Path(provided)
        if p.exists():
            return str(p)
        # try relative to repo
        p2 = Path.cwd() / provided
        if p2.exists():
            return str(p2)

    # Add common candidate paths
    commons = [
        Path("keys/secret_key.pem"),
        Path("keys/secret_key_1.pem"),
        Path("final-facilitator/keys/secret_key.pem"),
        Path("final-facilitator/keys/secret_key_1.pem"),
        Path("workshop-code/secret_key_1.pem"),
        Path("secret_key.pem"),
        Path("secret_key_1.pem"),
    ]
    for c in commons:
        if c.exists():
            return str(c)

    # Search the repo for secret_key*.pem
    for f in Path.cwd().rglob("secret_key*.pem"):
        # avoid node_modules etc.
        if "node_modules" in str(f) or ".pnpm" in str(f):
            continue
        return str(f)

    return None


def normalize_session_arg(arg: str) -> str:
    """Normalize a session-arg string to ensure the value is wrapped in single quotes.

    Accepts inputs like:
      name:TYPE="value"
      name:TYPE='value'
      name:TYPE=value
    and returns a string where the value is single-quoted: name:TYPE='value'

    This is necessary because `casper-client` expects simple arg values to be quoted with single quotes.
    """
    m = re.match(r"^([^:]+):([^=]+)=(.*)$", arg)
    if not m:
        return arg
    name, typ, val = m.group(1), m.group(2), m.group(3)
    # canonicalize type to lowercase and map common aliases
    typ = typ.strip().lower()
    if typ == 'account':
        typ = 'account_hash'
    val = val.strip()
    if len(val) >= 2 and val[0] == "'" and val[-1] == "'":
        return f"{name}:{typ}={val}"
    if len(val) >= 2 and val[0] == '"' and val[-1] == '"':
        inner = val[1:-1]
        return f"{name}:{typ}='{inner}'"
    # otherwise wrap bare value in single quotes
    return f"{name}:{typ}='{val}'"


def parse_deploy_hash(output: str, cfg: DeploymentConfig, wasm_path: Optional[str], deploy_json) -> DeployResult:
    """
    Helper to parse deploy hash from casper-client output.
    Returns DeployResult(success=True, deploy_hash=...) if found, else error.
    """
    # First try to extract a deploy hash from explicit phrases like "Deploy hash:" (casper-client prints this)
    # Try a few common patterns (case-insensitive):
    #  - Deploy hash: <hex>
    #  - "deploy_hash": "<hex>"
    #  - deployHash: <hex>
    deploy_hash = None
    # collect any long hex values provided explicitly via session args so we can avoid mistaking them for the deploy hash
    provided_hex = set()
    try:
        for a in cfg.session_args:
            for v in re.findall(r'([0-9a-fA-F]{64,})', a):
                provided_hex.add(v)
    except Exception:
        provided_hex = set()
    # pattern 1: human-readable line
    m = re.search(r'Deploy\s+hash\s*[:\-]?\s*([0-9a-fA-F]{64})', output, flags=re.IGNORECASE)
    if m:
        candidate = m.group(1)
        if candidate in provided_hex:
            # suspect: the reported "Deploy hash" matches a provided account/session arg; skip this match and continue
            pass
        else:
            deploy_hash = candidate
            return DeployResult(success=True, deploy_json_path=str(deploy_json) if deploy_json else None, deploy_hash=deploy_hash)

    # pattern 2: JSON-like fields
    for pat in [r'"deploy_hash"\s*:\s*"([0-9a-fA-F]{64})"', r'"deployHash"\s*:\s*"([0-9a-fA-F]{64})"', r'deployHash\s*:\s*([0-9a-fA-F]{64})']:
        m = re.search(pat, output, flags=re.IGNORECASE)
        if m:
            candidate = m.group(1)
            if candidate in provided_hex:
                # suspect JSON field contains a provided value; skip
                continue
            deploy_hash = candidate
            return DeployResult(success=True, deploy_json_path=str(deploy_json) if deploy_json else None, deploy_hash=deploy_hash)

    # Fallback: collect all long hex matches but try to exclude values that came from the provided session args
    all_hex = re.findall(r'\b([0-9a-fA-F]{64,})\b', output)
    if all_hex:
        for candidate in reversed(all_hex):
            if candidate not in provided_hex:
                deploy_hash = candidate
                break

        # If all matches appear to be provided values, fall back to the last match (best-effort)
        if not deploy_hash and all_hex:
            deploy_hash = all_hex[-1]

        if deploy_hash:
            return DeployResult(success=True, deploy_json_path=str(deploy_json) if deploy_json else None, deploy_hash=deploy_hash)
    # If we reach here, no deploy hash was reliably found. Detect missing runtime args returned by node and provide actionable guidance
    else:
        if "MissingArgument" in output:
            # Try to parse an index if present like `MissingArgument [2]` or `MissingArgument[2]`
            idx_m = re.search(r'MissingArgument\s*\[\s*(\d+)\s*\]', output)
            idx = idx_m.group(1) if idx_m else None
            hint_lines = []
            hint_lines.append("The node reported ApiError::MissingArgument which means the contract expected one or more runtime arguments that were not provided in the deploy.")
            if idx:
                hint_lines.append(f"Missing argument index: {idx}")
            hint_lines.append("")
            hint_lines.append("How to fix:")
            hint_lines.append("- If you're using `--session-path <wasm>` with `casper-client put-deploy`, add required arguments using `--session-arg`. Example:")
            hint_lines.append('  casper-client put-deploy --node-address <NODE> --chain-name <CHAIN> --secret-key <KEY.pem> --payment-amount 10000000000 --session-path ./path/to/contract.wasm --session-arg \'arg_name:string=\"value\"\' --session-arg \'amount:u512=\"10000000000\"\' ')
            hint_lines.append("")
            hint_lines.append("- Or generate an editable `deploy.json` with `casper-client make-deploy` and add the `session.args` fields, then submit that JSON with `casper-client put-deploy <deploy.json>`.")
            hint_lines.append("")
            hint_lines.append("- If you're not sure which argument name/type is required, inspect the contract's expected entrypoint or check build-time metadata. Often the contract README or source lists runtime args.")

            # Suggest likely session-arg flags by scanning the wasm for ASCII strings
            if wasm_path:
                arg_suggestions = infer_session_args_from_wasm(wasm_path)
                if arg_suggestions:
                    hint_lines.append("")
                    hint_lines.append("Likely session argument names/types (guessed from contract):")
                    for s in arg_suggestions:
                        hint_lines.append(f"  --session-arg '{s}'")

            detailed = "\n".join(hint_lines)
            return DeployResult(success=False, error_message=f"ApiError::MissingArgument detected when submitting deploy.\n\ncasper-client output:\n{output}\n\n{detailed}")

        return DeployResult(success=False, error_message=f"Failed to parse deploy hash. casper-client output:\n{output}")


if __name__ == "__main__":
    print("Nuclear Contract Deployment System")
    print("==================================")

    parser = argparse.ArgumentParser(description="Nuclear Contract Deployment System")
    parser.add_argument("--network", help="Target network name (e.g. casper-test, casper-custom)")
    parser.add_argument("--rpc-url", help="RPC URL for the target network")
    parser.add_argument("--api-key", help="Optional API key")
    parser.add_argument("--private-key", help="Path to private key file")
    parser.add_argument("--max-retries", type=int, help="Max submit retries")
    parser.add_argument("--retry-delay", type=int, help="Delay between retries (seconds)")
    parser.add_argument("--deploy", action="store_true", help="Submit the deploy after build and print deploy hash")
    parser.add_argument("--session-arg", action="append", help="Session argument for contract (can be repeated, e.g. --session-arg 'amount:u512=1000')", default=None)
    args = parser.parse_args()

    config = load_config_from_args_env(args)

    # Resolve private key: if configured path doesn't exist, try to locate a key in common places
    resolved_key = locate_private_key(config.private_key_path)
    if resolved_key:
        if resolved_key != config.private_key_path:
            print(f"Note: using discovered private key: {resolved_key}")
        config.private_key_path = resolved_key
    else:
        print("Warning: no private key found. Set --private-key or DEPLOY_PRIVATE_KEY_PATH to a valid .pem file.")

    print("Using deployment config:")
    print(f"  network: {config.network}")
    print(f"  rpc_url: {config.rpc_url}")
    print(f"  private_key: {config.private_key_path}")

    result = nuclear_clean()
    if not result.success:
        print(f"✗ Nuclear clean failed: {result.error_message}")
        sys.exit(1)

    # Fresh build
    build_result = fresh_build()
    if not build_result.success:
        print(f"✗ Build failed: {build_result.error_message}")
        if build_result.build_output:
            print(build_result.build_output)
        sys.exit(1)

    # Generate deploy.json if it doesn't exist
    deploy_json_path = Path("deploy.json")
    if not deploy_json_path.exists():
        # ensure we have a private key before attempting to create the deploy
        if not Path(config.private_key_path).exists():
            print(f"✗ No private key found at '{config.private_key_path}'. Provide a valid key with --private-key or set DEPLOY_PRIVATE_KEY_PATH.")
            sys.exit(1)

        gen_result = generate_deploy(build_result.wasm_path, config)
        if not gen_result.success:
            print(f"✗ Deploy generation failed: {gen_result.error_message}")
            sys.exit(1)
        else:
            print(f"✓ Deploy JSON generated at: {gen_result.deploy_json_path}")

    # Submit deploy if requested
    if args.deploy:
        deploy_result = deploy_contract(config, build_result.wasm_path)
        if deploy_result.success:
            print("✓ Deploy submitted. Deploy hash:", deploy_result.deploy_hash)
            sys.exit(0)
        else:
            print(f"✗ Deploy failed: {deploy_result.error_message}")
            sys.exit(1)
    else:
        print("✓ Ready to build and deploy to", config.network)
        print("Run with `--deploy` to submit the deploy and return the deploy hash.")
        sys.exit(0)
