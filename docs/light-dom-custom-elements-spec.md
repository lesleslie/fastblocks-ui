# Light DOM Custom Elements Spec

Status: Implemented
Plan: FBUI-011 in `docs/fastblocks-ui-implementation-plan.md`

This spec defines the FastBlocks UI enhancement layer for optional Custom
Elements. It is not a revival of the archived FastBulma/FAST plan and does not
replace the current helper-first API.

**Scope as of 0.8.0: `<ui-tabs>` only.**

`<ui-dialog>` and `<ui-dropdown>` were **Retired in 0.8.0**. Tabs has no platform
equivalent and still genuinely needs JavaScript, so it keeps an element
lifecycle. Dialogs and dropdowns no longer do: `command`/`commandfor` and the
Popover API now supply opening, closing, Escape, light-dismiss, the backdrop,
focus return and an inert background, natively and with no script. Keeping a
JavaScript implementation alongside would have meant two divergent ways to
drive the same component.

The sections below describing those two elements are kept as a record of what
was built and why it was withdrawn, not as documentation of shipping behaviour.

## Product Goal

Add a small, platform-native enhancement layer for components that benefit from
element lifecycle hooks while preserving FastBlocks UI's server-rendered,
htmx-safe model.

The target is a deliberate fusion of Bulma, Kelp, and Web Awesome rather than a
revival of the old FastBulma runtime:

- Bulma contributes readable class composition, utility ergonomics, and
  server-rendered HTML friendliness.
- Kelp contributes the idea that custom elements can be thin progressive
  enhancers around plain markup instead of owning rendering.
- Web Awesome contributes modern component naming, attribute-driven state, and
  accessible interaction expectations.
- FastBlocks UI keeps Jinja/FastBlocks helpers and htmx as first-class
  constraints.

## Non-Goals

- No compatibility layer for legacy `fast-*` tags.
- No dependency on FAST or Fluent components.
- No closed shadow DOM.
- No client-side rendering requirement.
- No hidden state that survives independently of server-rendered markup.
- No replacement for `ui-*` CSS classes or Python helpers.

## Core Rules

1. Custom Elements enhance existing light DOM.
1. The same markup must remain useful before the element upgrades.
1. Existing children must not be moved into closed implementation details.
1. State must be reflected in attributes such as `open`, `aria-selected`,
   `aria-expanded`, `hidden`, and `data-ui-state`.
1. htmx may replace an entire component, a panel, a menu body, or dialog content
   without requiring retained client memory.
1. Helpers emit the canonical markup; custom elements wrap or annotate that
   markup rather than inventing a separate render path.

## Candidate Elements

### `<ui-tabs>`

Enhances a tablist and panels rendered by the existing `tabs()` helper.

Example:

```html
<ui-tabs class="ui-tabs" data-ui-tabs>
  <div role="tablist">
    <button id="profile-tab" role="tab" aria-selected="true" aria-controls="profile-panel">
      Profile
    </button>
    <button id="billing-tab" role="tab" aria-selected="false" aria-controls="billing-panel">
      Billing
    </button>
  </div>
  <section id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
    Profile content
  </section>
  <section id="billing-panel" role="tabpanel" aria-labelledby="billing-tab" hidden>
    Billing content
  </section>
</ui-tabs>
```

Responsibilities:

- add keyboard navigation
- keep `aria-selected` and `hidden` in sync
- dispatch a cancelable `ui-tab-change` event before changing state
- dispatch `ui-tab-changed` after state is reflected in markup

### `<ui-dialog>` — Retired in 0.8.0

Enhances native `<dialog>` markup or a light-DOM fallback wrapper when native
dialog behavior is unavailable.

Example:

```html
<ui-dialog>
  <button class="ui-button" type="button" data-ui-dialog-open="settings-dialog">
    Settings
  </button>
  <dialog class="ui-dialog" id="settings-dialog" aria-labelledby="settings-title">
    <h2 id="settings-title">Settings</h2>
    <form method="dialog">
      <button class="ui-button" value="close">Close</button>
    </form>
  </dialog>
</ui-dialog>
```

Responsibilities:

