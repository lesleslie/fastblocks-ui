"""Generate a self-contained FastBlocks UI demo page.

The page is rendered *through* the Python helpers (so it always reflects real helper
output and doubles as an integration smoke test), with the CSS bundle and the
``enhance.js`` behavior layer inlined so the result is a single file you can open
directly in a browser -- no server required.

The page is a full component showcase: every component in
``fastblocks_ui/manifest.json`` gets its own anchored section (grouped into
categories), linked from a collapsible sidebar table of contents. See
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
    button,
    card,
    checkbox,
    column,
    columns,
    compose,
    container,
    dialog,
    field,
    footer,
    hero,
    level,
    media,
    menu,
    navbar,
    pagination,
    progress,
    section,
    switch,
    table,
    tabs,
    tile,
    title,
    validation_summary,
)
from fastblocks_ui import input as ui_input
from fastblocks_ui import select as ui_select
from fastblocks_ui.helpers import SafeHTML, _safe

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
.demo-topbar {
  display: flex;
  justify-content: flex-end;
  padding: var(--ui-space-3) var(--ui-space-4) 0;
}
.demo-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ui-space-6);
  max-width: 72rem;
  margin-inline: auto;
  padding: var(--ui-space-4) var(--ui-space-4) var(--ui-space-6);
  align-items: start;
}
.demo-sidebar {
  display: none;
  border: var(--ui-border-width) solid var(--ui-color-border);
  border-radius: var(--ui-radius-lg);
  padding: var(--ui-space-4);
  background: var(--ui-color-surface-raised);
}
.demo-sidebar.is-active {
  display: block;
}
.demo-sidebar-title {
  display: block;
  font-weight: 600;
  color: var(--ui-color-text-strong);
  text-decoration: none;
  margin-bottom: var(--ui-space-4);
}
.demo-sidebar-group + .demo-sidebar-group {
  margin-top: var(--ui-space-4);
}
.demo-sidebar-heading {
  font-weight: 600;
  font-size: 0.8125rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ui-color-text-muted);
  margin: 0 0 var(--ui-space-2);
}
.demo-sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--ui-space-1);
}
.demo-sidebar-list a {
  display: block;
  padding: 0.25rem 0.5rem;
  border-radius: var(--ui-radius-sm);
  color: var(--ui-color-text);
  text-decoration: none;
}
.demo-sidebar-list a:hover,
.demo-sidebar-list a:focus-visible {
  background: var(--ui-color-surface-muted);
  color: var(--ui-color-text-strong);
}
.demo-content {
  min-width: 0;
  display: grid;
  /* `minmax(0, 1fr)`, not the implicit `auto`. An auto-sized grid track
     floors at the widest item's *min-content* width, and that floor is
     then applied to every sibling -- so one un-shrinkable component (the
     pagination row, historically ~419px) stretched all 32 sections past
     the viewport. `min-width: 0` above only frees this element inside its
     own parent; it says nothing about how this grid sizes its children. */
  grid-template-columns: minmax(0, 1fr);
  gap: var(--ui-space-6);
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
  scroll-margin-top: var(--ui-space-6);
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
/* Container-query comparison. The panels' fixed widths ARE the demo, so
   they must not shrink -- but a 31rem panel cannot fit a 375px phone, and
   left alone it widens every ancestor and overflows the page by ~2x.
   `max-width: 100%` doesn't help: it resolves against a parent that was
   itself stretched by this very child, so the constraint is circular.

   Same answer as `.ui-table-container`: give the pair its own scroll
   container. The panels keep their real widths, the overflow is contained
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

@media (min-width: 769px) {
  .demo-topbar {
    display: none;
  }
  .demo-layout {
    grid-template-columns: 16rem 1fr;
    padding-top: var(--ui-space-6);
  }
  .demo-sidebar {
    display: block;
    position: sticky;
    top: var(--ui-space-4);
    max-height: calc(100vh - var(--ui-space-8));
    overflow-y: auto;
  }
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
    def box(label: str, **kwargs: object) -> str:
        return _bordered(
            str(
                container(
                    _safe(f"<code>{label}</code>"),
                    **kwargs,
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
    def box(label: str, **kwargs: object) -> str:
        return _bordered(str(section(_safe(f"<code>{label}</code>"), **kwargs)))

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
            hero(v.capitalize(), subtitle=f"is-{v} hero variant.", variant=v, size="small")
            for v in ("info", "success", "warning", "danger", "light", "dark")
        )
    )
    sizes = compose(
        hero("Medium hero", subtitle="is-medium size.", variant="primary", size="medium"),
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
            card(body=_safe("<strong>8 cols</strong><p>Main content area.</p>")), size="8"
        ),
        column(card(body=_safe("<strong>4 cols</strong><p>Sidebar.</p>")), size="4"),
    )


def column_demo() -> SafeHTML:
    offsets = columns(
        column(card(body=_safe('<code>size="4"</code>')), size="4"),
        column(card(body=_safe('<code>size="4" offset="4"</code>')), size="4", offset="4"),
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
    default_variant = navbar(
        "FastBlocks UI",
        brand_url="#",
        start=[("Docs", "#"), ("Components", "#")],
        end=button("Sign in", href="#", variant="primary", size="small"),
    )
    dark_variant = navbar(
        "Brand",
        brand_url="#",
        items=[("Home", "#"), ("About", "#"), ("Contact", "#")],
        variant="dark",
    )
    return compose(default_variant, dark_variant)


def breadcrumb_demo() -> SafeHTML:
    return breadcrumb([("Home", "#"), ("Components", "#"), ("Pagination", None)])


def pagination_demo() -> SafeHTML:
    return pagination(5, 12, url_pattern="#page-{page}", siblings=1)


def menu_demo() -> SafeHTML:
    return _safe(
        '<div class="demo-panel">'
        + str(
            button(
                "Toggle menu",
                type="button",
                data_ui_menu_trigger=True,
                aria_controls="demo-menu",
                aria_expanded="false",
            )
        )
        + str(
            menu(
                [("Profile", "#"), ("Settings", "#"), ("Sign out", "#")],
                label="Demo menu",
                id="demo-menu",
                hidden=True,
            )
        )
        + '<p class="ui-muted">Arrow keys navigate; Escape closes and restores focus.</p>'
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
        f'<div class="ui-cluster">{variants}</div>'
        f'<div class="ui-cluster">{sizes}</div>'
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
    close_button = button("Close", type="button", data_ui_dialog_close=True)
    content = _safe(
        '<h4 id="demo-dialog-title">Settings</h4>'
        "<p>Native &lt;dialog&gt; with enhancement-only behavior.</p>"
        + str(close_button)
    )
    return _safe(
        '<div class="demo-panel">'
        + str(
            button(
                "Open dialog",
                type="button",
                variant="primary",
                data_ui_dialog_trigger=True,
                aria_controls="demo-dialog",
                aria_expanded="false",
            )
        )
        + str(
            dialog(
                content,
                id="demo-dialog",
                data_ui_dialog=True,
                aria_hidden="true",
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
    return _safe(f'<div dir="rtl" class="ui-cluster demo-panel">{compose(grid, tbl)}</div>')


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
    def panel(width: str, label: str, wrapper_id: str, column_id: str, card_id: str) -> str:
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
        '<div class="cq-compare">'
        + panel("15rem", "Narrow wrapper", "cq-narrow", "cq-narrow-column", "cq-narrow-card")
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
def build_categories() -> list[tuple[str, str, list[tuple[str, str, str | None, SafeHTML]]]]:
    return [
        (
            "layout",
            "Layout",
            [
                (
                    "container",
                    "Container",
                    "A container's max-width only matters at full page width, "
                    "wider than this demo column -- default/fluid/widescreen/"
                    "fullhd render identically here but differ in a real page.",
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
                    "Typography title element, sizes 1 (largest) through 6 "
                    "(smallest).",
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
                ("footer", "Footer", "Page footer with centered content.", footer_demo()),
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
                    "Navigation bar with brand, start/end slots, and color "
                    "variants.",
                    navbar_demo(),
                ),
                (
                    "breadcrumb",
                    "Breadcrumb",
                    "Navigation trail with the current page marked "
                    "non-interactive.",
                    breadcrumb_demo(),
                ),
                (
                    "pagination",
                    "Pagination",
                    "Pagination links with a sibling window and ellipses.",
                    pagination_demo(),
                ),
                (
                    "menu",
                    "Menu",
                    "Disclosure menu; arrow keys navigate, Escape closes and "
                    "restores focus.",
                    menu_demo(),
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
                ("field", "Field", "Label, help text, and control grouping.", field_demo()),
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
                    "Aggregated form-error summary linking to individual "
                    "fields.",
                    validation_summary_demo(),
                ),
            ],
        ),
        (
            "feedback",
            "Feedback & actions",
            [
                ("button", "Button", "Variants, sizes, and link buttons.", button_demo()),
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
                    "Native <dialog> with enhancement-only open/close "
                    "behavior.",
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
                    "Content container with optional header/body/footer "
                    "slots.",
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
                    "Rendered from manifest.json -- the single source of "
                    "truth.",
                    manifest_demo(),
                ),
            ],
        ),
    ]


def build_sidebar(
    categories: list[tuple[str, str, list[tuple[str, str, str | None, SafeHTML]]]],
) -> SafeHTML:
    groups: list[str] = []
    for _cat_id, label, items in categories:
        links = "".join(
            f'<li><a href="#{anchor}">{_esc(heading)}</a></li>'
            for anchor, heading, _lead, _body in items
        )
        groups.append(
            '<div class="demo-sidebar-group">'
            f'<p class="demo-sidebar-heading">{_esc(label)}</p>'
            f'<ul class="demo-sidebar-list">{links}</ul>'
            "</div>"
        )
    return _safe(
        '<nav class="demo-sidebar" id="demo-sidebar" aria-label="Component sections">'
        '<a class="demo-sidebar-title" href="#top">FastBlocks UI</a>'
        f'<div class="demo-sidebar-groups">{"".join(groups)}</div>'
        "</nav>"
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
    page_hero = hero(
        "FastBlocks UI",
        subtitle="HTML/CSS-first components, semantic tokens, htmx-safe "
        "fragments, and optional enhancement JavaScript.",
        variant="primary",
    )

    css = CSS.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    toggle_js = (
        "const root=document.documentElement;"
        "document.querySelector('[data-theme-toggle]')?.addEventListener('click',()=>{"
        "root.setAttribute('data-theme',"
        "root.getAttribute('data-theme')==='dark'?'light':'dark');});"
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
    nav_js = (
        "const navTrigger=document.querySelector('[data-demo-nav-trigger]');"
        "const sidebar=document.getElementById('demo-sidebar');"
        "function closeDemoNav(){"
        "sidebar?.classList.remove('is-active');"
        "navTrigger?.setAttribute('aria-expanded','false');"
        "}"
        "navTrigger?.addEventListener('click',()=>{"
        "const open=sidebar?.classList.toggle('is-active');"
        "navTrigger.setAttribute('aria-expanded',String(Boolean(open)));"
        "});"
        "sidebar?.addEventListener('click',(event)=>{"
        "if(event.target.closest('a')&&window.matchMedia('(max-width: 768px)').matches){"
        "closeDemoNav();"
        "}"
        "});"
        "document.addEventListener('keydown',(event)=>{"
        "if(event.key==='Escape'&&sidebar?.classList.contains('is-active')){"
        "closeDemoNav();navTrigger?.focus();"
        "}"
        "});"
    )

    return f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FastBlocks UI — Demo</title>
<style>
{css}
{DEMO_CSS}
</style>
</head>
<body>
<a class="demo-skip-link" href="#demo-content">Skip to content</a>
<div class="demo-topbar">
<button type="button" class="ui-button" data-demo-nav-trigger aria-controls="demo-sidebar" aria-expanded="false">Menu</button>
</div>
<div class="demo-layout" id="top">
{sidebar}
<main class="demo-content" id="demo-content">
{page_hero}
{content}
</main>
</div>
<script type="module">
{js}
</script>
<script type="module">{toggle_js}</script>
<script type="module">{action_js}</script>
<script type="module">{nav_js}</script>
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
