"""Generate a self-contained FastBlocks UI demo page.

The page is rendered *through* the Python helpers (so it always reflects real helper
output and doubles as an integration smoke test), with the CSS bundle and the
``enhance.js`` behavior layer inlined so the result is a single file you can open
directly in a browser -- no server required.

The page is a full component showcase: every component in
``fastblocks_ui/manifest.json`` gets its own anchored section (grouped into
categories) -- ``tests/test_demo_parity.py`` enforces that, so adding a
component to the manifest without a section here fails the suite. ``shell`` is
the one section that shows escaped markup instead of a live instance: it
renders a real ``<main>``, and a document may have only one that is not
hidden.

The table of contents is a ``drawer()`` below 1024px and the ``shell()``'s
sticky right-hand column above it -- one element with one id, serving both
roles. See
``docs/roadmap.md`` for the redesign rationale and ``demo/demo.html`` for the
hand-written mirror this file is kept in parity with (via
``tests/test_demo_parity.py``).

Usage:
    python scripts/build_demo.py        # writes demo/index.html
"""

from __future__ import annotations

from html import escape as _esc
from pathlib import Path

from fastblocks_ui import (
    COMPONENT_MANIFEST,
    alert,
    breadcrumb,
    burger,
    button,
    card,
    checkbox,
    column,
    columns,
    compose,
    container,
    dialog,
    drawer,
    field,
    footer,
    hero,
    level,
    media,
    dropdown,
    nav_groups,
    nav_list,
    navbar,
    pagination,
    progress,
    section,
    shell,
    switch,
    table,
    tabs,
    tile,
    title,
    validation_summary,
)
from fastblocks_ui import input as ui_input
from fastblocks_ui import select as ui_select
from fastblocks_ui.helpers import SafeHTML, Size, _safe

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "fastblocks_ui" / "static" / "css" / "fastblocks-ui.css"
JS = ROOT / "fastblocks_ui" / "static" / "js" / "enhance.js"
OUT = ROOT / "demo" / "index.html"


# ---------------------------------------------------------------------------
# Demo-only page chrome (not part of the shipped fastblocks-ui.css bundle --
# these classes exist only to lay out this documentation page).
# ---------------------------------------------------------------------------
DEMO_CSS = """
.demo-skip-link {
  position: absolute;
  left: -9999px;
  top: auto;
  background: var(--ui-color-surface);
  color: var(--ui-color-text-strong);
  padding: var(--ui-space-2) var(--ui-space-3);
  border-radius: var(--ui-radius-md);
  box-shadow: var(--ui-shadow-2);
  z-index: 100;
}
.demo-skip-link:focus {
  left: var(--ui-space-4);
  top: var(--ui-space-4);
}
/* The nav skip link exists only above the drawer breakpoint, because below it
   the target does not exist to skip to: `#site-nav` is a `[popover]`, and the
   UA rule `[popover]:not(:popover-open) { display: none }` applies until
   layout.css grants it `display: block` at 1024px. A skip link pointing at a
   `display: none` target neither scrolls nor moves focus, so it was dead at
   exactly the widths where "skip to nav" would earn its keep.

   Hiding it there loses nothing: below the breakpoint the nav is reached
   through the burger, which sits in the sticky bar within a couple of tabs of
   the page top. Above the breakpoint the nav is a DOM-last sticky column
   behind 30-odd sections, which is where the link genuinely helps.

   Note axe reports a hidden skip-link target as *incomplete*, not a
   violation -- a violations-only scan will not catch this class of bug. */
.demo-skip-link[data-demo-skip="nav"] {
  display: none;
}
@media (min-width: 1024px) {
  .demo-skip-link[data-demo-skip="nav"] {
    display: revert;
  }
}
.demo-category-title {
  margin: 0;
  padding-top: var(--ui-space-4);
  border-top: var(--ui-border-width) solid var(--ui-color-border);
}
.demo-category-title:first-child {
  padding-top: 0;
  border-top: none;
}
.demo-section {
  /* No `scroll-margin-top` here any more: the bundle's
     `:root:has(> body > .ui-navbar.is-sticky) { scroll-padding-top }` offsets
     every anchor on the page from one declaration, including the ones these
     sections do not own (the navbar brand's `#top`, the skip links). */
  content-visibility: auto;
  /* Required alongside `content-visibility: auto`, which applies size
     containment while a subtree is skipped. With no intrinsic size to fall
     back on, every offscreen section measures 0px tall, so the scroll
     position an anchor resolves to is computed against a document that is a
     fraction of its real height. */
  contain-intrinsic-size: auto 40rem;
}
.demo-section h3 {
  margin-block-end: var(--ui-space-3);
}
.demo-toolbar {
  justify-content: space-between;
}
.demo-panel {
  display: grid;
  gap: var(--ui-space-3);
  position: relative;
}
.demo-bordered {
  border: 1px dashed var(--ui-color-border);
  border-radius: var(--ui-radius-md);
}
.demo-bordered + .demo-bordered {
  margin-top: var(--ui-space-2);
}
.demo-swatch-row + .demo-swatch-row {
  margin-top: var(--ui-space-4);
}
.demo-swatch-family {
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ui-color-text-muted);
  margin: 0 0 var(--ui-space-2);
}
.demo-swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: var(--ui-space-3);
}
.demo-swatch-cell {
  display: grid;
  gap: var(--ui-space-1);
  min-width: 0;
}
.demo-swatch {
  block-size: 3.5rem;
  border: var(--ui-border-width) solid var(--ui-color-border);
  border-radius: var(--ui-radius-md);
  display: flex;
  align-items: flex-end;
  padding: var(--ui-space-2);
  font-size: 0.75rem;
  font-weight: 600;
}
/* Label color per family, so it stays readable on the fill. */
.demo-swatch-on-primary { color: var(--ui-color-primary-contrast); }
.demo-swatch-on-info { color: var(--ui-color-info-contrast); }
.demo-swatch-on-success { color: var(--ui-color-success-contrast); }
.demo-swatch-on-warning { color: var(--ui-color-warning-contrast); }
.demo-swatch-on-danger { color: var(--ui-color-danger-contrast); }
.demo-swatch-name {
  font-size: 0.6875rem;
  color: var(--ui-color-text-muted);
  overflow-wrap: anywhere;
}

/* Container-query comparison. The panels' fixed widths ARE the demo, so
   they must not shrink -- but a 31rem panel cannot fit a 375px phone, and
   left alone it widens every ancestor and overflows the page by ~2x.
   `max-width: 100%` doesn't help: it resolves against a parent that was
   itself stretched by this very child, so the constraint is circular.

   Same answer as `.ui-table__container`: give the pair its own scroll
   container -- with `tabindex="0"` on it, since a scrollable region that no
   descendant can focus is unreachable by keyboard (axe:
   scrollable-region-focusable). The panels keep their real widths, the overflow is contained
   and scrollable, and the comparison stays truthful at every viewport
   instead of silently collapsing into two identical panels. */
.cq-compare {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: var(--ui-space-3);
  overflow-x: auto;
}
.cq-panel {
  flex: none;
  border: 1px dashed var(--ui-color-border);
  padding: var(--ui-space-3);
}
/* Only the shell section uses this: it shows escaped markup because a live
   nested `shell()` would emit a second `<main>`, which is invalid HTML.

   `overflow-x: auto` makes this a scrollable region, and a scrollable region
   has to be reachable by keyboard or its content cannot be scrolled without a
   mouse -- hence `tabindex="0"` on the element itself (axe:
   scrollable-region-focusable). */
.demo-code {
  margin: 0;
  padding: var(--ui-space-3);
  border-radius: var(--ui-radius-md);
  background: var(--ui-color-surface-muted);
  overflow-x: auto;
  font-size: 0.8125rem;
  line-height: 1.5;
}
.demo-avatar {
  inline-size: 2.5rem;
  block-size: 2.5rem;
  border-radius: 50%;
  background: var(--ui-color-surface-muted);
  color: var(--ui-color-text-strong);
  display: grid;
  place-items: center;
  font-weight: 600;
  flex-shrink: 0;
}
""".strip()


