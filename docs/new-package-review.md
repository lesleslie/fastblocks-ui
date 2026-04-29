# New Package Review

This review evaluates the architecture draft for the next package direction.

## Summary

The proposed direction is sound if the goal is:

- a new, original package
- HTML-first and template-first usage
- htmx compatibility without adapters
- very small JavaScript surface area
- support for Jinja and FastBlocks as primary consumers

It is a weaker fit if the intent is to recreate a full component framework with deep client-side behavior.

## Strengths

1. The design stays close to native HTML.
2. CSS variables and cascade layers are a good fit for theming.
3. The template API can be made friendly to sync and async contexts.
4. htmx support is natural when components render as normal DOM.
5. FastBlocks integration should be straightforward if the helpers emit plain markup.
6. The package can preserve the good parts of Bulma without inheriting its branding constraints.

## Risks

1. If the component API grows too wide, the package will drift back toward a heavy UI framework.
2. If JavaScript becomes responsible for basic rendering, htmx compatibility will suffer.
3. If the template API depends on macros alone, async template users will have a harder time.
4. If the package keeps Bulma naming too long, the new identity may be harder to establish.
5. If the token system is not explicit, theme portability will degrade quickly.

## Recommended Decisions

### Keep

- semantic HTML first
- CSS-variable theming
- minimal JS
- server-rendered usability
- htmx-safe output

### Avoid

- shadow DOM by default
- hydration as a requirement
- JS-only component rendering
- a compatibility-only identity
- design token sprawl without a manifest

## Jinja / Async Template Position

The draft should support:

- Jinja2 macros for synchronous templates
- Jinja2 macros for async-capable environments as well
- helper functions that return markup
- fragment/block rendering for async template integrations
- FastBlocks block composition

The safest implementation strategy is to make markup helpers the core API and treat macros as one of several supported composition tools.

## Bulma Relationship

Bulma remains useful as a source of practical CSS ideas:

- layout ergonomics
- modifier naming
- card/form patterns
- readable class structure

But the new package should not present itself as Bulma.
It should be a new system that has learned from Bulma.

## Naming Review

`FastBlocks UI` is the long-term product name and the active repository identity.

Recommended approach:

- keep the repository and package name aligned with FastBlocks UI
- use the product name directly in code and docs
- keep the public API stable under the released name

## Review Verdict

Proceed with the architecture, provided the following are true:

- the package remains HTML/CSS-first
- the template helpers are the primary authoring surface
- the JavaScript layer stays optional and tiny
- the project gets a new non-Bulma name before release

## Open Questions Before Execution

1. What exact component set should ship in v1?
2. What should the first public package name be?
3. Should the helper API return raw HTML strings or structured component objects?
4. Which FastBlocks primitives need first-class support?
5. Should the dark theme be automatic or opt-in only?
