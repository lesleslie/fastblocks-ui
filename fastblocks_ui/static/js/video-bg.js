/**
 * Video background. The HTML markup provides <video autoplay muted
 * loop playsinline preload="metadata" poster="...">. This module:
 * - Falls back to a click-to-play handler on iOS Safari (autoplay
 *   blocked edge cases — surfaces as a rejected promise on play(),
 *   NOT as an `error` event, so we test play().catch() on load)
 * - Surfaces the poster under prefers-reduced-data (already handled
 *   via CSS @media query in effects.css)
 */
for (const wrap of document.querySelectorAll(".has-video-bg")) {
  const video = wrap.querySelector("video");
  if (!video) continue;

  function showClickToPlay() {
    if (wrap.querySelector(".has-video-bg__play")) return; // already shown
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Play background";
    btn.className = "has-video-bg__play";
    btn.addEventListener("click", () => {
      video.play().catch(() => {});
      btn.remove();
    });
    wrap.appendChild(btn);
  }

  // Test autoplay on load. iOS Safari may reject even with autoplay
  // muted loop playsinline attributes set.
  video.play().catch(() => showClickToPlay());

  // Network/source errors → also show the fallback button.
  video.addEventListener("error", showClickToPlay);
}

export function init(root = document) {
  /* Initial pass already ran at module load. reinit() is a no-op for
     video-bg (videos either play on first paint or trigger the
     click-to-play button). */
}

export function teardown(root = document) {
  /* No-op: video elements are owned by the consumer; the fallback
     button is scoped to the .has-video-bg wrapper and disappears
     with it on swap. */
}