def demo_section(
    anchor_id: str, heading: str, body: object, *, lead: str | None = None
) -> SafeHTML:
    """Wrap a showcase block in an anchored, headed example card.

    The heading is a real ``<h3>`` -- not ``card(header=...)``'s ``<header>``,
    which has no implicit ARIA heading role when nested inside ``<main>`` -- so
    it is both a genuine landmark for screen-reader heading navigation and a
    stable anchor the sidebar table of contents can link to.
    """
    lead_html = f'<p class="ui-muted">{_esc(lead)}</p>' if lead else ""
    box = card(body=_safe(f'{lead_html}<div class="ui-stack">{body}</div>'))
    return _safe(
        f'<section id="{anchor_id}" class="demo-section" aria-labelledby="{anchor_id}-heading">'
        f'<h3 id="{anchor_id}-heading">{_esc(heading)}</h3>{box}</section>'
    )


def _bordered(html: object) -> str:
    """Wrap a fragment in a dashed outline.

    Spacing-only components (``section()``, ``container()``) have no border or
    background of their own, so without this their padding differences would be
    invisible against the surrounding card body.
    """
    return f'<div class="demo-bordered">{html}</div>'


# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------
def container_demo() -> SafeHTML:
    # Named keywords rather than `**kwargs: object`. Splatting an `object`
    # mapping into `container()`'s `bool` parameters is unsound and the type
    # checker rejects it -- and it also loses the only thing worth having
    # here, which is being told when a modifier name is wrong.
    def box(
        label: str,
        *,
        fluid: bool = False,
        widescreen: bool = False,
        fullhd: bool = False,
    ) -> str:
        return _bordered(
            str(
                container(
                    _safe(f"<code>{label}</code>"),
                    fluid=fluid,
                    widescreen=widescreen,
                    fullhd=fullhd,
                )
            )
        )

    return _safe(
        box("Default container -- max-width 1200px.")
        + box("is-fluid container -- no max-width, always full width.", fluid=True)
        + box("is-widescreen container -- max-width 1344px.", widescreen=True)
        + box(
            "is-fullhd container -- no max-width above the fullhd breakpoint.",
            fullhd=True,
        )
    )


def section_demo() -> SafeHTML:
    def box(label: str, *, size: Size | None = None) -> str:
        return _bordered(str(section(_safe(f"<code>{label}</code>"), size=size)))

    return _safe(
        box("Default section padding.")
        + box("is-medium section padding.", size="medium")
        + box("is-large section padding.", size="large")
    )


def hero_demo() -> SafeHTML:
    # The page banner above is a live is-primary hero -- this section covers
    # the remaining color and size variants.
    colors = compose(
        *(
            hero(
                v.capitalize(),
                subtitle=f"is-{v} hero variant.",
                variant=v,
                size="small",
            )
            for v in ("info", "success", "warning", "danger", "light", "dark")
        )
    )
    sizes = compose(
        hero(
            "Medium hero", subtitle="is-medium size.", variant="primary", size="medium"
        ),
        hero("Large hero", subtitle="is-large size.", variant="primary", size="large"),
    )
    return _safe(str(colors) + str(sizes))


def title_demo() -> SafeHTML:
    return compose(*(title(f"Title, size {n}", size=str(n)) for n in range(1, 7)))


def media_demo() -> SafeHTML:
    avatar = _safe('<div class="demo-avatar" aria-hidden="true">AL</div>')
    start_example = media(
        _safe("<strong>Ada Lovelace</strong><p>Posted 2 hours ago.</p>"),
        image=avatar,
        position="start",
    )
    end_example = media(
        _safe("<strong>Alan Turing</strong><p>Posted 5 hours ago.</p>"),
        image=avatar,
        position="end",
    )
    return compose(start_example, end_example)


