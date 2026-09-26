#!/usr/bin/env python3
"""Apply plugin and manifest changes from a dev push to the current main worktree."""

import json
import os
import re
import subprocess
from pathlib import Path


ROOT = Path.cwd()


def git(*args, check=True):
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=check,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.stdout


def get_commit_file(commit, path):
    result = subprocess.run(
        ["git", "show", f"{commit}:{path}"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    return result.stdout if result.returncode == 0 else None


def changed_paths(before, after):
    if not before or set(before) == {"0"}:
        parent = git("rev-parse", f"{after}^", check=False).decode().strip()
        before = parent if parent else after
    raw = git("diff", "--name-status", "-z", "--no-renames", before, after, "--", "providers", "manifest.json")
    fields = raw.decode().split("\0")
    changes = []
    index = 0
    while index + 1 < len(fields):
        status, path = fields[index], fields[index + 1]
        index += 2
        if not path:
            continue
        if path.startswith("providers/") and path.endswith(".js"):
            changes.append((status, path))
        elif path == "manifest.json":
            changes.append((status, path))
    return before, changes


def extract_scrapers(text):
    match = re.search(r'(?m)^(?P<indent>[ \t]*)"scrapers"\s*:\s*\[', text)
    if not match:
        raise ValueError('Manifest is missing the top-level "scrapers" array')

    opening = text.find("[", match.start(), match.end())
    in_string = False
    escaped = False
    array_depth = 1
    object_depth = 0
    object_start = None
    entries = []

    for position in range(opening + 1, len(text)):
        char = text[position]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
        elif char == "{":
            if array_depth == 1 and object_depth == 0:
                object_start = position
            object_depth += 1
        elif char == "}" and object_depth > 0:
            object_depth -= 1
            if object_depth == 0:
                raw = text[object_start : position + 1]
                entries.append((json.loads(raw), raw))
        elif char == "[":
            array_depth += 1
        elif char == "]":
            array_depth -= 1
            if array_depth == 0:
                return opening, position, match.group("indent"), entries

    raise ValueError('Could not find the end of the manifest "scrapers" array')


def parse_manifest(raw, commit_label):
    if raw is None:
        raise ValueError(f"Could not read manifest.json from {commit_label}")
    text = raw.decode("utf-8")
    json.loads(text)
    _, _, _, entries = extract_scrapers(text)
    return text, {entry.get("id"): (entry, raw_entry) for entry, raw_entry in entries if entry.get("id")}


def generated_entry(provider_path, source_bytes):
    provider_id = Path(provider_path).stem
    name = re.sub(r"[-_]+", " ", provider_id).title()
    source_text = source_bytes.decode("utf-8", errors="replace")
    return {
        "id": provider_id,
        "name": name,
        "description": f"{name} streaming provider",
        "version": "1.0.0",
        "author": "Nuvio Team",
        "supportedTypes": ["movie", "tv"],
        "filename": provider_path,
        "enabled": True,
        "hasSettings": "onSettings" in source_text,
    }


def increment_plugin_version(version):
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", str(version or ""))
    if not match:
        raise ValueError(f"Cannot increment non-numeric plugin version: {version!r}")

    major, minor, patch = map(int, match.groups())
    if patch >= 10:
        if minor >= 10:
            major += 1
            minor = 0
        else:
            minor += 1
        patch = 0
    elif minor >= 10:
        major += 1
        minor = 0
    else:
        patch += 1
    return f"{major}.{minor}.{patch}"


def encode_entry(entry, indent):
    lines = json.dumps(entry, ensure_ascii=False, indent=2).splitlines()
    return lines[0] + "\n" + "\n".join(indent + line for line in lines[1:])


def write_scrapers(text, updates, removals):
    opening, closing, array_indent, existing = extract_scrapers(text)
    element_indent = " " * (len(array_indent.expandtabs(4)) + 2)
    if existing:
        first_start = text.rfind("\n", 0, text.find(existing[0][1], opening, closing)) + 1
        sample_indent = text[first_start : text.find(existing[0][1], opening, closing)]
        if sample_indent.strip() == "":
            element_indent = sample_indent

    ordered = []
    present = set()
    for entry, raw in existing:
        provider_id = entry.get("id")
        if provider_id in removals:
            continue
        if provider_id in updates:
            ordered.append((provider_id, updates[provider_id][1]))
        else:
            ordered.append((provider_id, raw))
        present.add(provider_id)

    for provider_id, (entry, raw) in updates.items():
        if provider_id not in present:
            ordered.append((provider_id, raw))

    newline = "\r\n" if "\r\n" in text else "\n"
    if ordered:
        body = ("," + newline + element_indent).join(raw for _, raw in ordered)
        replacement = "[" + newline + element_indent + body + newline + array_indent + "]"
    else:
        replacement = "[]"
    return text[:opening] + replacement + text[closing + 1 :]


def main():
    before = os.environ.get("DEV_BEFORE", "")
    after = os.environ.get("DEV_SHA", "")
    if not after:
        raise ValueError("DEV_SHA was not provided by the workflow")

    before, changes = changed_paths(before, after)
    provider_changes = [(status, path) for status, path in changes if path.startswith("providers/")]
    manifest_changed = any(path == "manifest.json" for _, path in changes)
    if not provider_changes and not manifest_changed:
        print("No provider or manifest changes in this dev push.")
        return

    _, old_entries = parse_manifest(get_commit_file(before, "manifest.json"), before)
    _, source_entries = parse_manifest(get_commit_file(after, "manifest.json"), after)

    # Keep this script loaded from the dev checkout, then switch the worktree to
    # main so all writes and the following commit target the destination branch.
    git("fetch", "origin", "main")
    git("checkout", "-B", "main", "origin/main")
    main_text = Path("manifest.json").read_text(encoding="utf-8")
    json.loads(main_text)
    _, main_entries = parse_manifest(main_text.encode("utf-8"), "main worktree")

    updates = {}
    removals = set()

    if manifest_changed:
        all_ids = set(old_entries) | set(source_entries)
        for provider_id in all_ids:
            old_entry = old_entries.get(provider_id, (None, None))[0]
            new_entry = source_entries.get(provider_id, (None, None))[0]
            if old_entry == new_entry:
                continue
            if new_entry is None:
                removals.add(provider_id)
                old_path = old_entry.get("filename") if old_entry else None
                if old_path and old_path.startswith("providers/"):
                    payload = get_commit_file(after, old_path)
                    if payload is None:
                        (ROOT / old_path).unlink(missing_ok=True)
            else:
                entry_raw = source_entries[provider_id][1]
                updates[provider_id] = (new_entry, entry_raw)
                source_path = new_entry.get("filename")
                if source_path and source_path.startswith("providers/"):
                    payload = get_commit_file(after, source_path)
                    if payload is not None:
                        (ROOT / source_path).parent.mkdir(parents=True, exist_ok=True)
                        (ROOT / source_path).write_bytes(payload)

    for status, path in provider_changes:
        previous_ids = [
            provider_id
            for provider_id, (entry, _) in old_entries.items()
            if entry.get("filename") == path
        ]
        if status.startswith("D"):
            (ROOT / path).unlink(missing_ok=True)
            removals.update(previous_ids)
            continue

        payload = get_commit_file(after, path)
        if payload is None:
            continue
        (ROOT / path).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / path).write_bytes(payload)

        source_match = next(
            ((provider_id, entry, raw) for provider_id, (entry, raw) in source_entries.items() if entry.get("filename") == path),
            None,
        )
        if source_match:
            provider_id, entry, raw = source_match
            updates[provider_id] = (entry, raw)
            removals.discard(provider_id)
        elif previous_ids:
            for provider_id in previous_ids:
                current = main_entries.get(provider_id, (None, None))[0]
                if current:
                    updates[provider_id] = (current, main_entries[provider_id][1])
        else:
            entry = generated_entry(path, payload)
            provider_id = entry["id"]
            updates[provider_id] = (entry, encode_entry(entry, "    "))

    # Bump the main-branch version once for each updated provider JS file.
    # Manifest-only edits do not change a plugin's version.
    for status, path in provider_changes:
        if status.startswith("D"):
            continue
        for provider_id, (entry, _) in list(updates.items()):
            if entry.get("filename") != path:
                continue
            previous = main_entries.get(provider_id, (None, None))[0]
            if previous is None:
                previous = next(
                    (candidate for candidate, _ in main_entries.values() if candidate.get("filename") == path),
                    None,
                )
            if previous is None:
                continue
            bumped = dict(entry)
            bumped["version"] = increment_plugin_version(previous.get("version"))
            updates[provider_id] = (bumped, encode_entry(bumped, "    "))

    # Manifest-only updates stay scoped to changed IDs.
    for provider_id in removals:
        updates.pop(provider_id, None)

    if updates or removals:
        merged_text = write_scrapers(main_text, updates, removals)
        Path("manifest.json").write_text(merged_text, encoding="utf-8")

    print(f"Updated {len(updates)} manifest entry/entries and removed {len(removals)}.")


if __name__ == "__main__":
    main()