- wire trigger elements to native dialog methods
- reflect open state on the host
- preserve focus return
- sync state when users close via Escape, backdrop, form submission, or htmx
  replacement

### `<ui-dropdown>` — Retired in 0.8.0

Enhances disclosure/navigation menu markup.

Example:

```html
<ui-dropdown class="ui-dropdown">
  <button type="button" aria-expanded="false" aria-controls="account-menu">
    Account
  </button>
  <div id="account-menu" hidden>
    <a href="/profile">Profile</a>
    <a href="/settings">Settings</a>
  </div>
</ui-dropdown>
```

Responsibilities:

- toggle `aria-expanded` and `hidden`
- close on outside click and Escape
- avoid ARIA menu semantics unless full menu keyboard behavior is implemented
- keep link navigation and htmx attributes untouched

## htmx Contract

Custom Elements must assume that htmx can replace their contents at any time.

Required behavior:

- use lifecycle callbacks for setup and cleanup
- tolerate repeated connection without duplicate listeners
- derive current state from attributes on connect
- keep selected/open state in server-rendered markup
- expose events that applications may intercept before state changes

The server remains the source of truth. Client-side changes are temporary UI
feedback unless the application posts state back and receives a new fragment.

## Shadow DOM Policy

Open shadow DOM is allowed only after a design review proves that light DOM
cannot satisfy the component's accessibility, styling, and htmx requirements.
Closed shadow DOM is not allowed for public FastBlocks UI components.

Default styling must continue to work through public CSS classes and tokens.
Consumers must be able to inspect, target, and swap component contents.

Why light DOM is the default:

- htmx swaps normal DOM fragments; shadow roots make partial replacement,
  targeting, and server-owned state harder to reason about.
- FastBlocks UI's styling contract is public CSS classes and tokens; shadow DOM
  would force parts, CSS custom property plumbing, or duplicate styling APIs.
- Jinja and FastBlocks helpers need to emit meaningful HTML that works before
  JavaScript upgrades.
- Accessibility relationships such as labels, tab panels, descriptions, and
  validation messages are simpler when IDs and ARIA references stay in one DOM
  tree.
- Application authors often need to inspect, test, override, and compose the
  children directly.
- Closed shadow DOM would hide implementation details in exactly the places this
  package wants server-rendered markup to stay inspectable and replaceable.

## Helper Integration

Python helpers should accept an opt-in argument when this layer ships:

```python
tabs(items, active_id="profile", custom_element=True)
dialog(content, title="Settings", custom_element=True)
menu(items, custom_element=True)
```

The default helper output remains standard HTML unless a future release
explicitly changes that default.

The generated custom-element markup must use the same IDs, labels, ARIA
attributes, classes, and htmx-compatible fragment structure as the plain helper
output.

## Implementation Notes

The current implementation keeps the wrapper host as an opt-in shell around the
existing helper markup:

- `tabs(..., custom_element=True)` renders a `<ui-tabs>` host with the same tab
  and panel structure as the plain helper.
- `dialog(..., custom_element=True)` renders a `<ui-dialog>` host around the
  canonical `<dialog>` markup.
- ~~`dropdown(..., custom_element=True)` renders a `<ui-dropdown>` host around the same~~
  *(retired: the parameter now raises `TypeError`)*  The former behaviour wrapped
  disclosure markup used by the plain helper.

The browser layer upgrades those hosts in place and resyncs after fragment
replacement so htmx swaps continue to work with server-authored state.

## Acceptance Criteria

- Existing no-JS markup remains usable.
- Custom elements upgrade idempotently after full-page load and after htmx swaps.
- State is reflected in attributes before and after user interaction.
- Tests cover keyboard behavior, focus return, repeated connect/disconnect, and
  htmx-style fragment replacement.
- Browser tests prove children remain in light DOM.
- Documentation explains when to use the custom-element wrapper and when plain
  helper output is enough.

## Open Questions

1. Should future public helpers add shorter wrapper aliases, or keep the
   explicit `custom_element=True` opt-in as the stable contract?
1. Should events use `ui-*` names or native-like names such as `beforetoggle`
   where the platform already has precedent?