def tile_demo() -> SafeHTML:
    tile_a = tile(card(body=_safe("Tile A")), child=True)
    tile_b = tile(card(body=_safe("Tile B")), child=True)
    tile_c = tile(card(body=_safe("Tile C")), child=True)
    parent_left = tile(tile_a, parent=True, size="8")
    parent_right = tile(_safe(f"{tile_b}{tile_c}"), parent=True, size="4")
    ancestor = tile(_safe(f"{parent_left}{parent_right}"), ancestor=True)
    return _safe(f'<div class="ui-tiles">{ancestor}</div>')


def footer_demo() -> SafeHTML:
    return footer(
        _safe(
            "<p>FastBlocks UI -- HTML/CSS-first components for server-rendered "
            "Python apps.</p>"
            '<p><a href="#top">Back to top</a></p>'
        )
    )


def level_demo() -> SafeHTML:
    return level(
        left=_safe(
            '<strong>Toolbar</strong> <span id="demo-action-status" class="ui-muted">'
            "No action taken yet.</span>"
        ),
        right=button(
            "Action", type="button", variant="primary", id="demo-action-button"
        ),
    )


def columns_demo() -> SafeHTML:
    return columns(
        column(
            card(body=_safe("<strong>8 cols</strong><p>Main content area.</p>")),
            size="8",
        ),
        column(card(body=_safe("<strong>4 cols</strong><p>Sidebar.</p>")), size="4"),
    )


def column_demo() -> SafeHTML:
    offsets = columns(
        column(card(body=_safe('<code>size="4"</code>')), size="4"),
        column(
            card(body=_safe('<code>size="4" offset="4"</code>')), size="4", offset="4"
        ),
    )
    narrow = columns(
        column(card(body=_safe("<code>narrow</code>")), narrow=True),
        column(card(body=_safe("Flexible remaining column."))),
    )
    return compose(offsets, narrow)


# ---------------------------------------------------------------------------
# Navigation
# ---------------------------------------------------------------------------
def navbar_demo() -> SafeHTML:
    # Explicit labels: `navbar()` defaults to "main navigation", so two
    # instances on one page expose two navigation landmarks under a single
    # accessible name -- ambiguous for landmark navigation, and axe's
    # `landmark-unique`. This is exactly the case the helper's `label`
    # parameter was made overridable for (see its docstring).
    default_variant = navbar(
        "FastBlocks UI",
        brand_url="#",
        start=[("Docs", "#"), ("Components", "#")],
        end=button("Sign in", href="#", variant="primary", size="small"),
        label="navbar example, default",
    )
    dark_variant = navbar(
        "Brand",
        brand_url="#",
        items=[("Home", "#"), ("About", "#"), ("Contact", "#")],
        variant="dark",
        label="navbar example, dark",
    )
    return compose(default_variant, dark_variant)


def breadcrumb_demo() -> SafeHTML:
    return breadcrumb([("Home", "#"), ("Components", "#"), ("Pagination", None)])


def pagination_demo() -> SafeHTML:
    return pagination(5, 12, url_pattern="#page-{page}", siblings=1)


def dropdown_demo() -> SafeHTML:
    return _safe(
        # No `.demo-panel` positioning wrapper is needed any more -- the panel
        # is a popover in the top layer, anchored to its invoker.
        '<div class="demo-panel">'
        + str(
            button(
                "Toggle dropdown",
                type="button",
                popovertarget="demo-dropdown",
            )
        )
        + str(
            dropdown(
                [("Profile", "#"), ("Settings", "#"), ("Sign out", "#")],
                label="Demo dropdown",
                id="demo-dropdown",
            )
        )
        + '<p class="ui-muted">Opens, light-dismisses, and returns focus with no JavaScript.</p>'
        + "</div>"
    )


def tabs_demo() -> SafeHTML:
    return tabs(
        [
            (
                "demo-overview",
                "Overview",
                "Overview content lives in a normal server-rendered fragment.",
            ),
            (
                "demo-details",
                "Details",
                "Details content stays htmx-friendly and progressively enhanced.",
            ),
        ],
        active_id="demo-overview",
        label="Demo tabs",
    )


# ---------------------------------------------------------------------------
# Forms
# ---------------------------------------------------------------------------
def field_demo() -> SafeHTML:
    return field(
        label="Email address",
        help_text="We'll never share it.",
        control_html=ui_input(id="demo-email", type="email", value="ada@example.com"),
        control_id="demo-email",
    )


def input_demo() -> SafeHTML:
    return _safe(
        str(
            ui_input(
                id="demo-input-text",
                type="text",
                placeholder="Text input",
                aria_label="Text input example",
            )
        )
        + str(
            ui_input(
                id="demo-input-password",
                type="password",
                placeholder="Password",
                aria_label="Password input example",
            )
        )
        + str(
            ui_input(
                id="demo-input-disabled",
                type="text",
                value="Disabled",
                disabled=True,
                aria_label="Disabled input example",
            )
        )
    )


def select_demo() -> SafeHTML:
    return ui_select(
        options=[("sm", "Small"), ("md", "Medium"), ("lg", "Large")],
        value="md",
        id="demo-select-standalone",
        aria_label="Size",
    )


def checkbox_demo() -> SafeHTML:
    return compose(
        checkbox(label="Unchecked option"),
        checkbox(label="Checked option", checked=True),
    )


def switch_demo() -> SafeHTML:
    return compose(
        switch(label="Off by default"),
        switch(label="On by default", checked=True),
    )


def validation_summary_demo() -> SafeHTML:
    # Illustrative only -- the link target isn't a real field on this page (the
    # atomic demo doesn't render a full form); see "Complete form example"
    # below for a validation summary linking to a real, present field.
    return validation_summary({"demo-standalone-field": "This field is required."})


