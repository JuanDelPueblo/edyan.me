// Keeps the waterline at the header's bottom edge, which moves with text
// wrapping and font loading. Every hero layout imports this.
const banner = document.querySelector(".aero-banner")!;
const site = document.querySelector<HTMLElement>(".aero-site")!;
function placeWaterline() {
  const wl =
    banner.getBoundingClientRect().bottom - site.getBoundingClientRect().top;
  site.style.setProperty("--wl", Math.round(wl) + "px");
}
placeWaterline();
new ResizeObserver(placeWaterline).observe(site);
document.fonts?.ready.then(placeWaterline);
