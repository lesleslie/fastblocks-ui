# FastBlocks UI Implementation Plan

The active implementation plan is `docs/fastblocks-ui-implementation-plan.md`
(formerly linked from this file; that path is no longer present in the docs
tree, so the URL was replaced with this prose to preserve the audit trail).

The previous FastBulma/FAST audit plan was archived at
`docs/archive/legacy/fastbulma-implementation-plan.md` (formerly linked from
this file; that path is also no longer present in the docs tree).
It described a legacy `fast-*` custom-element runtime and is not the current
FastBlocks UI product direction.

## Current Contract

- Components render as server-owned HTML with stable `ui-*` classes.
- Jinja and FastBlocks helpers are the canonical rendering path.
- htmx swaps operate on normal light DOM nodes.
- JavaScript is optional progressive enhancement for behavior that HTML alone
  cannot cover well.
- Custom Elements and shadow DOM are not part of the v1 runtime.

## Deferred Custom Elements

Optional light-DOM Custom Elements are tracked separately in
`docs/light-dom-custom-elements-spec.md` (formerly linked from this file;
that path is no longer present in the docs tree, so the URL was replaced
with this prose to preserve the audit trail)
and as FBUI-011 in the active implementation plan. That spec covers future
`<ui-tabs>`, `<ui-dialog>`, and `<ui-menu>` enhancers without reviving the
archived `fast-*` runtime.