def forms_in_practice_demo() -> SafeHTML:
    # The "Display name" field's id/error-id (demo-display-name /
    # demo-display-name-error) are referenced by validation_summary()'s error
    # link below -- both are real helper output, kept in sync by
    # tests/test_demo_parity.py against the hand-written demo/demo.html
    # reference.
    return _safe(
        str(
            validation_summary(
                {"demo-display-name": "Display name must be at least 3 characters."}
            )
        )
        + '<form class="ui-stack" onsubmit="return false">'
        + field(
            label="Email address",
            help_text="We'll never share it.",
            control_html=ui_input(
                id="demo-practice-email", type="email", value="ada@example.com"
            ),
            control_id="demo-practice-email",
        )
        + field(
            label="Role",
            control_html=ui_select(
                options=[("dev", "Developer"), ("design", "Designer")],
                value="dev",
                id="demo-role",
            ),
            control_id="demo-role",
        )
        + field(
            label="Display name",
            help_text="Shown on your profile and in activity feeds.",
            error_text="Display name must be at least 3 characters.",
            control_html=ui_input(id="demo-display-name", type="text", value="Ada"),
            control_id="demo-display-name",
        )
        + checkbox(label="Remember me", checked=True)
        + switch(label="Enable notifications", checked=True)
        + f'<div class="ui-cluster">{button("Save", variant="primary", type="submit")}</div>'
        + "</form>"
    )


# ---------------------------------------------------------------------------
# Feedback & actions
# ---------------------------------------------------------------------------
def button_demo() -> SafeHTML:
    variants = compose(
        button("Default"),
        button("Primary", variant="primary"),
        button("Success", variant="success"),
        button("Warning", variant="warning"),
        button("Danger", variant="danger"),
        button("Link button", href="#", variant="primary"),
        button("Disabled", variant="primary", disabled=True),
        separator=" ",
    )
    sizes = compose(
        button("Small", variant="primary", size="small"),
        button("Default size", variant="primary"),
        button("Large", variant="primary", size="large"),
        separator=" ",
    )
    return _safe(
        f'<div class="ui-cluster">{variants}</div><div class="ui-cluster">{sizes}</div>'
    )


def alert_demo() -> SafeHTML:
    return compose(
        alert("A neutral, informational note.", variant="info"),
        alert("Saved successfully.", variant="success"),
        alert("Heads up — check your input.", variant="warning"),
        alert("Something went wrong.", variant="danger"),
    )


def progress_demo() -> SafeHTML:
    return compose(
        progress(25, show_label=True),
        progress(50, variant="info"),
        progress(75, variant="success", size="large"),
        progress(90, variant="warning"),
    )


def dialog_demo() -> SafeHTML:
    # Uses the real dialog() helper for the outer shell -- dialog() itself has
    # no way to id its optional title heading for aria-labelledby, so the
    # heading + close button are passed as pre-rendered `content` instead of
    # via `title=`.
    close_button = button("Close", type="button", command="close", commandfor="demo-dialog")
    content = _safe(
        '<h4 id="demo-dialog-title">Settings</h4>'
        "<p>Native &lt;dialog&gt;, opened and closed entirely by the platform.</p>"
        + str(close_button)
    )
    return _safe(
        '<div class="demo-panel">'
        + str(
            button(
                "Open dialog",
                type="button",
                variant="primary",
                command="show-modal",
                commandfor="demo-dialog",
            )
        )
        + str(
            dialog(
                content,
                id="demo-dialog",
                aria_labelledby="demo-dialog-title",
            )
        )
        + "</div>"
    )


# ---------------------------------------------------------------------------
# Data display
# ---------------------------------------------------------------------------
def card_demo() -> SafeHTML:
    return card(
        header="Card header",
        body=_safe(
            "<p>Cards group related content with optional header and footer slots.</p>"
        ),
        footer=button("Action", variant="primary", size="small"),
    )


def table_demo() -> SafeHTML:
    striped = table(
        headers=["Name", "Email", "Status"],
        rows=[
            ["Ada Lovelace", "ada@example.com", "Active"],
            ["Alan Turing", "alan@example.com", "Active"],
            ["Grace Hopper", "grace@example.com", "Pending"],
        ],
        striped=True,
        hoverable=True,
        fullwidth=True,
    )
    bordered = table(
        headers=["Metric", "Value"],
        rows=[["Uptime", "99.98%"], ["Latency", "42ms"]],
        bordered=True,
    )
    return compose(striped, bordered)


# ---------------------------------------------------------------------------
# Patterns, extras & reference (bonus sections -- not tied to a single
# manifest component, so they aren't counted toward per-component coverage).
# ---------------------------------------------------------------------------
# Semantic token ramps, in the order they appear on the palette swatch grid.
# Each entry is (token-suffix, label). The `-contrast` token is deliberately
# not shown as a swatch -- it is the *text* color for its family, so it is
# demonstrated by the readable label sitting on each base swatch instead.
PALETTE_FAMILIES: list[tuple[str, str]] = [
    ("primary", "Primary"),
    ("info", "Info"),
    ("success", "Success"),
    ("warning", "Warning"),
    ("danger", "Danger"),
]
PALETTE_STEPS: list[tuple[str, str]] = [
    ("subtle", "subtle"),
    ("", "base"),
    ("strong", "strong"),
]
PALETTE_NEUTRALS: list[tuple[str, str]] = [
    ("surface", "surface"),
    ("surface-raised", "surface-raised"),
    ("surface-muted", "surface-muted"),
    ("surface-subtle", "surface-subtle"),
    ("border", "border"),
    ("border-strong", "border-strong"),
    ("text-muted", "text-muted"),
    ("text", "text"),
    ("text-strong", "text-strong"),
]


def _palette_token_names() -> list[str]:
    """Every `--ui-color-*` token the swatch grid renders, in render order."""
    names: list[str] = []
    for family, _ in PALETTE_FAMILIES:
        for step, _label in PALETTE_STEPS:
            names.append(f"{family}-{step}" if step else family)
    names.extend(token for token, _ in PALETTE_NEUTRALS)
    return names


def palette_css() -> str:
    """One background rule per token.

    Generated rather than hand-written so the stylesheet cannot drift from
    ``PALETTE_FAMILIES``/``PALETTE_NEUTRALS``, and emitted as real CSS rules
    rather than ``style="background:..."`` so the page stays inline-style-free
    (the same CSP constraint that pushed ``progress()`` to native
    ``<progress>``).
    """
    rules = [
        f'.demo-swatch[data-token="{name}"] {{ background: var(--ui-color-{name}); }}'
        for name in _palette_token_names()
    ]
    return "\n".join(rules)


