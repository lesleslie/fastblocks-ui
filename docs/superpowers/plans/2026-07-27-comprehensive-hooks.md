# Comprehensive Hooks Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn all six comprehensive-hook gates green in the fastblocks-ui repo (pyscn, creosote, refurb, betterleaks, lychee, semgrep) by landing three behavior-preserving commits on the existing `fix/comprehensive-hooks-failing` branch, then fast-forward `main`.

**Architecture:** Three logical commits in a strict order (infra → code → docs), each ending in its own green-hook checkpoint. No new abstractions, no exported-API change. SHA1 stays in the codebase but is annotated as a non-security use because the alternative (algorithm swap) would change externally-visible DOM-id prefixes.

**Tech Stack:**
- Python 3.13 (`uv`-managed venv at `.venv/`)
- `crackerjack>=0.50.1` as the umbrella hook runner (`crackerjack run`)
- Direct tools invoked for targeted mid-task checks: `pyscn`, `creosote`, `refurb`, `semgrep`, `lychee`
- `pathlib` (stdlib) for filesystem; `hashlib.sha1` retained for stable-id derivation

## Global Constraints

- Working tree at branch time is dirty with ~12 unrelated edits (CHANGELOG.md, demo/*.html, css bundles, tests, uv.lock). **Every `git add` MUST use explicit pathspec** — never `git add -A`, `-u`, or `git commit -a`. Drift-bundling risks polluting this fix's commits.
- Branch: `fix/comprehensive-hooks-failing` (already created; HEAD = spec commit `8a1983f`).
- Merge target: `main`. **No PR.** Fast-forward only (`git merge --ff-only`).
- All commits authored with the standard project author (the `git config user.name`/`user.email` already set in this environment).
- Commits remain atomic per logical group: one commit for chore, one for style, one for docs.
- No new tests added. Every external observable (DOM-id prefixes, HTML output, public-API behavior) is bit-identical to before.
- `crackerjack run` is the single source of truth for "hooks green." Per-tool invocations exist only for in-step spot checks.

---

## File Structure

This fix touches **only** existing files. No new source files. No new test files. No new doc files (the spec doc lives at `docs/superpowers/specs/...` and was committed in `8a1983f`; the plan doc lives at `docs/superpowers/plans/...` and is being written by this very plan).

| File | Role | Lives in commit |
|------|------|-----------------|
| `.gitignore` | Tooling artifact excludes | Task 1 (c1) |
| `.venv/bin/pyscn` | Entry-point wrapper | regenerated in Task 1 (gitignored, not committed) |
| `.venv/bin/creosote` | Entry-point wrapper | regenerated in Task 1 (gitignored, not committed) |
| `fastblocks_ui/cli.py` | Asset-copier CLI | Task 2 (c2) |
| `fastblocks_ui/helpers.py` | HTML render helpers | Task 2 (c2) |
| `fastblocks_ui/fastblocks.py` | Stable-ID helper | Task 2 (c2) |
| `docs/usage.md` | User-facing usage docs | Task 3 (c3) |
| `docs/layout-v2-spec.md` | Layout v2 spec | Task 3 (c3) |
| `docs/archive/superseded-plans/implementation-plan.md` | Archived plan | Task 3 (c3) |

Pre-existing dirty tree (NOT touched by this plan):
- `CHANGELOG.md`, `demo/demo.html`, `demo/index.html`, `docs/archive/test-artifacts/coverage__20260510-213743.json`, `docs/roadmap.md`, `fastblocks_ui/manifest.json`, `fastblocks_ui/static/css/fastblocks-ui.css`, `fastblocks_ui/static/css/theme.css`, `fastblocks_ui/static/css/tokens.css`, `tests/js/css-variables.test.js`, `tests/js/setup.js`, `tests/test_fastblocks_ui.py`, `uv.lock`
- Untracked: `.lycheecache`, `docs/archive/test-artifacts/coverage__20260727-172000.json`, `playwright.audit.config.js`

These were here before this fix; they remain untouched. Hooks run from the worktree will see them as still-present but unaffected by our commits.

---

## Task 1: `chore(infra)` — pyscn/creosote wrappers + `.cache/` gitignore entry

**Files:**
- Modify: `/.gitignore` (append `.cache/` if absent)
- Regenerate (no commit): `/.venv/bin/pyscn`, `/.venv/bin/creosote` (gitignored; verified by running)

**Interfaces:**
- Consumes: existing `.venv/` with stale-shebanged wrappers
- Produces: working `pyscn` and `creosote` binaries that hook runner can invoke; `.cache/` excluded from future commits

- [ ] **Step 1: Capture baseline failures**

Run from `/Users/les/Projects/fastblocks-ui`:

```bash
cd /Users/les/Projects/fastblocks-ui && crackerjack run 2>&1 | head -120
```

Expected: the six failure categories listed in the spec's Context section are surfaced verbatim (pyscn, creosote, refurb, betterleaks, lychee, semgrep). This is our project's "failing test" baseline.

If fewer or different categories fail, **stop and report** — the executor may have already addressed one or more categories in earlier work.

- [ ] **Step 2: Reinstall pyscn**

```bash
cd /Users/les/Projects/fastblocks-ui && uv pip install --force-reinstall pyscn
```

Expected: a brief reinstall message (no errors). The wrapper `.venv/bin/pyscn` is regenerated.

- [ ] **Step 3: Verify pyscn wrapper shebang and run**

```bash
head -1 /Users/les/Projects/fastblocks-ui/.venv/bin/pyscn
/Users/les/Projects/fastblocks-ui/.venv/bin/pyscn --version
```

Expected: shebang reads `#!/Users/les/Projects/fastblocks-ui/.venv/bin/python3` (NOT `/Users/les/Projects/fastbulma/...`). `--version` prints a version string and exits 0.

If the shebang still points at the old path, **stop and report** — reinstall did not regenerate the wrapper. Likely cause: a system-wide override or stale cache. Try `uv cache clean pyscn && uv pip install --force-reinstall --no-cache pyscn`.

- [ ] **Step 4: Reinstall creosote**

```bash
cd /Users/les/Projects/fastblocks-ui && uv pip install --force-reinstall creosote
```

- [ ] **Step 5: Verify creosote**

```bash
head -1 /Users/les/Projects/fastblocks-ui/.venv/bin/creosote
/Users/les/Projects/fastblocks-ui/.venv/bin/creosote --version
```

Expected: identical pattern to pyscn — shebang correct, version prints.

- [ ] **Step 6: Add `.cache/` to `.gitignore`**

Open `/.gitignore` and verify whether `.cache/` is already present.

```bash
grep -F '.cache/' /Users/les/Projects/fastblocks-ui/.gitignore || echo NOT_FOUND
```

If `NOT_FOUND`, edit the file. The existing `.gitignore` groups entries under comment headers; place the new entry at the end of the file (matches the project's style of accumulating entries at the bottom under natural section comments):

```gitignore

# Tooling artifacts (betterleaks FTL report, etc.)
.cache/
```

If `.cache/` is already present, skip this edit entirely.

- [ ] **Step 7: Sanity-check the per-hook state**

```bash
cd /Users/les/Projects/fastblocks-ui && crackerjack run 2>&1 | grep -E '(pyscn|creosote|betterleaks)'
```

Expected: pyscn and creosote are no longer flagged with `[Errno 2]`. Betterleaks report dir complaint should be gone (because `.cache/` is now gitignored — the report may still need a writeable directory at run-time, which the runner creates automatically).

The other three categories (refurb, lychee, semgrep) **remain red** — that's Task 2 + 3 territory.

- [ ] **Step 8: Commit with explicit pathspec**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git add .gitignore && \
  git status --short
```

Expected: the `git status --short` line for `.gitignore` shows `M .gitignore` (the only staged change). The other 12 dirty-tree files remain unstaged.

If anything else shows up as staged, **stop and report** — pathspec usage slipped and drift-bundling risk.

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git commit -m "chore(infra): pyscn/creosote wrappers and .cache/ for betterleaks

Reinstall pyscn and creosote so the wrappers in .venv/bin/ gain the
correct shebang for this project's current path; the prior shebangs
still pointed at /Users/les/Projects/fastbulma/ which they inherited
from the package install before the project's rename. Append .cache/
to .gitignore so betterleaks' FTL report directory is excluded.

Refs: docs/superpowers/specs/2026-07-27-comprehensive-hooks-design.md"
```

**Task 1 ends with:** commit `chore(infra)` on branch `fix/comprehensive-hooks-failing`. The branch is now 1 fix-commit ahead of `main`.

---

## Task 2: `style(quality)` — refurb FURB cleanup + `# nosemgrep` for non-security SHA1

**Files:**
- Modify: `/fastblocks_ui/cli.py` (5 FURB rewrites: 1 import, 4 body)
- Modify: `/fastblocks_ui/helpers.py` (5 FURB rewrites + 1 SHA1 nosemgrep annotation)
- Modify: `/fastblocks_ui/fastblocks.py` (1 SHA1 nosemgrep annotation)

**Interfaces:**
- Consumes: the `copy_assets(dest_dir)` function (cli.py) and helper functions in `helpers.py` / `fastblocks.py`
- Produces: identical I/O behavior; identical external DOM-id hex prefixes; semantically-passing refurb + semgrep gates

- [ ] **Step 1: Run refurb to capture baseline**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  python -m refurb fastblocks_ui/cli.py fastblocks_ui/helpers.py 2>&1 | head -40
```

Expected: 8+ FURB violations across the two files (cli.py × 5; helpers.py × 3 confirmed in spec; FURB123 in helpers.py produces multiple because the rule fires per redundant cast — exact count varies with refurb version).

- [ ] **Step 2: Edit `cli.py` imports**

Open `/fastblocks_ui/cli.py`. The current first three lines are:

```python
import argparse
import os
import shutil
```

Replace the middle line and insert `pathlib` in alphabetical position:

```python
import argparse
from pathlib import Path
import shutil
```

Verify no other `os.` references survive before moving to body rewrites:

```bash
grep -nF 'os.' /Users/les/Projects/fastblocks-ui/fastblocks_ui/cli.py
```

Expected: `grep` returns no output (no leftover `os.path.*` or `os.makedirs`).

- [ ] **Step 3: Refactor `copy_assets()` body in `cli.py`**

Replace the entire `copy_assets` function body. Locate the function (between the docstring and `def main():`). Replace the lines starting from `static_src = fastblocks_ui.get_static_path()` through `shutil.copy2(manifest_src, manifest_dest)` with the `pathlib` version from the spec:

```python
def copy_assets(dest_dir: str) -> None:
    """Copy FastBlocks UI assets to destination directory."""
    import fastblocks_ui

    static_src = fastblocks_ui.get_static_path()
    static_dest = Path(dest_dir) / "fastblocks-ui"
    static_dest.mkdir(parents=True, exist_ok=True)

    # Copy only the built CSS bundle, not the source modules. Shipping the module
    # files would let the (canonical) modules and the generated bundle drift apart
    # in consumer projects.
    css_src = Path(static_src) / "css"
    css_dest = static_dest / "css"
    bundle_src = css_src / "fastblocks-ui.css"
    if bundle_src.exists():
        css_dest.mkdir(parents=True, exist_ok=True)
        shutil.copy2(bundle_src, css_dest / "fastblocks-ui.css")

    # Copy JS
    js_src = Path(static_src) / "js"
    js_dest = static_dest / "js"
    if js_src.exists():
        shutil.copytree(js_src, js_dest, dirs_exist_ok=True)

    # Copy manifest
    manifest_src = fastblocks_ui.get_manifest_path()
    manifest_dest = static_dest / "manifest.json"
    if manifest_src.exists():
        shutil.copy2(manifest_src, manifest_dest)
```

Preserve every comment, blank line, and line of docstring not explicitly touched.

- [ ] **Step 4: Re-verify `cli.py` is FURB-clean**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  python -m refurb fastblocks_ui/cli.py 2>&1 | tail -20
```

Expected: zero FURB violations in `cli.py`. If anything remains, **stop and report** — the rewrite was incomplete.

- [ ] **Step 5: Edit `helpers.py:107` (FURB102)**

In `/fastblocks_ui/helpers.py`, find:

```python
        if attr_name.startswith("data-") or attr_name.startswith("aria-"):
```

Replace with:

```python
        if attr_name.startswith(("data-", "aria-")):
```

- [ ] **Step 6: Edit `helpers.py:169` (FURB123)**

In `/fastblocks_ui/helpers.py`, find the `_format_number` function body:

```python
    return str(int(value)) if float(value).is_integer() else str(value)
```

Replace with:

```python
    return str(int(value)) if value.is_integer() else str(value)
```

(`value` is already typed `float` per the function signature, so `float(value)` is redundant.)

- [ ] **Step 7: Add SHA1 NB+nosemgrep annotation to `helpers.py:163`**

In `/fastblocks_ui/helpers.py`, locate the `_normalize_dom_id` function and find the line:

```python
    digest = sha1(candidate.encode("utf-8")).hexdigest()[:10] if candidate else "0"
```

Insert **immediately above** this line:

```python
    # NB: SHA1 is intentional here. We use a 10-character hex prefix
    # purely as a *non-cryptographic* deterministic ID for fragment-stable
    # DOM ids; there is no adversarial model here and collisions in 10
    # chars are statistically irrelevant. Using SHA256/SHA3 would change
    # the external 10-char IDs and break tests that assert specific values.
    # nosemgrep: python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1
```

Verify the annotation is on its own line immediately above the `digest = sha1(...)` line. If semgrep's actual rule-id differs from `python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1`, replace the id verbatim from semgrep's output (Step 12).

- [ ] **Step 8: Edit `helpers.py:258` (FURB110)**

Find:

```python
            for_=resolved_control_id if resolved_control_id else None,
```

Replace with:

```python
            for_=resolved_control_id or None,
```

- [ ] **Step 9: Edit `helpers.py:361` (FURB123)**

Find inside `switch()`:

```python
        aria_checked=str(bool(checked)).lower(),
```

Replace with:

```python
        aria_checked=str(checked).lower(),
```

- [ ] **Step 10: Edit `helpers.py:403` (FURB123)**

Find inside `validation_summary()` dict branch:

```python
                f'<li><a href="#{escape(str(field_name), quote=True)}">'
```

Replace with:

```python
                f'<li><a href="#{escape(field_name, quote=True)}">'
```

(`field_name` is already `str` per `errors: dict[str, object]`.)

- [ ] **Step 11: Edit `helpers.py:436-437` (FURB113)**

Find the closing lines of `dialog()` (the two consecutive `parts.append` calls):

```python
    parts.append(_render_fragment(content))
    parts.append("</div></dialog>")
```

Replace with:

```python
    parts.extend((_render_fragment(content), "</div></dialog>"))
```

- [ ] **Step 12: Re-verify `helpers.py` is FURB-clean and SHA1-exempt**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  python -m refurb fastblocks_ui/helpers.py 2>&1 | tail -20
```

Expected: zero FURB violations in `helpers.py`.

Then:

```bash
cd /Users/les/Projects/fastblocks-ui && \
  semgrep --config p/python fastblocks_ui/helpers.py 2>&1 | grep -E '(insecure-hash|sha1)' | head -10
```

Expected: zero results (the `# nosemgrep` annotation suppresses the finding). If results appear, the rule-id in the annotation is wrong — copy the actual id out of the semgrep output, edit the `# nosemgrep:` line in `helpers.py`, re-run.

- [ ] **Step 13: Add SHA1 NB+nosemgrep annotation to `fastblocks.py:33`**

In `/fastblocks_ui/fastblocks.py`, find the `stable_id` function. Locate the line:

```python
    digest = sha1(normalized.encode("utf-8")).hexdigest()[:10]
```

Insert **immediately above** this line:

```python
    # NB: SHA1 is intentional. 10-char hex prefix is a *non-cryptographic*
    # stable id helper; no adversarial model here. See helpers.py for context.
    # nosemgrep: python.lang.security.insecure-hash-algorithms.insecure-hash-algorithm-sha1
```

Verify the annotation immediately precedes the `digest = ...` line.

- [ ] **Step 14: Run semgrep on `fastblocks.py`**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  semgrep --config p/python fastblocks_ui/fastblocks.py 2>&1 | grep -E '(insecure-hash|sha1)' | head -10
```

Expected: zero results. If results appear, fix the rule-id per Step 12's procedure.

- [ ] **Step 15: Run the project test suite**

```bash
cd /Users/les/Projects/fastblocks-ui && pytest -q 2>&1 | tail -30
```

Expected: all tests pass (or the same failures that existed before Task 2 began — every external observable is preserved so behavior-regressing failure is unlikely). If any previously-passing test now fails, **stop and report** — this signals an unexpected behavior change in a rewrite.

- [ ] **Step 16: Commit with explicit pathspec**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git add fastblocks_ui/cli.py fastblocks_ui/helpers.py fastblocks_ui/fastblocks.py && \
  git status --short
```

Expected: three `M` lines for the three target files. **Nothing else staged.** If anything else appears, **stop and report**.

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git commit -m "style(quality): refurb FURB cleanup; nosemgrep for non-security sha1 ID

Refurb rewrites are pure-mechanical I/O-semantic preservation across
cli.py and helpers.py (pathlib, str-startswith tuple, redundant-cast
removal). The sha1 callsites in helpers._normalize_dom_id and
fastblocks.stable_id are documented as non-security ID-generation
uses via # nosemgrep annotations; algorithm change would alter
externally-visible 10-char DOM-id prefixes and break test snapshots.

Refs: docs/superpowers/specs/2026-07-27-comprehensive-hooks-design.md"
```

**Task 2 ends with:** commit `style(quality)` on `fix/comprehensive-hooks-failing`. Branch is now 2 fix-commits ahead of `main`.

---

## Task 3: `docs(links)` — fix broken htmx and archive refs

**Files:**
- Modify: `/docs/usage.md` (line 437)
- Modify: `/docs/layout-v2-spec.md` (line 484)
- Modify: `/docs/archive/superseded-plans/implementation-plan.md` (lines 4, 7, 23)

**Interfaces:**
- Consumes: docs files containing broken URLs/paths
- Produces: same prose, broken-link-free

- [ ] **Step 1: Re-confirm lychee failures**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  lychee docs/**/*.md 2>&1 | grep -E '(404|File not found|ERROR)' | head -20
```

Expected: the same 5 broken links originally surfaced. If lychee reports zero (e.g., the prior wave's dirty tree fixed them), **stop and report** — Task 3's edit list is moot.

- [ ] **Step 2: Fix `docs/usage.md:437`**

In `/docs/usage.md`, find:

```markdown
Reference: [htmx data tables example](https://htmx.org/examples/data-tables/)
```

Replace with:

```markdown
Reference: see the htmx docs for the data-tables example pattern.
```

- [ ] **Step 3: Fix `docs/layout-v2-spec.md:484`**

In `/docs/layout-v2-spec.md`, find the broken URL on or near line 484:

```markdown
[htmx data tables example](https://htmx.org/examples/data-tables/)
```

Replace with:

```markdown
the htmx docs' data-tables example (original URL returned 404 at last check)
```

Preserve the surrounding sentence prose — keep capitalization/punctuation of the surrounding line.

- [ ] **Step 4: Fix `docs/archive/superseded-plans/implementation-plan.md`**

Open `/docs/archive/superseded-plans/implementation-plan.md`. Find the three broken `file://` references (lines 4, 7, 23 per lychee). The current text reads:

```markdown
See also:
- the prior spec at `docs/archive/superseded-plans/fastblocks-ui-implementation-plan.md`
- the bulma-era plan at `docs/archive/superseded-plans/archive/legacy/fastbulma-implementation-plan.md`
- the light-dom custom-elements spec at `docs/archive/superseded-plans/light-dom-custom-elements-spec.md`
```

Replace with:

```markdown
See also (formerly linked; these spec files have since been moved out of
the docs tree and no longer exist at the cited paths):
- `docs/archive/superseded-plans/fastblocks-ui-implementation-plan.md`
- `docs/archive/superseded-plans/archive/legacy/fastbulma-implementation-plan.md`
- `docs/archive/superseded-plans/light-dom-custom-elements-spec.md`
```

Use exact whitespace matching. If the file's actual content differs from this reference, adapt to the existing prose while preserving the principle: broken `file://` paths become plain prose and the audit-trail reference is retained.

- [ ] **Step 5: Re-verify lychee is clean**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  lychee docs/**/*.md 2>&1 | grep -E '(404|File not found|ERROR)' | head -20
```

Expected: zero results. If any broken-link remains, the corresponding edit was incomplete — re-examine the file and the URL.

- [ ] **Step 6: Commit with explicit pathspec**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git add \
    docs/usage.md \
    docs/layout-v2-spec.md \
    docs/archive/superseded-plans/implementation-plan.md && \
  git status --short
```

Expected: three `M` lines for the three target doc files. **Nothing else staged.**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git commit -m "docs(links): fix or drop broken htmx and archive refs

lychee previously flagged a 404 against htmx.org/examples/data-tables/
(referenced from usage.md and layout-v2-spec.md) and three missing
file:// paths inside the archive/superseded-plans tree. Convert the
live URLs to plain prose that retains the audit-trail context.

Refs: docs/superpowers/specs/2026-07-27-comprehensive-hooks-design.md"
```

**Task 3 ends with:** commit `docs(links)` on `fix/comprehensive-hooks-failing`. Branch is now 3 fix-commits ahead of `main`.

---

## Task 4: Final verify and fast-forward merge into `main`

**Files:** none modified in this task.

- [ ] **Step 1: Run full crackerjack once**

```bash
cd /Users/les/Projects/fastblocks-ui && crackerjack run 2>&1 | tail -80
```

Expected: all six hook categories green. The output may list "passed" / "skipped" hooks; the absence of any failure entries (or `[Errno 2]`, `FURB*`, `nosemgrep`, `404 Not Found`, or `File not found` strings) is the success signal.

If any of the six categories is still red at this point, **stop and report** before proceeding — debug the regressing hook before merging.

- [ ] **Step 2: Inspect git state on `fix/comprehensive-hooks-failing`**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git log --oneline -5 fix/comprehensive-hooks-failing
```

Expected output (commit SHAs will differ; only the message subjects matter):

```
<sha> docs(links): fix or drop broken htmx and archive refs
<sha> style(quality): refurb FURB cleanup; nosemgrep for non-security sha1 ID
<sha> chore(infra): pyscn/creosote wrappers and .cache/ for betterleaks
<sha> docs(spec): comprehensive-hooks-failing design
<sha> (prior main commit)
```

- [ ] **Step 3: Inspect working tree before merge**

```bash
cd /Users/les/Projects/fastblocks-ui && git status --short
```

Expected: the same ~12 dirty-tree files (and 3 untracked) that were already present **before** Task 1. The only items **not** in this list must be the four files modified by this fix (which are now committed):

- `.gitignore`
- `fastblocks_ui/cli.py`
- `fastblocks_ui/helpers.py`
- `fastblocks_ui/fastblocks.py`
- `docs/usage.md`
- `docs/layout-v2-spec.md`
- `docs/archive/superseded-plans/implementation-plan.md`

If any of those seven files appears as `M ` (modified, unstaged) in `git status`, **stop and report** — a step's commit did not land and needs to be completed before merging.

- [ ] **Step 4: Switch to `main`**

```bash
cd /Users/les/Projects/fastblocks-ui && git status --short
```

Note any pre-existing modifications in the working tree — they will carry over to `main` after the merge, which is expected.

```bash
cd /Users/les/Projects/fastblocks-ui && git checkout main
```

Expected: switches to main branch. The dirty tree persists (git carries uncommitted edits across branch switches).

- [ ] **Step 5: Fast-forward merge**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git merge --ff-only fix/comprehensive-hooks-failing
```

Expected: a 4-commit fast-forward merge with no merge commit. Output looks like:

```
Updating <old-sha>..<new-sha>
Fast-forward
 .gitignore                                          |  3 +
 docs/usage.md                                       |  2 +-
 docs/layout-v2-spec.md                              |  2 +-
 fastblocks_ui/cli.py                                | 22 +++++------
 fastblocks_ui/fastblocks.py                         |  6 ++++
 fastblocks_ui/helpers.py                            | 21 ++++++++----
 docs/superpowers/specs/2026-07-27-comprehensive-hooks-design.md | (already in main from spec)
 docs/archive/superseded-plans/implementation-plan.md |  4 +++-
 7 files changed, ...
```

(The spec file at `docs/superpowers/specs/...` is part of `fix/comprehensive-hooks-failing` already; if ff-merged from there, it should also appear in the merge stat.)

If the merge fails with "Not possible to fast-forward, ...", do **not** use `--no-ff` or merge commits. **Stop and report** — main has moved since the branch was created (unlikely on a local-only repo, but possible).

- [ ] **Step 6: Verify main is in the expected state**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git log --oneline -6 main
```

Expected: top of main shows the spec commit (c0) and the three fix commits (c1/c2/c3). The dirty working tree is unchanged.

- [ ] **Step 7: (Optional) Delete the topic branch**

```bash
cd /Users/les/Projects/fastblocks-ui && \
  git branch -d fix/comprehensive-hooks-failing
```

Expected: branch deleted locally. (No `git push`, no remote dance.)

**Task 4 ends with:** `main` contains four new commits, the comprehensive hook suite is green, and the topic branch is gone (or kept locally — both are valid).

---

## Self-Review (run after writing the plan, before handoff)

1. **Spec coverage:** Skim the spec sections.
   - Context / Goal / Branch / Commit 1 / Commit 2 / Commit 3 / Verify gate / Rollback / Risks / Non-goals — all mapped to a task above.
   - Files touched list matches spec table.
   - Verify-gate command in spec = Step 1 of Task 4. ✓
   - Rollback strategy in spec = `git revert` per-commit (each task's commit is revertable). ✓
   - Risk #4 (`uv pip install --force-reinstall`) handled implicitly by Step 2 — gitignored so no commit pollution. ✓
2. **Placeholder scan:** Search the plan for "TBD", "TODO", "add appropriate error handling", "similar to Task N", etc. — none present. Every "Replace X with Y" is concrete with the literal replacement text.
3. **Type consistency:** The function names referenced in Tasks 1-4 (`copy_assets`, `_format_number`, `_normalize_dom_id`, `stable_id`, `_render_attrs`, `field`, `dialog`, `switch`, `validation_summary`) all match the actual symbols in the source files as read during spec authoring.
4. **DRY/YAGNI check:** No new abstractions introduced. No new tests added (per spec non-goals). No new docs. The plan is mechanical.
5. **TDD discipline:** Each task has a baseline capture (red hook or red test) and a success capture (green hook or green test). Each task ends with one commit. Each commit uses explicit pathspec.
6. **Frequent-commit discipline:** Three fix-commits + one spec precommit. Each is reviewable independently.
