"""Generate a self-contained FastBlocks UI demo page.

The page is rendered *through* the Python helpers (so it always reflects real helper
output and doubles as an integration smoke test), with the CSS bundle and the
``enhance.js`` behavior layer inlined so the result is a single file you can open
directly in a browser — no server required.

Usage:
    python scripts/build_demo.py        # writes demo/index.html
"""

from __future__ import annotations

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
    field,
    hero,
    level,
    pagination,
    progress,
    switch,
    table,
    tabs,
)
from fastblocks_ui import input as ui_input
from fastblocks_ui import select as ui_select
from fastblocks_ui.helpers import SafeHTML, _safe

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "fastblocks_ui" / "static" / "css" / "fastblocks-ui.css"
JS = ROOT / "fastblocks_ui" / "static" / "js" / "enhance.js"
OUT = ROOT / "demo" / "index.html"


def demo_section(heading: str, body: object, *, lead: str | None = None) -> SafeHTML:
    """Wrap a showcase block in a titled card."""
    lead_html = f'<p class="ui-muted">{lead}</p>' if lead else ""
    return card(
        header=heading,
        body=_safe(f'{lead_html}<div class="ui-stack">{body}</div>'),
        class_="demo-section",
    )


def buttons_demo() -> SafeHTML:
    row = compose(
        button("Default"),
        button("Primary", variant="primary"),
        button("Success", variant="success"),
        button("Warning", variant="warning"),
        button("Danger", variant="danger"),
        button("Link button", href="#", variant="primary"),
        button("Disabled", variant="primary", disabled=True),
        separator=" ",
    )
    return _safe(f'<div class="ui-cluster">{row}</div>')


def alerts_demo() -> SafeHTML:
    return compose(
        alert("A neutral, informational note.", variant="info"),
        alert("Saved successfully.", variant="success"),
        alert("Heads up — check your input.", variant="warning"),
        alert("Something went wrong.", variant="danger"),
    )


def form_demo() -> SafeHTML:
    return _safe(
        '<form class="ui-stack" onsubmit="return false">'
        + field(
            label="Email address",
            help_text="We'll never share it.",
            control_html=ui_input(
                id="demo-email", type="email", value="ada@example.com"
            ),
            control_id="demo-email",
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
            help_text="Shown on your profile.",
            error_text="Display name must be at least 3 characters.",
            control_html=ui_input(id="demo-name", value="Ad"),
            control_id="demo-name",
        )
        + checkbox(label="Remember me", checked=True)
        + switch(label="Enable notifications", checked=True)
        + f'<div class="ui-cluster">{button("Save", variant="primary", type="submit")}</div>'
        + "</form>"
    )


def progress_demo() -> SafeHTML:
    return compose(
        progress(25, show_label=True),
        progress(50, variant="info"),
        progress(75, variant="success", size="large"),
        progress(90, variant="warning"),
    )


