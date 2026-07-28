"""Drift detection between the hand-written and generated demo pages.

``demo/demo.html`` is hand-written and lives independently of ``scripts/build_demo.py``
(which renders ``demo/index.html`` *through* the real helpers). Both pages demo the same
components. This module calls the real ``fastblocks_ui`` helpers directly, with the same
inputs used in both demo files, and asserts the exact output string appears verbatim in
``demo/demo.html``.

If a helper's markup shape ever changes -- an id scheme, an attribute, escaping behavior
-- this fails immediately, rather than the two demo pages silently drifting apart with
nobody noticing until a Playwright selector mysteriously stops matching.
"""

from __future__ import annotations

import re
import unittest
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
from fastblocks_ui.helpers import Size, _safe

ROOT = Path(__file__).resolve().parents[1]
DEMO_HTML = (ROOT / "demo" / "demo.html").read_text(encoding="utf-8")


def _bordered(html: object) -> str:
    """Mirrors _bordered() in scripts/build_demo.py."""
    return f'<div class="demo-bordered">{html}</div>'


def _cq_panel(
    width: str, label: str, wrapper_id: str, column_id: str, card_id: str
) -> str:
    """Mirrors panel() in scripts/build_demo.py's container_query_demo()."""
    grid = columns(
        column(
            _safe(f'<div id="{column_id}" class="ui-card">is-6-cq column</div>'),
            size="6-cq",
        ),
        class_="is-container",
    )
    tiles = _safe(
        '<div class="ui-tiles is-container">'
        + str(tile(_safe('<div class="ui-card">is-6 tile</div>'), size="6"))
        + "</div>"
    )
    card_demo = card(
        header="is-container card",
        body=_safe("Padding grows past the 24rem threshold."),
        class_="is-container",
        id=card_id,
    )
    # The dashed border and padding moved out of this inline style and into a
    # `.cq-panel` rule in DEMO_CSS, which also adds `max-width: 100%` so the
    # fixed-width panels can shrink on a phone instead of forcing page overflow.
    return (
        f'<div id="{wrapper_id}" class="cq-panel" style="width:{width}">'
        f'<p class="ui-muted">{label} ({width})</p>'
        f"{grid}{tiles}{card_demo}</div>"
    )


