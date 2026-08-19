# Effects Cookbook

This cookbook covers fastblocks-ui's 14+ opt-in visual effects:
backdrop systems (full-bleed, aurora, noise, patterns), motion
primitives (spotlight, scroll-reveal, tilt, theme transitions, page
transitions), and 3D / media integrations (Spline, Three.js mesh-
gradient, `<model-viewer>`, Lottie, video backgrounds).

Two-way naming convention: `is-*` for state modifiers (mirrors
`is-primary`, `is-glass`, `is-sticky`); `has-*` for static layered
visual effects; `[data-*]` for JS-toggled runtime state. All
opt-in selectors wrap in `:where()` so consumer transforms always
win specificity.

## Index

| Effect | What | Selector |
|---|---|---|
| Full-bleed hero | Edge-to-edge section | `.has-fullbleed` |
| Aurora gradient | Drifting color field | `.has-aurora` |
| Noise / grain overlay | Subtle texture | `.has-noise` |
| Pattern (dots) | Geometric backdrop | `.has-pattern-dots` |
| Pattern (grid) | Geometric backdrop | `.has-pattern-grid` |
| Pattern (lines) | Geometric backdrop | `.has-pattern-lines` |
| Pattern (diagonal) | Geometric backdrop | `.has-pattern-diagonal` |
| Cursor spotlight | Mouse-tracking glow | `.has-spotlight` |
| Scroll reveal | Reveal on scroll | `[data-reveal]` |
| Tilt on hover | 3D card tilt | `[data-tilt]` |
| Theme transitions | Animated data-theme switch | (consumer) |
| Page transitions | View Transitions API | (consumer) |
| Mesh gradient | Three.js shader backdrop | `.has-mesh-gradient` |
| Video background | Looping muted video | `.has-video-bg` |
| Lottie animation | After Effects → JSON | `.has-lottie` |

## Per-effect recipes

### Full-bleed hero (`.has-fullbleed`)

Edge-to-edge section that escapes any ancestor `overflow: hidden` and
stretches to the viewport edge. Use for hero blocks and section
breakpoints. Browser support: all evergreens (uses logical inset with
negative margins).

```html
<section class="has-fullbleed">
  <h1>Welcome</h1>
</section>
```

**Perf notes**: zero JS, zero paint cost beyond the element itself.

### Aurora gradient (`.has-aurora`)

Drifting radial color field behind an element. Pure CSS, uses
`@keyframes` on `--ui-aurora-stop-N` custom properties. Use sparingly --
one per page. Browser support: all evergreens (custom properties +
`@keyframes`).

```html
<section class="has-aurora">
  <h2>Hero</h2>
</section>
```

**Perf notes**: animates transforms and custom properties on the GPU
compositor. Avoid stacking more than one aurora element per page.

### Noise / grain overlay (`.has-noise`)

Subtle SVG noise texture overlaid via `::after` pseudo-element. Use
to break up flat color blocks. Browser support: all evergreens.

```html
<div class="has-noise">Content</div>
```

**Perf notes**: the noise layer is a single image, no JS, no animation.

### Pattern (dots/grid/lines/diagonal) (`.has-pattern-*`)

Geometric backdrops driven by CSS gradients on the `::before`
pseudo-element. Size via `--ui-pattern-size`. Browser support: all
evergreens.

```html
<section class="has-pattern-dots">Dots</section>
<section class="has-pattern-grid">Grid</section>
<section class="has-pattern-lines">Lines</section>
<section class="has-pattern-diagonal">Diagonal</section>
```

**Perf notes**: pure CSS, no paint cost beyond the gradient. Adjust
`--ui-pattern-size` to scale without re-rendering.

### Cursor spotlight (`.has-spotlight`)

Mouse-tracking glow rendered via `::before` pseudo-element. The JS
module (`spotlight.js`) writes `--ui-spotlight-x` / `--ui-spotlight-y`
on `pointermove`. Disabled under `prefers-reduced-motion: reduce` and
`pointer: coarse`. Browser support: all evergreens.

```html
<article class="has-spotlight" data-tilt>Card</article>
```

