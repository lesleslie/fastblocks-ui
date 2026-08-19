# Repository Guidelines

## Project Structure & Module Organization

- Framework source, packaging metadata, and asset definitions live in the repo root; review `README.md`, `PACKAGE_README.md`, and build configuration before changing distribution behavior.
- Static CSS and JS outputs should remain reproducible from source and build tooling rather than being hand-edited in generated form.
- Tests should live under `tests/` when present; add them alongside behavioral changes instead of relying only on manual browser verification.
- Root docs such as `RULES.md` and changelog files capture project policy and release context.

## Build, Test, and Development Commands

- Install dependencies with the repo's documented Python workflow.
- Use the package CLI to copy or stage assets when validating install behavior.
- Run lint, format, and test commands through the configured project tooling before landing changes.
- Verify generated CSS and JS bundles after touching theme or asset code.
- When adding or revising an opt-in visual effect (backdrop, motion, 3D/media), update the per-effect cookbook in `docs/effects.md` alongside the code change. The cookbook is the single source of truth for the consumer-facing surface; the test in `tests/e2e/backdrop-contrast.spec.js` and the per-component bundle tests in `tests/test_fastblocks_ui.py::TestBundleSizeBudget` guard the contract.

## Coding Style & Naming Conventions

- Keep CSS variable mappings, asset names, and public package APIs stable.
- Prefer descriptive snake_case for Python helpers and keep generated asset paths predictable.
- Avoid framework-specific abstractions that undermine the project's zero-build-tool posture.

## Testing Guidelines

- Add regression tests or fixture-based checks when changing CLI behavior, asset generation, or packaging.
- Manually verify representative component styling when touching CSS variable integration.

## Commit & Pull Request Guidelines

- Use focused commits such as `fix(theme): align fast token mapping`.
- PRs should note whether changes affect runtime assets, packaging, or documentation examples.

## Security & Configuration Tips

- Do not commit secrets or local package registry credentials.
- Be cautious with third-party asset URLs and document any supply-chain-sensitive dependency changes.