def palette_demo() -> SafeHTML:
    def swatch(
        token: str, label: str, *, on_color: bool = False, family: str = ""
    ) -> str:
        # Only colored swatches get an overlaid label, painted with their
        # family's `-contrast` token so it is legible on the fill.
        #
        # Neutral swatches deliberately carry no overlay. There is no
        # "contrast" token for a neutral, so the label would inherit page
        # text -- and for the `text`/`text-strong` swatches that is the
        # exact color of the fill behind it (measured 1.0:1, i.e. invisible).
        # The `<code>` token name below each swatch already identifies it, so
        # the overlay was redundant as well as unreadable.
        cls = "demo-swatch"
        inner = ""
        if on_color:
            cls += f" demo-swatch-on-{family}"
            inner = f"<span>{_esc(label)}</span>"
        return (
            f'<div class="demo-swatch-cell">'
            f'<div class="{cls}" data-token="{token}">{inner}</div>'
            f'<code class="demo-swatch-name">--ui-color-{token}</code>'
            f"</div>"
        )

    rows: list[str] = []
    for family, family_label in PALETTE_FAMILIES:
        cells = "".join(
            swatch(
                f"{family}-{step}" if step else family,
                step_label,
                on_color=step != "subtle",
                family=family,
            )
            for step, step_label in PALETTE_STEPS
        )
        rows.append(
            f'<div class="demo-swatch-row">'
            f'<p class="demo-swatch-family">{_esc(family_label)}</p>'
            f'<div class="demo-swatch-grid">{cells}</div>'
            f"</div>"
        )

    neutrals = "".join(swatch(token, label) for token, label in PALETTE_NEUTRALS)
    rows.append(
        '<div class="demo-swatch-row">'
        '<p class="demo-swatch-family">Neutrals</p>'
        f'<div class="demo-swatch-grid">{neutrals}</div>'
        "</div>"
    )
    return _safe("".join(rows))


def theme_demo() -> SafeHTML:
    return _safe(
        '<div class="ui-cluster demo-toolbar">'
        + str(button("Toggle theme", type="button", data_theme_toggle=True))
        + '<span class="ui-muted">Light / dark via semantic tokens.</span>'
        + "</div>"
    )


def rtl_demo() -> SafeHTML:
    # Renders the offset-grid, level, and table patterns inside a dir="rtl"
    # wrapper so logical-property regressions (WS-7) are visible at a glance:
    # an is-offset-4 column should push in from the *start* edge (the right,
    # in RTL) and table cell text should align to the start edge too. The
    # is-media-left/-right exception intentionally does NOT flip -- see the
    # comment in layout.css -- so it's included in the Media section above
    # as a visual contrast.
    #
    # Uses genuine Arabic content (not English text under dir="rtl") -- Latin
    # script doesn't reverse letter/word order under dir="rtl", it only flips
    # block-level layout/alignment, so English text here would demonstrate the
    # logical-property offset/alignment behavior but not what right-to-left
    # *reading* actually looks like. Real RTL-script text shows both at once.
    grid = columns(
        column(
            card(body=_safe("<strong>عمود مُزاح</strong>")), size="4", offset="4"
        ),  # "Offset column"
    )
    tbl = table(
        headers=["الاسم", "الوظيفة"],  # "Name", "Role"
        rows=[["أحمد", "مهندس"], ["فاطمة", "طبيبة"]],  # Ahmed/Engineer, Fatima/Doctor
    )
    return _safe(
        f'<div dir="rtl" class="ui-cluster demo-panel">{compose(grid, tbl)}</div>'
    )


def container_query_demo() -> SafeHTML:
    # WS-6: `.is-container` opts columns/tiles/cards into container-query
    # sizing -- they respond to the width of their own wrapper element, not
    # the viewport. Resizing the browser window won't change anything here;
    # only the two wrapper widths below (15rem vs 31rem) matter.
    #
    # Those widths are chosen to straddle both thresholds while still
    # fitting side by side, which is the entire point of the section -- a
    # stacked pair demonstrates nothing you couldn't see in one panel:
    #   * columns/tiles switch at 30rem, cards at 24rem
    #   * 15rem (240px) is below both; 31rem (496px) is above both
    #   * 15 + 31 + 0.75 gap = 46.75rem (748px), inside the ~782px the demo
    #     card body gets at the 72rem `.demo-layout` cap. The previous
    #     18rem/40rem pair needed 928px and so ALWAYS wrapped -- even at a
    #     1600px viewport -- silently defeating the comparison.
    def panel(
        width: str, label: str, wrapper_id: str, column_id: str, card_id: str
    ) -> str:
        grid = columns(
            column(
                _safe(f'<div id="{column_id}" class="ui-card">is-6-cq column</div>'),
                size="6-cq",
            ),
            class_="is-container",
        )
        tiles = _safe(
            '<div class="ui-tiles is-container">'
            + tile(_safe('<div class="ui-card">is-6 tile</div>'), size="6")
            + "</div>"
        )
        card_demo_panel = card(
            header="is-container card",
            body=_safe("Padding grows past the 24rem threshold."),
            class_="is-container",
            id=card_id,
        )
        return (
            f'<div id="{wrapper_id}" class="cq-panel" style="width:{width}">'
            f'<p class="ui-muted">{label} ({width})</p>'
            f"{compose(grid, tiles, card_demo_panel)}"
            "</div>"
        )

    return _safe(
        '<div class="cq-compare" tabindex="0">'
        + panel(
            "15rem", "Narrow wrapper", "cq-narrow", "cq-narrow-column", "cq-narrow-card"
        )
        + panel("31rem", "Wide wrapper", "cq-wide", "cq-wide-column", "cq-wide-card")
        + "</div>"
    )


def manifest_demo() -> SafeHTML:
    rows = [
        [c["name"], c["class_name"], c.get("helper", "")]
        for c in COMPONENT_MANIFEST["components"]
    ]
    return table(
        headers=["Component", "CSS class", "Helper"],
        rows=rows,
        striped=True,
        fullwidth=True,
    )


