#!/usr/bin/env python3
"""Read-only baseline checks; not a full secret/history or application security audit."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

EXPECTED_DOMAIN = "euroagritrading.eu"
MAX_TEXT_BYTES = 2_000_000
PRIVATE_SUFFIXES = {
    ".key", ".p12", ".pfx", ".pem", ".eml", ".mbox", ".pst", ".ost",
    ".sql", ".sqlite", ".sqlite3", ".db", ".xlsx", ".xls", ".csv",
    ".zip", ".7z", ".tar", ".tgz", ".gz",
}
SECRET_PATTERNS = {
    "private key": r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----",
    "GitHub token": r"\bgh[pousr]_[A-Za-z0-9]{36,}\b",
    "GitHub fine-grained token": r"\bgithub_pat_[A-Za-z0-9_]{50,}\b",
    "AWS access identifier": r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b",
    "Google API key": r"\bAIza[0-9A-Za-z_-]{35}\b",
    "Slack token": r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b",
}


def path_problem(path: str) -> str | None:
    p = Path(path)
    name = p.name.lower()
    if p.is_absolute() or ".." in p.parts:
        return "unsafe repository path"
    if name in {".env.example", ".env.sample", ".env.template"}:
        return None
    if name == ".env" or name.startswith(".env."):
        return "environment file must not be published"
    if name in {"credentials.json", "service-account.json", "id_rsa", "id_ed25519", "id_ecdsa", ".netrc", ".npmrc", ".pypirc"}:
        return "credential file must not be published"
    if p.suffix.lower() in PRIVATE_SUFFIXES:
        return "private data/export/archive type requires explicit review before publishing"
    if name.startswith(("euro_agri_security_register", "euro_agri_security_audit", "euro_agri_security_evidence")):
        return "internal security records must not be published"
    return None


def content_problems(text: str) -> list[str]:
    # Report the category only: never print a matched credential or source line.
    return [name for name, pattern in SECRET_PATTERNS.items() if re.search(pattern, text)]


class ActiveContent(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.problems: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        key = None
        if tag in {"script", "iframe"}:
            key = "src"
        elif tag == "form":
            key = "action"
        elif tag == "link" and "stylesheet" in (a.get("rel") or "").split():
            key = "href"
        if not key or not a.get(key):
            return
        value = (a[key] or "").strip()
        parts = urlsplit(value)
        if value.startswith("//") or (parts.scheme and parts.scheme.lower() != "https"):
            self.problems.append(f"{tag} has a non-HTTPS active URL")
        if tag == "form" and parts.hostname and (a.get("method") or "get").lower() != "post":
            self.problems.append("external form must use POST, not URL query parameters")


def run() -> int:
    root = Path(__file__).resolve().parents[2]
    try:
        listing = subprocess.run(
            ["git", "ls-files", "-z"], cwd=root, check=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        print("FAIL: unable to enumerate tracked files; check was not completed.")
        return 1
    paths = [p.decode("utf-8", "strict") for p in listing.split(b"\0") if p]
    errors: list[str] = []
    text_count = binary_count = json_count = 0
    js_paths: list[str] = []
    for name in paths:
        problem = path_problem(name)
        if problem:
            errors.append(f"{name!r}: {problem}")
            continue
        path = root / name
        if path.is_symlink():
            errors.append(f"{name!r}: symlink needs manual review")
            continue
        if not path.is_file():
            errors.append(f"{name!r}: missing file or unsupported submodule")
            continue
        data = path.read_bytes()
        if b"\0" in data:
            binary_count += 1
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            binary_count += 1
            continue
        text_count += 1
        if len(data) > MAX_TEXT_BYTES:
            errors.append(f"{name!r}: text exceeds the reviewed scan limit")
            continue
        for category in content_problems(text):
            errors.append(f"{name!r}: possible {category}; value withheld")
        if path.suffix.lower() == ".json":
            json_count += 1
            try:
                json.loads(text)
            except (ValueError, RecursionError):
                errors.append(f"{name!r}: invalid JSON; content withheld")
        if path.suffix.lower() == ".html":
            parser = ActiveContent()
            try:
                parser.feed(text)
                errors.extend(f"{name!r}: {p}" for p in parser.problems)
            except ValueError:
                errors.append(f"{name!r}: active URL could not be parsed")
        if path.suffix.lower() == ".js":
            js_paths.append(name)
    cname = root / "CNAME"
    if not cname.is_file() or cname.read_text(encoding="utf-8").strip() != EXPECTED_DOMAIN:
        errors.append("CNAME: domain routing changed; explicit owner review required")
    if not errors:
        node = shutil.which("node")
        if js_paths and not node:
            errors.append("JavaScript syntax was not checked: Node.js is unavailable")
        elif node:
            for name in js_paths:
                try:
                    result = subprocess.run(
                        [node, "--check", str(root / name)], cwd=root,
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20,
                    )
                    if result.returncode:
                        errors.append(f"{name!r}: JavaScript syntax check failed; content withheld")
                except (OSError, subprocess.SubprocessError):
                    errors.append(f"{name!r}: JavaScript syntax check could not complete")
    if errors:
        print("FAIL: security baseline needs review. No matched values are logged.")
        for error in errors[:100]:
            print(f" - {error}")
        print(f"Total findings: {len(errors)}")
        return 1
    print(f"PASS: {len(paths)} tracked files; {text_count} UTF-8 files, {json_count} JSON files, {len(js_paths)} JavaScript files.")
    print(f"Scope: current checkout only. {binary_count} binary/non-UTF-8 files were not content-scanned.")
    print("Not a history scan, malware scan, server-side form test, account audit, or guarantee of no secrets.")
    return 0


if __name__ == "__main__":
    sys.exit(run())
