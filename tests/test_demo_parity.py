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
from html import escape
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
        #
        # `id="top"`: the hero is a direct child of <body>, above the shell, so
        # it is what the navbar brand's `#top` lands on. It must stay a bare
        # `.ui-hero` there rather than move inside a wrapper -- layout.css
        # declares the sticky bar's view timeline on `body > .ui-hero`.
        #
        # `role="banner"`: being outside <main> puts this h1 outside every
        # landmark, which axe's `region` rule flags. The role names the element
        # the hero already is instead of adding a <header> the timeline
        # selector would no longer match.
        html = str(
            hero(
                "FastBlocks UI",
                subtitle="HTML/CSS-first components, semantic tokens, htmx-safe "
                "fragments, and optional enhancement JavaScript.",
                variant="primary",
                heading_level=1,
                id="top",
                role="banner",
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

    def test_page_navbar(self) -> None:
        # This page's own sticky bar, not a showcase sample (see test_navbar for
        # those). `label="site navigation"` rather than the default because the
        # default is "main navigation", which the two showcase navbars would
        # otherwise also carry -- three navigation landmarks, one name. The
        # drawer's "Component sections" was never the clash partner; every
        # distinct name is enforced by test_navigation_landmarks_have_unique_names.
        html = str(
            navbar(
                brand="FastBlocks UI",
                brand_url="#top",
                end=_safe(
                    str(button("Theme", type="button", data_theme_toggle=True))
                    + str(burger(controls="site-nav", class_="is-shell-toggle"))
                ),
                label="site navigation",
                class_="is-sticky",
            )
        )
        self.assertFragmentInDemo(html)

    def test_navbar(self) -> None:
        # Explicit `label=` on both: `navbar()` defaults to "main navigation",
        # so the two showcase instances exposed two navigation landmarks under
        # one accessible name -- ambiguous for landmark navigation, and axe's
        # `landmark-unique`. Pinning the labels here is what stops the demo
        # regressing to the default and reintroducing the clash.
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
        self.assertFragmentInDemo(str(default_variant))
        self.assertFragmentInDemo(str(dark_variant))

    def test_shell(self) -> None:
        # shell() cannot be nested live: a document may have only one <main>
        # that is not hidden, and rendering a second inside this page's own
        # would be invalid HTML. build_demo.py's shell_demo() shows the
        # escaped source instead of a live instance -- see the comment there.
        # Only the escaped call is pinned here (burger and drawer are already
        # pinned via test_page_navbar and test_sidebar_links_to_every_section,
        # and the wrapper prose is presentation, not helper output).
        markup = str(
            shell(
                _safe("<p>Main column</p>"),
                aside=_safe('<nav class="ui-shell__aside"><p>Aside</p></nav>'),
                main_id="example-main",
            )
        )
        self.assertFragmentInDemo(
            f'<pre class="demo-code" tabindex="0"><code>{escape(markup)}</code></pre>'
        )

    def test_nav_list_showcase(self) -> None:
        # This page's own table of contents is a live nav_list()/nav_groups()
        # instance (see test_sidebar_links_to_every_section), but the Nav list
        # showcase section renders a second, independent sample -- previously
        # unpinned, so its markup could drift from what nav_list() emits
        # without either the manifest-section or sidebar-link checks noticing.
        html = str(
            nav_list(
                [("Container", "#container"), ("Hero", "#hero"), ("Tile", "#tile")],
                active="#hero",
                aria_current="location",
            )
        )
        self.assertFragmentInDemo(html)

    def test_nav_groups_showcase(self) -> None:
        html = str(
            nav_groups(
                [
                    ("Layout", [("Container", "#container"), ("Hero", "#hero")]),
                    ("Forms", [("Field", "#field"), ("Input", "#input")]),
                ]
            )
        )
        self.assertFragmentInDemo(html)

    def test_navigation_landmarks_have_unique_names(self) -> None:
        """Every `<nav>` on the page must carry a distinct accessible name.

        Landmark navigation is only useful if the names distinguish the
        regions. `navbar()`'s `label` default is shared, so any two unlabelled
        instances collide -- which is why this asserts on the rendered page
        rather than on one helper call.
        """
        import re

        body = DEMO_HTML[DEMO_HTML.index("<body>") :]
        labels = re.findall(r'<nav[^>]*aria-label="([^"]+)"', body)
        duplicates = {label for label in labels if labels.count(label) > 1}
        self.assertEqual(
            duplicates, set(), f"navigation landmarks share a name: {duplicates}"
        )

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
            len(names), 32, "expected manifest to still have 32 components"
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
        # The table of contents is now one `drawer()` doubling as the shell's
        # aside -- an off-canvas popover below 1024px, a sticky column above it.
        sidebar_start = DEMO_HTML.index('<nav class="ui-drawer ui-shell__aside"')
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
        close_button = button(
            "Close", type="button", command="close", commandfor="demo-dialog"
        )
        content = _safe(
            '<h4 id="demo-dialog-title">Settings</h4>'
            "<p>Native &lt;dialog&gt;, opened and closed entirely by the platform.</p>"
            + str(close_button)
        )
        html = str(
            dialog(
                content,
                id="demo-dialog",
                aria_labelledby="demo-dialog-title",
            )
        )
        self.assertFragmentInDemo(html)

    def test_dropdown(self) -> None:
        # No `hidden`: the panel is a popover, so the UA hides it when closed.
        html = str(
            dropdown(
                [("Profile", "#"), ("Settings", "#"), ("Sign out", "#")],
                label="Demo dropdown",
                id="demo-dropdown",
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


class TestInlinedBundleFreshness(unittest.TestCase):
    """`demo/demo.html` inlines the CSS bundle; it must not go stale.

    Caught in the browser: an RTL switch fix was present in the bundle and in
    `demo/index.html`, but the hand-maintained `<style>` block in demo.html
    still held a pre-fix copy, so the rule silently did not apply on the page
    the e2e suite actually loads. A stale inlined bundle means every visual
    and accessibility assertion here is made against outdated CSS.
    """

    def test_inlined_css_matches_the_built_bundle(self) -> None:
        import fastblocks_ui

        match = re.search(r"<style[^>]*>(.*?)</style>", DEMO_HTML, re.S)
        self.assertIsNotNone(match, "demo.html no longer inlines a stylesheet")
        assert match is not None

        bundle = Path(fastblocks_ui.get_css_path()).read_text(encoding="utf-8")
        self.assertEqual(
            match.group(1).strip(),
            bundle.strip(),
            "demo/demo.html's inlined CSS has drifted from the built bundle -- "
            "re-inline it after running tools/build_css.py.",
        )


class TestInlinedJsFreshness(unittest.TestCase):
    """`demo/demo.html` inlines the JS modules the same way it inlines the CSS,
    but only the CSS had a drift gate. Both inlined copies had gone stale:
    `enhanceDrawers` was absent (added to `enhance.js` alongside the drawer
    component) and so were `manifest.js`'s HTML-escaping helpers. Playwright
    loads the hand-written page, so the e2e suite was exercising JavaScript that
    no longer ships -- including a `manifest.js` that interpolated manifest
    values into markup unescaped.

    Both are inlined verbatim rather than bundled or minified, so this asserts
    byte equality rather than probing for symbols: a substring search for a name
    like `enhanceDrawers` also matches prose in an HTML comment, and would keep
    passing against a partially updated copy.

    `demo/index.html` is unaffected. It inlines only `enhance.js` -- its manifest
    table is rendered server-side by `build_demo.py`, where this page renders it
    in the browser from `manifest.js` plus the embedded manifest JSON, so that it
    still works when opened as a bare `file://` document.
    """

    def test_inlined_modules_match_the_shipped_files(self) -> None:
        import fastblocks_ui

        js_dir = Path(fastblocks_ui.get_js_path()).parent
        for name in ("enhance.js", "manifest.js"):
            with self.subTest(module=name):
                source = (js_dir / name).read_text(encoding="utf-8").strip()
                self.assertIn(
                    source,
                    DEMO_HTML,
                    f"demo/demo.html's inlined copy of {name} has drifted from "
                    "the shipped module -- re-inline it.",
                )

    def test_inlined_js_exports_the_public_entrypoint_symbols(self) -> None:
        """Byte equality above pins the demo to whatever `enhance.js` happens to
        contain; this pins it to what the package publicly promises. `enhance.js`
        is the implementation, `fastblocks-ui.js` (what `get_js_path()` returns)
        is the entrypoint host apps load, and it re-exports these four names.
        """
        import fastblocks_ui

        entrypoint = Path(fastblocks_ui.get_js_path()).read_text(encoding="utf-8")
        # Search the inlined module bodies, not the whole file: DEMO_HTML also
        # holds HTML comments, and prose mentioning a symbol would satisfy a
        # naive substring search over the document.
        inlined = "\n".join(
            re.findall(r'<script type="module">\n?(.*?)</script>', DEMO_HTML, re.S)
        )
        # enhanceDialogs / enhanceMenus are deliberately absent: the Popover API
        # and command/commandfor replaced them, and enhanceDialogAutoshow is
        # intentionally not exported -- its public surface is the
        # data-ui-dialog-autoshow attribute, not the function.
        for symbol in (
            "enhanceDrawers",
            "enhanceTabs",
        ):
            with self.subTest(symbol=symbol):
                self.assertIn(symbol, entrypoint)
                self.assertIn(
                    f"export function {symbol}(",
                    inlined,
                    f"demo/demo.html's inlined JS does not define {symbol} -- "
                    "the public entrypoint re-exports it, so the demo is "
                    "running an older module.",
                )


if __name__ == "__main__":
    unittest.main()
