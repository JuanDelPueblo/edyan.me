// Tab selection shared by the tab strip and the toolbox ticker. The selected
// key lives in <html data-tab>, which CSS uses to show one panel; Layout.astro
// sets the first value before the page renders.

export const tabKeys = ["projects", "experiences", "contact"];

// Mark the tab for the current data-tab value as selected.
export function markTabs() {
  const key = document.documentElement.dataset.tab;
  for (const k of tabKeys) {
    const tab = document.getElementById("t-" + k)!;
    tab.setAttribute("aria-selected", String(k === key));
    tab.tabIndex = k === key ? 0 : -1;
  }
}

export function selectTab(key: string) {
  const root = document.documentElement;
  if (root.dataset.tab === key) return;
  // Panels revealed by a switch fade in instead of dropping in.
  document.getElementById("p-" + key)?.classList.add("switched");
  root.dataset.tab = key;
  markTabs();
  // Keep the selection in the URL so a tab can be linked directly.
  try {
    history.replaceState(null, "", "#" + key);
  } catch {
    // Some embedded views block history changes; the tab still switches.
  }
}