# ---------------------------------------------------------------------------
# Category registry: single source of truth for both the sidebar TOC and the
# main-content section order. Anchor ids match manifest component `name`s
# verbatim wherever a section documents exactly one manifest component, so
# coverage can be checked mechanically (see
# tests/test_demo_parity.py::test_every_manifest_component_has_a_demo_section).
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Shell, navigation lists, drawer and burger
#
# These five components build this page's own chrome, so each section below
# points at the live instance as well as showing the call.
# ---------------------------------------------------------------------------
def shell_demo() -> SafeHTML:
    """Show `shell()` as escaped source rather than a live nested instance.

    `shell()` renders its main column as a real `<main>`, and a document may
    have only one of those that is not hidden. Rendering a second live shell
    inside this page's own `<main>` would be invalid HTML and would trip axe's
    `landmark-one-main` -- so the markup is shown, and the page you are reading
    is the working example.
    """
    markup = str(
        shell(
            _safe("<p>Main column</p>"),
            aside=_safe('<nav class="ui-shell__aside"><p>Aside</p></nav>'),
            main_id="example-main",
        )
    )
    return _safe(
        '<div class="ui-stack">'
        f'<pre class="demo-code" tabindex="0"><code>{_esc(markup)}</code></pre>'
        '<p class="ui-muted">One column below 1024px; main plus a '
        "<code>--ui-shell-aside-width</code> track above it. "
        "<code>--ui-shell-max</code> defaults to <code>none</code>, so the "
        "shell is edge to edge -- cap prose with <code>ui-measure</code> "
        "rather than narrowing the shell.</p>"
        "</div>"
    )


def nav_list_demo() -> SafeHTML:
    return _safe(
        '<div class="ui-stack">'
        + str(
            nav_list(
                [("Container", "#container"), ("Hero", "#hero"), ("Tile", "#tile")],
                active="#hero",
                aria_current="location",
            )
        )
        + '<p class="ui-muted">The active item takes '
        "<code>aria-current</code>; the token is a parameter because this list "
        "cannot know whether its links change pages or only move the viewport. "
        "These are in-page anchors, so they pass <code>location</code> -- "
        "<code>page</code> would announce &quot;current page&quot; for a link "
        "that never leaves it. Unrelated to <code>dropdown()</code>, which is an "
        "absolutely positioned dropdown.</p>"
        "</div>"
    )


def nav_group_demo() -> SafeHTML:
    return _safe(
        '<div class="ui-stack">'
        + str(
            nav_groups(
                [
                    ("Layout", [("Container", "#container"), ("Hero", "#hero")]),
                    ("Forms", [("Field", "#field"), ("Input", "#input")]),
                ]
            )
        )
        + '<p class="ui-muted">Labels are <code>&lt;p&gt;</code>, not headings, '
        "so grouping a nav does not inject entries into the document outline. "
        "Any <code>class_</code> or attributes land on one outer "
        "<code>ui-nav-groups</code> wrapper -- per-group would emit the same "
        "<code>id</code> more than once. This page&#39;s table of contents is a "
        "live instance.</p>"
        "</div>"
    )


def drawer_demo() -> SafeHTML:
    """A second, independent drawer opening from the start edge.

    Deliberately carries no `data-ui-drawer-breakpoint`: that attribute is what
    makes `enhanceDrawers` auto-close a panel when the viewport crosses the
    breakpoint, which is right for the table of contents and wrong for a
    showcase the reader may be inspecting at the time.
    """
    return _safe(
        '<div class="ui-stack">'
        + str(burger(controls="demo-drawer", label="Open example drawer"))
        + str(
            drawer(
                _safe(
                    "<p><strong>Example drawer</strong></p>"
                    "<p>Click the backdrop, or press Escape.</p>"
                ),
                id="demo-drawer",
                label="Example drawer",
                side="start",
                tag="nav",
            )
        )
        + '<p class="ui-muted">Built on the Popover API, so light dismiss, '
        "Escape, top-layer stacking and focus return to the button are the "
        "browser&#39;s job -- no JavaScript. Opens from the start edge so it "
        "does not land on top of the table of contents.</p>"
        "</div>"
    )


def burger_demo() -> SafeHTML:
    return _safe(
        '<div class="ui-stack">'
        + str(burger(controls="demo-drawer"))
        + '<p class="ui-muted">Targets the same panel as the '
        '<a href="#drawer">drawer</a> section above. The accessible name is '
        "a visually hidden <code>&lt;span&gt;</code> rather than "
        "<code>aria-label</code>, so the control keeps a name if the stylesheet "
        "fails to load. The bars cross via "
        "<code>:has(.ui-drawer:popover-open)</code>: a popover invoker&#39;s "
        "expanded state is implicit ARIA and never a DOM attribute, so CSS "
        "cannot select on it. One consequence is visible here -- "
        "<code>:has()</code> cannot bind a burger to one specific drawer, so "
        "opening either panel crosses every burger on the page.</p>"
        "</div>"
    )