**Perf notes**: one `pointermove` listener per element. Use the
built-in fail-closed CSS (`opacity: 0` until JS sets `data-spotlight-active`)
to avoid a flash of unstyled glow.

### Scroll reveal (`[data-reveal]`)

Reveal on scroll using IntersectionObserver. Skipped under
`prefers-reduced-motion: reduce`. Browser support: all evergreens.

```html
<article data-reveal>Content</article>
```

**Perf notes**: one observer per element. The observer disconnects
after the first reveal, so cost drops to zero after the element is
visible.

### Tilt on hover (`[data-tilt]`)

3D card tilt on pointer move. Writes `--ui-tilt-x` / `--ui-tilt-y` on
the element. Skipped under `prefers-reduced-motion: reduce` and
`pointer: coarse`. Browser support: all evergreens.

```html
<article data-tilt>Card</article>
```

**Perf notes**: per-element `pointermove` listener. Use
`will-change: transform` if stacking many tilt elements.

### Theme transitions (consumer)

Animated `data-theme` attribute change. Pair with the
`theme-transitions.js` module to fade background and text colors on
switch. Browser support: all evergreens.

```html
<html data-theme="dark">
  <body>...</body>
</html>
```

**Perf notes**: animates color and background-color on the root
elements only; safe to use globally.

### Page transitions (consumer)

View Transitions API wrapper. Pair with the `page-transitions.js`
module to animate the document on navigation. Browser support:
Chromium 111+, Safari 18+, Firefox behind a flag.

```html
<a href="/next" data-page-transition>Next</a>
```

**Perf notes**: one transition per navigation. The browser composites
the snapshot, so no raster cost on the page itself.

### Mesh gradient (`.has-mesh-gradient`)

Three.js shader backdrop. The `mesh-gradient.js` module boots a
renderer on the first matched element. Browser support: all evergreens
(WebGL).

```html
<div class="has-mesh-gradient">Content</div>
```

**Perf notes**: a WebGL canvas costs ~1-2ms per frame at 60fps on
mid-range hardware. Use one per page; avoid animating on `scroll`.

### Video background (`.has-video-bg`)

Looping muted video. The `video-bg.js` module boots an autoplaying
`<video>` on the first matched element. Browser support: all evergreens.

```html
<div class="has-video-bg" data-video-src="/hero.mp4">Content</div>
```

**Perf notes**: video decoding is GPU-accelerated and idempotent; one
per page is fine. Use `prefers-reduced-data` to skip the asset.

### Lottie animation (`.has-lottie`)

After-Effects to JSON renderer. The `lottie-loader.js` module boots
lottie-web on the first matched element. Browser support: all evergreens.

```html
<div class="has-lottie" data-lottie-src="/anim.json">Fallback</div>
```

**Perf notes**: lottie-web is a canvas renderer (~1ms per frame). Use
`IntersectionObserver` to pause off-screen instances.

## Integration with htmy

Effects compose with [htmy](https://github.com/lesleslie/htmy)
async components. Two examples:

**Backdrop effect on a server-rendered section** (e.g. hero with aurora):

```python
from htmy import Component, html
from fastblocks_ui import aurora  # if exported; otherwise use raw class

class Hero(Component):
    def htmy(self, context) -> html.element:
        return html.section(
            class_="has-aurora",  # backdrop effect: opt-in via class
            data_reveal="",        # motion primitive: opt-in via attr
        )[
            html.h1("Welcome"),
        ]
```

The `class_="has-aurora"` is the opt-in -- no JS call needed; the
`aurora` module (Task 8) discovers it via the htmx orchestrator or
`init(root)` and binds. The `data_reveal=""` attribute opts into the
scroll-reveal motion primitive the same way.

**Loading state with shimmer** (consumer pattern):

```python
class SkeletonCard(Component):
    def htmy(self, context) -> html.element:
        return html.div(class_="ui-card has-shimmer")[
            html.div(class_="ui-card__title")[],
            html.p(class_="ui-card__body")[],
        ]
```

The `has-shimmer` effect (Task 8 -- out of v1 scope, listed for
context) would be defined identically: a CSS rule keyed on
`.has-shimmer` plus a JS module that opts in via the same orchestrator.