def table_demo() -> SafeHTML:
    return table(
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


def tabs_demo() -> SafeHTML:
    return tabs(
        [
            ("overview", "Overview", "<p>Server-rendered tab content, htmx-friendly.</p>"),
            ("details", "Details", "<p>Switching is progressive-enhancement only.</p>"),
            ("activity", "Activity", "<p>State stays on the server.</p>"),
        ],
        active_id="overview",
    )


def dialog_demo() -> SafeHTML:
    return _safe(
        '<div class="demo-panel">'
        + button(
            "Open dialog",
            type="button",
            variant="primary",
            data_ui_dialog_trigger=True,
            aria_controls="demo-dialog",
            aria_expanded="false",
        )
        + '<dialog id="demo-dialog" class="ui-dialog" data-ui-dialog aria-hidden="true" '
        'aria-labelledby="demo-dialog-title">'
        '<div class="ui-dialog__surface">'
        '<h2 id="demo-dialog-title">Settings</h2>'
        "<p>Native &lt;dialog&gt; with enhancement-only behavior.</p>"
        + button("Close", type="button", data_ui_dialog_close=True)
        + "</div></dialog></div>"
    )


def menu_demo() -> SafeHTML:
    return _safe(
        '<div class="demo-panel">'
        + button(
            "Toggle menu",
            type="button",
            data_ui_menu_trigger=True,
            aria_controls="demo-menu",
            aria_expanded="false",
        )
        + '<nav id="demo-menu" class="ui-menu" data-ui-menu hidden aria-label="Demo menu">'
        '<a class="ui-menu__item" href="#">Profile</a>'
        '<a class="ui-menu__item" href="#">Settings</a>'
        '<a class="ui-menu__item" href="#">Sign out</a>'
        "</nav>"
        '<p class="ui-muted">Arrow keys navigate; Escape closes and restores focus.</p>'
        "</div>"
    )


def layout_demo() -> SafeHTML:
    grid = columns(
        column(card(body=_safe("<strong>8 cols</strong><p>Main content area.</p>")), size="8"),
        column(card(body=_safe("<strong>4 cols</strong><p>Sidebar.</p>")), size="4"),
    )
    lvl = level(
        left=_safe("<strong>Toolbar</strong>"),
        right=button("Action", variant="primary"),
    )
    return compose(grid, lvl)


def pagination_demo() -> SafeHTML:
    return pagination(5, 12, url_pattern="#page-{page}", siblings=1)


def breadcrumb_demo() -> SafeHTML:
    return breadcrumb([("Home", "#"), ("Components", "#"), ("Pagination", None)])


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


def render_page() -> str:
    main = compose(
        hero(
            "FastBlocks UI",
            subtitle="HTML/CSS-first components for server-rendered Python apps.",
            variant="primary",
        ),
        _safe(
            '<div class="ui-cluster demo-toolbar">'
            + button("Toggle theme", type="button", data_theme_toggle=True)
            + '<span class="ui-muted">Light / dark via semantic tokens.</span>'
            + "</div>"
        ),
        demo_section("Buttons", buttons_demo(), lead="Variants and link buttons."),
        demo_section("Alerts", alerts_demo()),
        demo_section("Forms & validation", form_demo(),
                     lead="Fields auto-wire labels, help, and aria-invalid."),
        demo_section("Progress", progress_demo(),
                     lead="Native <progress> elements — CSP-safe, no inline styles."),
        demo_section("Table", table_demo()),
        demo_section("Tabs", tabs_demo(), lead="Keyboard accessible, progressive."),
        demo_section("Dialog", dialog_demo()),
        demo_section("Menu", menu_demo()),
        demo_section("Layout", layout_demo(), lead="12-column grid and level toolbar."),
        demo_section("Breadcrumb & pagination",
                     compose(breadcrumb_demo(), pagination_demo())),
        demo_section("Component manifest", manifest_demo(),
                     lead="Rendered from manifest.json — the single source of truth."),
    )

    css = CSS.read_text(encoding="utf-8")
    js = JS.read_text(encoding="utf-8")
    toggle_js = (
        "const root=document.documentElement;"
        "document.querySelector('[data-theme-toggle]')?.addEventListener('click',()=>{"
        "root.setAttribute('data-theme',"
        "root.getAttribute('data-theme')==='dark'?'light':'dark');});"
    )

    return f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FastBlocks UI — Demo</title>
<style>
{css}
.demo-main {{ max-width: 60rem; margin-inline: auto; padding: var(--ui-space-6) var(--ui-space-4); display: grid; gap: var(--ui-space-6); }}
.demo-section {{ scroll-margin-top: var(--ui-space-6); }}
.demo-toolbar {{ justify-content: space-between; }}
.demo-panel {{ display: grid; gap: var(--ui-space-3); }}
</style>
</head>
<body>
<main class="demo-main">
{main}
</main>
<script type="module">
{js}
</script>
<script type="module">{toggle_js}</script>
</body>
</html>
"""


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(render_page(), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