def build_categories() -> list[
    tuple[str, str, list[tuple[str, str, str | None, SafeHTML]]]
]:
    return [
        (
            "layout",
            "Layout",
            [
                (
                    "shell",
                    "Shell",
                    "The page grid: a full-bleed main column plus an optional "
                    "aside that becomes a sticky column above 1024px. This "
                    "page is a live instance.",
                    shell_demo(),
                ),
                (
                    "container",
                    "Container",
                    "Each variant caps at a different width (1200px, none, "
                    "1344px, none), so the four only diverge once this column "
                    "is wider than the cap -- on a narrow display they render "
                    "identically.",
                    container_demo(),
                ),
                (
                    "section",
                    "Section",
                    "Vertical spacing container -- default/medium/large padding.",
                    section_demo(),
                ),
                (
                    "hero",
                    "Hero",
                    "The banner at the top of this page is a live is-primary "
                    "hero; here are the remaining color and size variants.",
                    hero_demo(),
                ),
                (
                    "title",
                    "Title",
                    "Typography title element, sizes 1 (largest) through 6 (smallest).",
                    title_demo(),
                ),
                (
                    "media",
                    "Media",
                    "Image + text media object, image on the start or end side.",
                    media_demo(),
                ),
                (
                    "tile",
                    "Tile",
                    "Hierarchical ancestor/parent/child tiling for complex "
                    "nested layouts.",
                    tile_demo(),
                ),
                (
                    "footer",
                    "Footer",
                    "Page footer with centered content.",
                    footer_demo(),
                ),
                (
                    "level",
                    "Level",
                    "Horizontal layout with left/right slots -- often used as "
                    "a toolbar.",
                    level_demo(),
                ),
                ("columns", "Columns", "12-column responsive grid.", columns_demo()),
                (
                    "column",
                    "Column",
                    "Individual column modifiers: fixed size + offset, and "
                    "narrow (content-sized).",
                    column_demo(),
                ),
            ],
        ),
        (
            "navigation",
            "Navigation",
            [
                (
                    "navbar",
                    "Navbar",
                    "Navigation bar with brand, start/end slots, and color variants.",
                    navbar_demo(),
                ),
                (
                    "breadcrumb",
                    "Breadcrumb",
                    "Navigation trail with the current page marked non-interactive.",
                    breadcrumb_demo(),
                ),
                (
                    "pagination",
                    "Pagination",
                    "Pagination links with a sibling window and ellipses.",
                    pagination_demo(),
                ),
                (
                    "dropdown",
                    "Dropdown",
                    "Disclosure dropdown; arrow keys navigate, Escape closes and "
                    "restores focus.",
                    dropdown_demo(),
                ),
                (
                    "nav_list",
                    "Nav list",
                    "Vertical navigation for sidebars and drawers -- not to be "
                    "confused with the dropdown above.",
                    nav_list_demo(),
                ),
                (
                    "nav_groups",
                    "Nav group",
                    "Labelled groups of nav links, as used by this page's own "
                    "table of contents.",
                    nav_group_demo(),
                ),
                (
                    "drawer",
                    "Drawer",
                    "An off-canvas panel on the Popover API: light dismiss, "
                    "Escape and focus return come from the browser, with no "
                    "JavaScript.",
                    drawer_demo(),
                ),
                (
                    "burger",
                    "Burger",
                    "The button that opens a drawer, and the only thing needed "
                    "to toggle one.",
                    burger_demo(),
                ),
                (
                    "tabs",
                    "Tabs",
                    "Keyboard-accessible tablist; state stays server-owned, "
                    "switching is progressive enhancement.",
                    tabs_demo(),
                ),
            ],
        ),
        (
            "forms",
            "Forms",
            [
                (
                    "field",
                    "Field",
                    "Label, help text, and control grouping.",
                    field_demo(),
                ),
                (
                    "input",
                    "Input",
                    "Native text-like input styling across a few input types.",
                    input_demo(),
                ),
                ("select", "Select", "Native select styling.", select_demo()),
                (
                    "checkbox",
                    "Checkbox",
                    "Checkbox label and control grouping.",
                    checkbox_demo(),
                ),
                (
                    "switch",
                    "Switch",
                    "Accessible toggle switch presentation.",
                    switch_demo(),
                ),
                (
                    "validation_summary",
                    "Validation Summary",
                    "Aggregated form-error summary linking to individual fields.",
                    validation_summary_demo(),
                ),
            ],
        ),
        (
            "feedback",
            "Feedback & actions",
            [
                (
                    "button",
                    "Button",
                    "Variants, sizes, and link buttons.",
                    button_demo(),
                ),
                (
                    "alert",
                    "Alert",
                    "Inline notices and status messaging.",
                    alert_demo(),
                ),
                (
                    "progress",
                    "Progress",
                    "Native <progress> elements -- CSP-safe, no inline styles.",
                    progress_demo(),
                ),
                (
                    "dialog",
                    "Dialog",
                    "Native <dialog>, opened and closed by command/commandfor with no JavaScript.",
                    dialog_demo(),
                ),
            ],
        ),
        (
            "data",
            "Data display",
            [
                (
                    "card",
                    "Card",
                    "Content container with optional header/body/footer slots.",
                    card_demo(),
                ),
                (
                    "table",
                    "Table",
                    "Styled table with optional striping, hover, and borders.",
                    table_demo(),
                ),
            ],
        ),
        (
            "extras",
            "Patterns & extras",
            [
                (
                    "palette",
                    "Color palette",
                    "Every semantic --ui-color-* token, rendered live. Values "
                    "track Tailwind v3's palette; the labels sit on each fill "
                    "using that family's -contrast token, so anything hard to "
                    "read here is a real contrast bug. Toggle the theme to "
                    "see the dark ramp.",
                    palette_demo(),
                ),
                (
                    "theme",
                    "Theme",
                    "Toggles the data-theme attribute on the document root; "
                    "components restyle via semantic tokens.",
                    theme_demo(),
                ),
                (
                    "forms-in-practice",
                    "Complete form example",
                    "Fields auto-wire labels, help, and aria-invalid; a "
                    "validation summary links to the erroring field.",
                    forms_in_practice_demo(),
                ),
                (
                    "rtl",
                    'RTL layout (dir="rtl")',
                    "Offsets and table text-alignment should flip to the "
                    "start edge; the media-left/-right position stays fixed "
                    "(see layout.css).",
                    rtl_demo(),
                ),
                (
                    "container-queries",
                    "Container queries (is-container)",
                    "Two fixed-width wrappers, same viewport: columns, tiles, "
                    "and cards resize based on their own container's width, "
                    "not the browser window.",
                    container_query_demo(),
                ),
            ],
        ),
        (
            "reference",
            "Reference",
            [
                (
                    "manifest",
                    "Component manifest",
                    "Rendered from manifest.json -- the single source of truth.",
                    manifest_demo(),
                ),
            ],
        ),
    ]


