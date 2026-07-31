# FastBlocks UI Component Manifest

This page is generated from `fastblocks_ui/manifest.json`. Keep the manifest and this document in sync.

## Layout Components

| Component | CSS Class | Helper | Purpose |
| --------- | -------- | ------ | ------- |
| shell | `ui-shell` | `shell()` | Full-bleed page shell with optional sticky aside column. |
| container | `ui-container` | `container()` | Centered max-width container |
| columns | `ui-columns` | `columns()` | Flexible grid container |
| column | `ui-column` | `column()` | Individual column in grid |
| section | `ui-section` | `section()` | Vertical spacing container |
| footer | `ui-footer` | `footer()` | Page footer |
| level | `ui-level` | `level()` | Horizontal toolbar/nav |
| hero | `ui-hero` | `hero()` | Full-width banner section |
| title | `ui-title` | `title()` | Typography title element |
| media | `ui-media` | `media()` | Image + text pair |
| tile | `ui-tile` | `tile()` | Hierarchical tile layout |
| navbar | `ui-navbar` | `navbar()` | Navigation bar with brand and menu items. |
| breadcrumb | `ui-breadcrumb` | `breadcrumb()` | Navigation trail with links and current page. |
| nav_list | `ui-nav-list` | `nav_list()` | Vertical navigation list for sidebars and drawers. |
| nav_group | `ui-nav-groups` | `nav_group()` | Labelled groups of vertical navigation links. |

## UI Components

| Component | CSS Class | Helper | Purpose |
| --------- | -------- | ------ | ------- |
| button | `ui-button` | `button()` | Primary and secondary action buttons. |
| card | `ui-card` | `card()` | Content containers and panels. |
| field | `ui-field` | `field()` | Label, help, and error grouping for form controls. |
| input | `ui-input` | `input()` | Native text-like input styling. |
| select | `ui-select` | `select()` | Native select styling. |
| checkbox | `ui-checkbox` | `checkbox()` | Checkbox label and control grouping. |
| switch | `ui-switch` | `switch()` | Accessible toggle switch presentation. |
| dialog | `ui-dialog` | `dialog()` | Native dialog styling and enhancement hooks. |
| drawer | `ui-drawer` | `drawer()` | Off-canvas panel built on the Popover API. |
| burger | `ui-burger` | `burger()` | Burger button that toggles a drawer via the Popover API. Add `is-shell-toggle` when it opens the shell's aside. |
| tabs | `ui-tabs` | `tabs()` | Accessible tablist, tab, and panel patterns. |
| menu | `ui-menu` | `menu()` | Disclosure and navigation menu styling. |
| alert | `ui-alert` | `alert()` | Inline notices and status messaging. |
| progress | `ui-progress` | `progress()` | Progress bar with value and variants. |
| table | `ui-table` | `table()` | Styled table with optional striping and hover. |
| pagination | `ui-pagination` | `pagination()` | Pagination links with current page indicator. |
| validation_summary | `ui-validation-summary` | `validation_summary()` | Aggregated form-error summary linking to individual fields. |

## Utilities

Single-purpose classes in `@layer utilities`, so they always win over component
rules. Utilities have no Python helper and no manifest entry -- they are applied
directly to whatever element needs them.

| Class | Purpose |
| ----- | ------- |
| `ui-stack` | Vertical grid with a uniform gap. `data-space="sm"` tightens it. |
| `ui-cluster` | Horizontal wrapping flex row, vertically centred. |
| `ui-surface` | Panel background, border, radius, and shadow. `data-elevated` raises it. |
| `ui-muted` | De-emphasised text colour. |
| `ui-visually-hidden` | Hides content visually while leaving it available to assistive tech. |
| `ui-measure` | Caps line length for readable prose. Override with `--ui-measure-size`. |

## State Modifiers

### Color Modifiers

- `is-primary`
- `is-info`
- `is-success`
- `is-warning`
- `is-danger`
- `is-light`
- `is-dark`

### Size Modifiers

- `is-small`
- `is-medium`
- `is-large`

### Layout Modifiers

- `is-narrow` — content-sized column
- `is-full` — full-width column
- `is-centered` — center alignment
- `is-vcentered` — vertical center alignment
- `is-gapless` — no spacing between columns
- `is-multiline` — wrap to multiple lines
- `is-fluid` — full-width container
- `is-widescreen` — wider container
- `is-fullhd` — full HD container

### Responsive Modifiers

- `is-X-tablet` — tablet breakpoint and up
- `is-X-desktop` — desktop breakpoint and up
- `is-X-widescreen` — widescreen breakpoint and up
- `is-offset-X` — offset by X columns

## Breakpoints

| Name | Min Width | Description |
| ---- | --------- | ----------- |
| mobile | < 769px | Mobile devices (default) |
| tablet | 769px+ | Tablets and up |
| desktop | 1024px+ | Desktops and up |
| widescreen | 1216px+ | Large screens |