class TestDemoParity(unittest.TestCase):
    """Each test asserts real helper output for demo/demo.html's documented inputs
    appears verbatim in the file -- see the HTML comments in demo/demo.html directly
    above each fragment for the exact call being mirrored here."""

    def assertFragmentInDemo(self, fragment: str) -> None:  # noqa: N802
        self.assertIn(
            fragment,
            DEMO_HTML,
            "demo/demo.html has drifted from real helper output -- either a helper's "
            "markup changed and demo/demo.html needs updating, or demo/demo.html was "
            "hand-edited without checking against the real helper. Fragment:\n"
            + fragment,
        )

    def test_hero(self) -> None:
        # heading_level=1 -- this is the page banner, so its title is the
        # document's h1. The variant/size heroes in test_hero_variants stay
        # <p>: they are component samples, not document sections.
        html = str(
            hero(
                "FastBlocks UI",
                subtitle="HTML/CSS-first components, semantic tokens, htmx-safe "
                "fragments, and optional enhancement JavaScript.",
                variant="primary",
                heading_level=1,
            )
        )
        self.assertFragmentInDemo(html)

    def test_container(self) -> None:
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

        self.assertFragmentInDemo(box("Default container -- max-width 1200px."))
        self.assertFragmentInDemo(
            box("is-fluid container -- no max-width, always full width.", fluid=True)
        )
        self.assertFragmentInDemo(
            box("is-widescreen container -- max-width 1344px.", widescreen=True)
        )
        self.assertFragmentInDemo(
            box(
                "is-fullhd container -- no max-width above the fullhd breakpoint.",
                fullhd=True,
            )
        )

    def test_section(self) -> None:
        def box(label: str, *, size: Size | None = None) -> str:
            return _bordered(str(section(_safe(f"<code>{label}</code>"), size=size)))

        self.assertFragmentInDemo(box("Default section padding."))
        self.assertFragmentInDemo(box("is-medium section padding.", size="medium"))
        self.assertFragmentInDemo(box("is-large section padding.", size="large"))

    def test_hero_variants(self) -> None:
        for variant in ("info", "success", "warning", "danger", "light", "dark"):
            html = str(
                hero(
                    variant.capitalize(),
                    subtitle=f"is-{variant} hero variant.",
                    variant=variant,
                    size="small",
                )
            )
            self.assertFragmentInDemo(html)
        self.assertFragmentInDemo(
            str(
                hero(
                    "Medium hero",
                    subtitle="is-medium size.",
                    variant="primary",
                    size="medium",
                )
            )
        )
        self.assertFragmentInDemo(
            str(
                hero(
                    "Large hero",
                    subtitle="is-large size.",
                    variant="primary",
                    size="large",
                )
            )
        )

    def test_title(self) -> None:
        for n in range(1, 7):
            self.assertFragmentInDemo(str(title(f"Title, size {n}", size=str(n))))

    def test_media(self) -> None:
        avatar = _safe('<div class="demo-avatar" aria-hidden="true">AL</div>')
        self.assertFragmentInDemo(
            str(
                media(
                    _safe("<strong>Ada Lovelace</strong><p>Posted 2 hours ago.</p>"),
                    image=avatar,
                    position="start",
                )
            )
        )
        self.assertFragmentInDemo(
            str(
                media(
                    _safe("<strong>Alan Turing</strong><p>Posted 5 hours ago.</p>"),
                    image=avatar,
                    position="end",
                )
            )
        )

    def test_tile(self) -> None:
        tile_a = tile(card(body=_safe("Tile A")), child=True)
        tile_b = tile(card(body=_safe("Tile B")), child=True)
        tile_c = tile(card(body=_safe("Tile C")), child=True)
        parent_left = tile(tile_a, parent=True, size="8")
        parent_right = tile(_safe(f"{tile_b}{tile_c}"), parent=True, size="4")
        ancestor = tile(_safe(f"{parent_left}{parent_right}"), ancestor=True)
        self.assertFragmentInDemo(f'<div class="ui-tiles">{ancestor}</div>')

    def test_footer(self) -> None:
        html = str(
            footer(
                _safe(
                    "<p>FastBlocks UI -- HTML/CSS-first components for "
                    "server-rendered Python apps.</p>"
                    '<p><a href="#top">Back to top</a></p>'
                )
            )
        )
        self.assertFragmentInDemo(html)

    def test_column(self) -> None:
        offsets = columns(
            column(card(body=_safe('<code>size="4"</code>')), size="4"),
            column(
                card(body=_safe('<code>size="4" offset="4"</code>')),
                size="4",
                offset="4",
            ),
        )
        narrow = columns(
            column(card(body=_safe("<code>narrow</code>")), narrow=True),
            column(card(body=_safe("Flexible remaining column."))),
        )
        self.assertFragmentInDemo(str(offsets))
        self.assertFragmentInDemo(str(narrow))

    def test_navbar(self) -> None:
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
        self.assertFragmentInDemo(str(default_variant))
        self.assertFragmentInDemo(str(dark_variant))

    def test_field_standalone(self) -> None:
        html = str(
            field(
                label="Email address",
                help_text="We'll never share it.",
                control_html=ui_input(
                    id="demo-email", type="email", value="ada@example.com"
                ),
                control_id="demo-email",
            )
        )
        self.assertFragmentInDemo(html)

    def test_input_standalone(self) -> None:
        self.assertFragmentInDemo(
            str(
                ui_input(
                    id="demo-input-text",
                    type="text",
                    placeholder="Text input",
                    aria_label="Text input example",
                )
            )
        )
        self.assertFragmentInDemo(
            str(
                ui_input(
                    id="demo-input-password",
                    type="password",
                    placeholder="Password",
                    aria_label="Password input example",
                )
            )
        )
        self.assertFragmentInDemo(
            str(
                ui_input(
                    id="demo-input-disabled",
                    type="text",
                    value="Disabled",
                    disabled=True,
                    aria_label="Disabled input example",
                )
            )
        )

    def test_select_standalone(self) -> None:
        html = str(
            ui_select(
                options=[("sm", "Small"), ("md", "Medium"), ("lg", "Large")],
                value="md",
                id="demo-select-standalone",
                aria_label="Size",
            )
        )
        self.assertFragmentInDemo(html)

    def test_checkbox_standalone(self) -> None:
        self.assertFragmentInDemo(str(checkbox(label="Unchecked option")))
        self.assertFragmentInDemo(str(checkbox(label="Checked option", checked=True)))

    def test_switch_standalone(self) -> None:
        self.assertFragmentInDemo(str(switch(label="Off by default")))
        self.assertFragmentInDemo(str(switch(label="On by default", checked=True)))

    def test_validation_summary_standalone(self) -> None:
        html = str(
            validation_summary({"demo-standalone-field": "This field is required."})
        )
        self.assertFragmentInDemo(html)

    def test_button_sizes(self) -> None:
        self.assertFragmentInDemo(str(button("Small", variant="primary", size="small")))
        self.assertFragmentInDemo(str(button("Default size", variant="primary")))
        self.assertFragmentInDemo(str(button("Large", variant="primary", size="large")))

    def test_card(self) -> None:
        html = str(
            card(
                header="Card header",
                body=_safe(
                    "<p>Cards group related content with optional header and "
                    "footer slots.</p>"
                ),
                footer=button("Action", variant="primary", size="small"),
            )
        )
        self.assertFragmentInDemo(html)

    def test_table_bordered(self) -> None:
        html = str(
            table(
                headers=["Metric", "Value"],
                rows=[["Uptime", "99.98%"], ["Latency", "42ms"]],
                bordered=True,
            )
        )
        self.assertFragmentInDemo(html)

    def test_every_manifest_component_has_a_demo_section(self) -> None:
        """Guards issue #1 of the demo redesign: every manifest component must
        have a real, working example section on the page, not just a row in
        the reference table. Anchor ids match manifest component `name`s
        verbatim (see scripts/build_demo.py's build_categories())."""
        names = [c["name"] for c in COMPONENT_MANIFEST["components"]]
        self.assertEqual(
            len(names), 27, "expected manifest to still have 27 components"
        )
        missing = [
            name
            for name in names
            if not re.search(
                rf'<section id="{re.escape(name)}" class="demo-section"', DEMO_HTML
            )
        ]
        self.assertEqual(
            missing,
            [],
            "demo/demo.html is missing a demo section for these manifest components: "
            + ", ".join(missing),
        )

    def test_sidebar_links_to_every_section(self) -> None:
        names = [c["name"] for c in COMPONENT_MANIFEST["components"]]
        sidebar_start = DEMO_HTML.index('<nav class="demo-sidebar"')
        sidebar_end = DEMO_HTML.index("</nav>", sidebar_start)
        sidebar_html = DEMO_HTML[sidebar_start:sidebar_end]
        missing = [name for name in names if f'href="#{name}"' not in sidebar_html]
        self.assertEqual(
            missing,
            [],
            "demo/demo.html's sidebar is missing a link to these manifest components: "
            + ", ".join(missing),
        )

    def test_theme_toggle(self) -> None:
        # The toggle button + status text -- lives in its own demo_section("Theme", ...)
        # card, mirroring how Layout/Menu/Dialog are each their own section.
        fragment = (
            '<div class="ui-cluster demo-toolbar">'
            + str(button("Toggle theme", type="button", data_theme_toggle=True))
            + '<span class="ui-muted">Light / dark via semantic tokens.</span>'
            + "</div>"
        )
        self.assertFragmentInDemo(fragment)

    def test_buttons_row(self) -> None:
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
        self.assertFragmentInDemo(str(row))

    def test_alerts(self) -> None:
        for variant, text in (
            ("info", "A neutral, informational note."),
            ("success", "Saved successfully."),
            ("warning", "Heads up — check your input."),
            ("danger", "Something went wrong."),
        ):
            self.assertFragmentInDemo(str(alert(text, variant=variant)))

    def test_progress(self) -> None:
        self.assertFragmentInDemo(str(progress(25, show_label=True)))
        self.assertFragmentInDemo(str(progress(50, variant="info")))
        self.assertFragmentInDemo(str(progress(75, variant="success", size="large")))
        self.assertFragmentInDemo(str(progress(90, variant="warning")))

    def test_table(self) -> None:
        html = str(
            table(
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
        )
        self.assertFragmentInDemo(html)

    def test_layout(self) -> None:
        # Layout and Toolbar are now separate demo_section() cards (previously
        # bundled together) -- see test_toolbar for the level() half.
        grid = columns(
            column(
                card(body=_safe("<strong>8 cols</strong><p>Main content area.</p>")),
                size="8",
            ),
            column(
                card(body=_safe("<strong>4 cols</strong><p>Sidebar.</p>")), size="4"
            ),
        )
        self.assertFragmentInDemo(str(grid))

    def test_toolbar(self) -> None:
        lvl = level(
            left=_safe(
                '<strong>Toolbar</strong> <span id="demo-action-status" class="ui-muted">'
                "No action taken yet.</span>"
            ),
            right=button(
                "Action", type="button", variant="primary", id="demo-action-button"
            ),
        )
        self.assertFragmentInDemo(str(lvl))

    def test_rtl(self) -> None:
        grid = columns(
            column(
                card(body=_safe("<strong>عمود مُزاح</strong>")), size="4", offset="4"
            ),
        )
        tbl = table(
            headers=["الاسم", "الوظيفة"],
            rows=[["أحمد", "مهندس"], ["فاطمة", "طبيبة"]],
        )
        self.assertFragmentInDemo(str(compose(grid, tbl)))

    def test_breadcrumb_and_pagination(self) -> None:
        self.assertFragmentInDemo(
            str(breadcrumb([("Home", "#"), ("Components", "#"), ("Pagination", None)]))
        )
        self.assertFragmentInDemo(
            str(pagination(5, 12, url_pattern="#page-{page}", siblings=1))
        )

    def test_email_field(self) -> None:
        html = str(
            field(
                label="Email address",
                help_text="We'll never share it.",
                control_html=ui_input(
                    id="demo-email", type="email", value="ada@example.com"
                ),
                control_id="demo-email",
            )
        )
        self.assertFragmentInDemo(html)

    def test_role_field(self) -> None:
        html = str(
            field(
                label="Role",
                control_html=ui_select(
                    options=[("dev", "Developer"), ("design", "Designer")],
                    value="dev",
                    id="demo-role",
                ),
                control_id="demo-role",
            )
        )
        self.assertFragmentInDemo(html)

    def test_checkbox(self) -> None:
        self.assertFragmentInDemo(str(checkbox(label="Remember me", checked=True)))

    def test_switch(self) -> None:
        self.assertFragmentInDemo(
            str(switch(label="Enable notifications", checked=True))
        )

    def test_validation_summary(self) -> None:
        html = str(
            validation_summary(
                {"demo-display-name": "Display name must be at least 3 characters."}
            )
        )
        self.assertFragmentInDemo(html)

    def test_display_name_field_with_error(self) -> None:
        html = str(
            field(
                label="Display name",
                help_text="Shown on your profile and in activity feeds.",
                error_text="Display name must be at least 3 characters.",
                control_html=ui_input(id="demo-display-name", type="text", value="Ada"),
                control_id="demo-display-name",
            )
        )
        self.assertFragmentInDemo(html)

    def test_save_button(self) -> None:
        self.assertFragmentInDemo(str(button("Save", variant="primary", type="submit")))

    def test_tabs(self) -> None:
        html = str(
            tabs(
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
        )
        self.assertFragmentInDemo(html)

    def test_dialog(self) -> None:
        close_button = button("Close", type="button", data_ui_dialog_close=True)
        content = _safe(
            '<h4 id="demo-dialog-title">Settings</h4>'
            "<p>Native &lt;dialog&gt; with enhancement-only behavior.</p>"
            + str(close_button)
        )
        html = str(
            dialog(
                content,
                id="demo-dialog",
                data_ui_dialog=True,
                aria_hidden="true",
                aria_labelledby="demo-dialog-title",
            )
        )
        self.assertFragmentInDemo(html)

    def test_menu(self) -> None:
        html = str(
            menu(
                [("Profile", "#"), ("Settings", "#"), ("Sign out", "#")],
                label="Demo menu",
                id="demo-menu",
                hidden=True,
            )
        )
        self.assertFragmentInDemo(html)

    def test_container_query_narrow_panel(self) -> None:
        self.assertFragmentInDemo(
            _cq_panel(
                "15rem",
                "Narrow wrapper",
                "cq-narrow",
                "cq-narrow-column",
                "cq-narrow-card",
            )
        )

    def test_container_query_wide_panel(self) -> None:
        self.assertFragmentInDemo(
            _cq_panel(
                "31rem", "Wide wrapper", "cq-wide", "cq-wide-column", "cq-wide-card"
            )
        )

    def test_demo_html_references_demo_index_by_comment(self) -> None:
        # Cheap guard against someone deleting the file-level explanation of what this
        # parity mechanism is and why the fragments below are pasted, not guessed.
        self.assertIn("tests/test_demo_parity.py", DEMO_HTML)


if __name__ == "__main__":
    unittest.main()


class TestEmbeddedManifestFreshness(unittest.TestCase):
    """`demo/demo.html` embeds a copy of manifest.json; it must not drift.

    The page inlines the manifest in a
    `<script type="application/json" id="fastblocks-ui-manifest-data">` so it
    still renders when opened as a bare `file://` document (browsers block
    `fetch()` of a sibling local file). That copy is hand-maintained and had
    fallen behind the real manifest, defeating the symlink-as-single-source
    design. `demo/index.html` is unaffected -- `build_demo.py` reads
    `COMPONENT_MANIFEST` live at build time.
    """

    def test_embedded_copy_matches_the_real_manifest(self) -> None:
        import json

        match = re.search(
            r'<script type="application/json" id="fastblocks-ui-manifest-data">'
            r"(.*?)</script>",
            DEMO_HTML,
            re.S,
        )
        self.assertIsNotNone(match, "demo.html no longer embeds the manifest")
        assert match is not None

        embedded = json.loads(match.group(1))
        real = json.loads(
            (ROOT / "fastblocks_ui" / "manifest.json").read_text(encoding="utf-8")
        )
        self.assertEqual(
            embedded,
            real,
            "demo/demo.html's embedded manifest has drifted from "
            "fastblocks_ui/manifest.json -- re-embed it.",
        )