def build_sidebar(
    categories: list[tuple[str, str, list[tuple[str, str, str | None, SafeHTML]]]],
) -> SafeHTML:
    """Render the section navigation as a drawer that doubles as the sticky column.

    One element, one id, both roles -- see ``.ui-shell__aside[popover]`` in
    layout.css. Duplicating the nav for desktop and mobile would break the
    stable-id contract htmx swapping depends on, and would put two navigation
    landmarks with the same accessible name in the page.
    """
    groups = [
        (label, [(heading, f"#{anchor}") for anchor, heading, _lead, _body in items])
        for _cat_id, label, items in categories
    ]
    # No `active=` is passed, so no `aria-current` is emitted at all. If this
    # ever marks a current section, it must pass `aria_current="location"`:
    # these hrefs are fragments that only move the viewport, and both the
    # default `"true"` and a `"page"` token would announce something less
    # accurate than what the link does.
    return drawer(
        nav_groups(groups),
        id="site-nav",
        label="Component sections",
        tag="nav",
        class_="ui-shell__aside",
        # Read by `enhanceDrawers`, which closes the panel when the viewport
        # crosses this width. It must match the `min-width: 1024px` query in
        # layout.css that turns this same element into the in-flow column.
        data_ui_drawer_breakpoint="1024",
    )


def build_content(
    categories: list[tuple[str, str, list[tuple[str, str, str | None, SafeHTML]]]],
) -> str:
    parts: list[str] = []
    for cat_id, label, items in categories:
        parts.append(
            f'<h2 id="cat-{cat_id}" class="demo-category-title">{_esc(label)}</h2>'
        )
        for anchor, heading, lead, body in items:
            parts.append(str(demo_section(anchor, heading, body, lead=lead)))
    return "".join(parts)


def render_page() -> str:
    categories = build_categories()
    sidebar = build_sidebar(categories)
    content = build_content(categories)
    # heading_level=1: this hero is the page banner, so its title is the
    # document's h1. The eight heroes inside the Hero showcase section below
    # (six colors + two sizes, see `hero_demo`) deliberately stay <p> -- they
    # are samples of a component, not sections of this document, and promoting
    # them would put eight more h1s in the outline.
    #
    # `id="top"` because this element is now the top of the page: it is a
    # direct child of <body>, above the shell, so the navbar brand's `#top`
    # lands on it. Placing it there is load-bearing beyond looks -- layout.css
    # declares the navbar reveal's view timeline on `body > .ui-hero`
    # specifically, and a named view timeline declared by more than one
    # element resolves to an inactive timeline. Those eight showcase heroes
    # are `.ui-hero` too, so nesting this one inside <main> would leave
    # `body > .ui-hero` matching nothing and silently disable the reveal.
    page_hero = hero(
        "FastBlocks UI",
        subtitle="HTML/CSS-first components, semantic tokens, htmx-safe "
        "fragments, and optional enhancement JavaScript.",
        variant="primary",
        heading_level=1,
        id="top",
        # Moving the hero out of <main> put the document's h1 outside every
        # landmark, which axe's `region` rule flags (measured: one violation
        # on `#top`, gone once this role is present). `<header>` would be the
        # usual fix, but wrapping the hero would stop `body > .ui-hero` from
        # matching and take the reveal with it. `role="banner"` names the
        # element it is already on: a unique, top-level banner carrying the
        # site title.
        role="banner",
    )
    page_bar = navbar(
        brand="FastBlocks UI",
        brand_url="#top",
        end=SafeHTML(
            str(button("Theme", type="button", data_theme_toggle=True))
            + str(burger(controls="site-nav", class_="is-shell-toggle"))
        ),
        # Distinct from the drawer nav's "Component sections": two navigation
        # landmarks sharing one accessible name are ambiguous to landmark
        # navigation and fail axe's `landmark-unique`.
        label="site navigation",
        class_="is-sticky",
    )
    shell_markup = shell(
        SafeHTML(content),
        aside=sidebar,
        main_id="demo-content",
    )

    css = CSS.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    # `querySelectorAll`, not `querySelector`: the page now carries two
    # `[data-theme-toggle]` buttons -- one in the sticky navbar and the one
    # the Theme section exists to demonstrate. Binding only the first match
    # would leave the demonstrated button inert.
    toggle_js = (
        "const root=document.documentElement;"
        "document.querySelectorAll('[data-theme-toggle]').forEach((el)=>{"
        "el.addEventListener('click',()=>{"
        "root.setAttribute('data-theme',"
        "root.getAttribute('data-theme')==='dark'?'light':'dark');});"
        "});"
    )
    action_js = (
        "let demoActionCount=0;"
        "document.getElementById('demo-action-button')?.addEventListener('click',()=>{"
        "demoActionCount+=1;"
        "const status=document.getElementById('demo-action-status');"
        "if(status){status.textContent=`Action clicked ${demoActionCount} "
        "time${demoActionCount===1?'':'s'}.`;}"
        "});"
    )
    # There is deliberately no nav-toggle script here. The drawer is a
    # `[popover]` and `.ui-burger` its `popovertarget`, so open/close, light
    # dismiss, Escape and focus return are the browser's job; `enhance.js`
    # supplies only the one thing the Popover API cannot express, closing the
    # panel when the viewport crosses `data-ui-drawer-breakpoint`.

    return f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FastBlocks UI — Demo</title>
<style>
{css}
{DEMO_CSS}
{palette_css()}
</style>
</head>
<body>
<a class="demo-skip-link" href="#demo-content">Skip to content</a>
<a class="demo-skip-link" data-demo-skip="nav" href="#site-nav">Skip to section navigation</a>
{page_bar}
{page_hero}
{shell_markup}
<script type="module">
{js}
</script>
<script type="module">{toggle_js}</script>
<script type="module">{action_js}</script>
</body>
</html>
"""


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Build the FastBlocks UI demo page.")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Exit non-zero if the committed demo/index.html differs from a fresh build.",
    )
    args = parser.parse_args()

    rendered = render_page()

    if args.check:
        import sys

        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != rendered:
            print(
                "demo/index.html is out of date. Run: python scripts/build_demo.py",
                file=sys.stderr,
            )
            raise SystemExit(1)
        print("demo/index.html is up to date.")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(rendered, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
