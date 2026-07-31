# Spec C investigation: the sibling-package boundary

- **Date:** 2026-07-29
- **Status:** Findings. Read-only investigation; neither sibling repo was modified.
- **Question:** does `fastblocks` or `fastblocks-htmy` re-export, wrap, or merely
  document `fastblocks_ui` helpers; which roadmap changes cross that boundary;
  and do the three packages need lockstep releases?

Versions inspected: `fastblocks-ui` 0.7.1, `fastblocks` 0.20.0 (`f1a3ddb`),
`fastblocks-htmy` 0.4.0 (`542d63e`).

## Answer in one line

Both **wrap**; neither re-exports. The dependency runs strictly one way, and the
coupling is not to the CSS — it is to `manifest.json`, to helper signatures, and
to two asset file *paths*. Lockstep is required for the 0.8.0 release, but for a
narrower reason than "they share a design system."

## Dependency direction

```
fastblocks-ui  (zero runtime dependencies; knows nothing about either sibling)
      ▲                              ▲
      │ optional extra               │ hard runtime dependency
      │ >=0.7,<0.8                   │ >=0.7,<0.8
      │                              │
 fastblocks 0.20.0            fastblocks-htmy 0.4.0
```

`fastblocks-ui` contains no reference to either sibling outside documentation.
Nothing needs to change here for a sibling's sake.

## `fastblocks` — one lazily-imported style adapter

`fastblocks-ui` is an **optional extra**, not a dependency:

```toml
[project.optional-dependencies]
fastblocks_ui = ["fastblocks-ui>=0.7,<0.8"]
```

A single file consumes it, `fastblocks/adapters/style/fastblocks_ui.py`, and it
imports lazily inside functions so `pip install fastblocks` alone never needs the
package. Its own docstring describes it as the first style adapter "actually
wired end-to-end" — the sibling `kelp.py` and `webawesome.py` adapters are
recorded there as disconnected scaffolding whose registration functions have no
call sites.

Surfaces consumed:

| Surface | Use |
|---|---|
| `__version__` | cache-bust query string on asset URLs |
| `get_css_path()` / `get_js_path()` | `os.path.basename` → `<link>` / `<script>` |
| `component_manifest()` | builds `name` → `class_name` map, plus `state_modifiers` |
| `button`, `card`, `field`, `alert`, `container` | registered as Jinja globals `ui_button`, `ui_card`, … |

Deliberate non-consumption is the notable part: the adapter resolves asset
filenames from the installed package rather than hardcoding them, and derives
class names from the manifest rather than a copied table. It contains **zero**
hardcoded `ui-*` class strings, and `<script type="module">` is required because
`fastblocks-ui.js` is an ES module.

## `fastblocks-htmy` — a typed wrapper over the whole manifest

A hard runtime dependency, pinned twice. Once in `pyproject.toml`, and again as
an import-time skew warning:

```python
_UI_MIN = (0, 7)
_UI_MAX = (0, 8)
```

The package wraps all 27 manifest components as typed `htmy` dataclasses.
`fastblocks_htmy/ui/_generated.py` and `layout/_generated.py` are **generated
from this repo's `manifest.json` `params`** by its `scripts/generate_components.py`;
a handful (`Menu`, `Tabs`, `Field`, `Navbar`, `Table`, `Breadcrumb`,
`ValidationSummary`, `Select`, `Button`) are hand-written carve-outs for
signatures outside codegen's flat-field scope.

Every wrapper delegates to the corresponding `fastblocks_ui` helper and wraps the
result in htmy's `SafeStr`. Styling is never reimplemented — `base.py` states
this explicitly. Like `fastblocks`, it hardcodes **zero** `ui-*` class strings.

Additional surfaces beyond the 27 helpers: `Size` and `Variant` type exports,
`COMPONENT_MANIFEST`, `get_manifest_path()`, `get_static_path()`,
`get_css_path()`, `get_js_path()`.

### Three assertions that make this repo's manifest load-bearing

1. **Exact set equality** — `tests/test_fastblocks_integration.py`:

   ```python
   expected_names = {c["name"] for c in manifest["components"]}
   assert set(components) == expected_names
   ```

   Not a subset check. **Adding** a component to `manifest.json` fails this test
   exactly as hard as removing one.

2. **Codegen drift gate** — `tests/test_components.py` shells out to
   `scripts/generate_components.py --check`. Any change to a manifest `params`
   entry for a `codegen: true` component fails until regenerated.

