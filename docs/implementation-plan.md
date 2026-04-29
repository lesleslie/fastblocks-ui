# FastBlocks UI Implementation Plan

This plan converts the audit backlog into a sequenced implementation roadmap.
The goal is to keep the public `ui-*` API stable while using optional enhancement JavaScript and a tokenized CSS system under the hood.

## Progress Tracking

Use these status values while working the plan:

- `pending` - not started
- `in_progress` - actively being worked
- `blocked` - waiting on a decision or dependency
- `done` - implemented and verified

| ID | Status | Owner | Notes |
|----|--------|-------|-------|
| FB-001 | pending | unassigned | Text-field mapping / init path |
| FB-002 | pending | unassigned | Init contract and idempotency |
| FB-003 | pending | unassigned | DOM registration helper |
| FB-004 | pending | unassigned | Transition layer / theme animation |
| FB-005 | pending | unassigned | Packaging and import layout |
| FB-006 | pending | unassigned | Version / license / toolchain metadata |
| FB-007 | pending | unassigned | Component manifest and docs generation |
| FB-008 | pending | unassigned | Packaged artifact smoke tests |

## Goals

- Preserve the `fast-*` public markup contract.
- Make initialization deterministic and safe.
- Keep packaging and documentation honest.
- Add one smoke path that validates the shipped artifact, not just source files.

## Non-Goals

- Do not expand the active component surface beyond the current supported set without a manifest update.
- Do not change the public namespace to `fluent-*`.
- Do not rewrite archived planning docs unless they are actively misleading current users.

## Phase 1 - Stabilize Runtime Behavior

### Scope

- FB-001 Fix the `fast-text-field` runtime mapping
- FB-002 Make initialization explicit and idempotent
- FB-004 Restore the theme transition layer
- FB-003 Remove or implement `registerComponentsInDOM()`

### Work Items

1. Verify the exact current Fluent tag names for all supported controls.
2. Convert the alias table into the canonical runtime contract for supported `fast-*` tags.
3. Add a `ready` or equivalent promise to the public UI boot path.
4. Set the initialized state once startup has succeeded.
5. Remove the no-op observer, or implement real late-node upgrade logic.
6. Fix the CSS transition cascade so theme switching animates again.

### Acceptance Criteria

- `fast-text-field` upgrades correctly in the demo and in tests.
- Repeated UI boot does not register enhancements more than once.
- Theme transitions visibly animate.
- `registerComponentsInDOM()` either works or is gone.

## Phase 2 - Normalize Packaging and Metadata

### Scope

- FB-005 Normalize package, import, and install layout
- FB-006 Single-source version, license, and toolchain metadata

### Work Items

1. Decide the canonical import path for local development and installed usage.
2. Fix the asset-copy destination contract and update the docs accordingly.
3. Make versioning derive from one source of truth.
4. Align `pyproject.toml`, `LICENSE`, `README.md`, and runtime constants.
5. Align Ruff and related tooling with the supported Python baseline.

### Acceptance Criteria

- Clean-checkout import works.
- Installed-wheel import works.
- Asset copy behavior is predictable and documented.
- License text is consistent everywhere.
- Tooling and runtime support statements match.

## Phase 3 - Tighten the Public API Surface

### Scope

- FB-007 Generate the supported component catalog from one manifest

### Work Items

1. Create a machine-readable list of supported `fast-*` tags and their Fluent equivalents.
2. Validate the demo and docs against that manifest.
3. Mark unsupported or archived components explicitly.
4. Remove stale examples that imply unsupported components are active.

### Acceptance Criteria

- The documented component list matches the runtime support matrix.
- Unsupported components are not presented as first-class public API.
- Demo examples are generated from, or checked against, the manifest.

## Phase 4 - Add Packaged-Artifact Smoke Tests

### Scope

- FB-008 Add a real packaged-product smoke test

### Work Items

1. Add a clean-environment build/install smoke test.
2. Add an import test that targets the installed package, not just source files.
3. Add a CLI invocation check for the asset-copy workflow.
4. Add one browser smoke test that loads the real runtime bundle.

### Acceptance Criteria

- The build/install/import path is validated in CI or an equivalent local workflow.
- The CLI copy-assets path is validated.
- The browser smoke test exercises the real bundle and a real `fast-*` element.

## Release Gate

Before a release candidate is cut:

- Run the JS unit suite.
- Run the E2E suite.
- Run the smoke tests for the packaged artifact.
- Recheck license, version, and install metadata.
- Verify the demo loads without console errors.

## Brainstorming Notes

Before implementing, answer these design questions:

1. Should the runtime expose an explicit `ready` promise, or should `init()` become the primary public contract?
2. Should `registerComponentsInDOM()` be removed entirely, or should it perform real late-node upgrades?
3. Should the component catalog be generated from a manifest, or should docs be manually maintained with validation only?
4. What is the canonical text-field contract for the current Fluent-backed runtime?
5. Should the asset-copy CLI target the repo root, `static/`, or a user-specified prefix by default?
6. Should package metadata, runtime constants, and docs be derived from a single version/license source?

## Recommended Execution Order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4

## Notes

- Keep the `fast-*` public API stable while the implementation layer evolves.
- If upstream Fluent tag names change again, update the manifest first and regenerate downstream docs/tests from it.
- Update the status table above as work progresses.
