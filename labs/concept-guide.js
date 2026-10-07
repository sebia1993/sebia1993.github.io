// Preserve existing deep links into the optional original material.
function revealConceptAnchor() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  let ancestor = target.parentElement;
  let opened = false;
  while (ancestor) {
    if (ancestor.tagName === 'DETAILS' && !ancestor.open) {
      ancestor.open = true;
      opened = true;
    }
    ancestor = ancestor.parentElement;
  }
  if (opened) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
}
window.addEventListener('hashchange', revealConceptAnchor);
revealConceptAnchor();