3. **Pin consistency** — `test_ui_compat_range_matches_pyproject_pin` asserts
   `_UI_MIN`/`_UI_MAX` match the `pyproject.toml` pin, so the two cannot drift.

### Two asset paths are hardcoded

`asset_urls()` builds `/static/fastblocks-ui/css/fastblocks-ui.css` and
`/static/fastblocks-ui/js/enhance.js` as literals, and `inline_js()` reads
`static/js/enhance.js` **directly** rather than via `get_js_path()` — a
documented, deliberate choice, because `fastblocks-ui.js` re-exports from
`./enhance.js` with a *relative* specifier that would 404 once inlined into an
arbitrary page.

**Constraint this creates:** `static/js/enhance.js` and
`static/css/fastblocks-ui.css` must keep existing at those exact paths. Spec B
may empty `enhance.js` of retired handlers, but must not rename or delete the
file. Same for the CSS bundle.

## Which roadmap changes cross the boundary

| Change | `fastblocks` | `fastblocks-htmy` |
|---|---|---|
| Tier 1.3/1.4 (`:has`, `:user-invalid`), 1.5 `field-sizing`, 1.6 `accent-color` | invisible | invisible |
| Tier 2 token derivation (`color-mix`) | invisible | invisible; `inline_css()` output bytes change, no API change |
| Tier 3 view transitions, Tier 4 polish | invisible | invisible |
| **`ui-*` class renames** | invisible — class names come from the manifest | invisible — none hardcoded |
| **Manifest component renamed** (`menu` → `dropdown`) | tolerant; lookup is generic | **breaks** — hand-written `Menu` wrapper + assertion 1 |
| **Manifest components added** (Spec A's five) | tolerant | **breaks** — assertion 1 |
| **Helper signature changes** (`dialog()`, `menu()`) | breaks only for the 5 registered globals; `dialog`/`menu` are not among them | **breaks** — assertion 2, codegen regenerate |
| **`enhance.js` export deletion** | file must still exist at its path | file must still exist at its path |
| **Version bump to 0.8.0** | extra pin `<0.8` silently resolves to 0.7.x | **hard fail** — pin + `_UI_MAX` warning |

The headline: **CSS is not the coupling surface.** Every Tier 1–4 styling change
is invisible to both siblings. What crosses the boundary is the manifest, the
Python helper signatures, and two file paths.

## Lockstep verdict

**Required for 0.8.0, and the ordering is not optional.**

Spec A alone forces it. Adding five components to `manifest.json` breaks
`fastblocks-htmy`'s exact-set-equality assertion, so a change described in its
own spec as "additive, no existing behaviour changes" is breaking *across the
repo boundary*. Shipping it as 0.7.2 would break a sibling **inside that
sibling's declared-compatible range** — the `>=0.7,<0.8` pin would not protect
anyone, because 0.7.2 satisfies it.

That is the argument for 0.8.0 rather than a patch, independent of Spec B.

**Release order:**

1. `fastblocks-ui` 0.8.0 — publish first; nothing depends on the siblings.
2. `fastblocks-htmy` — bump the `pyproject.toml` pin *and* `_UI_MIN`/`_UI_MAX` to
   `(0, 8)`/`(0, 9)`, re-run `scripts/generate_components.py`, add wrappers for
   the five new Spec A components, rename `Menu` → `Dropdown`.
3. `fastblocks` — bump the optional extra to `>=0.8,<0.9`. No code change: its
   five Jinja globals (`button`, `card`, `field`, `alert`, `container`) touch no
   renamed or resignatured component.

**Not required for:** any future release that changes only CSS. A pure Tier 2/3/4
release can ship as a minor bump with no sibling work at all, and the siblings'
version pins are the only thing that would need widening.

## Follow-ups for whoever picks up Spec C implementation

1. `fastblocks-htmy`'s exact-set-equality assertion is the single sharpest edge
   in the whole arrangement. Consider proposing it become a subset check plus an
   explicit "known missing" list, so additive releases upstream stop being
   breaking downstream. That is a change to *their* repo and out of scope here.
2. Neither sibling has a test that would catch a `ui-*` class rename, because
   neither hardcodes one. That is a good property, and worth stating in this
   repo's own docs so nobody "helpfully" adds a hardcoded class later.
3. `fastblocks`'s optional-extra pin fails *silently* (resolves to an older
   version) rather than loudly. Worth a runtime version check mirroring
   `fastblocks-htmy`'s `_check_fastblocks_ui()`.
