// Legacy content assertions cover the preserved optional evidence, after a real click.
// Initial/closed guide layout and the single visible CTA are tested in concept-guides-audit.mjs.
export async function readLearningText(page) {
  const disclosure = page.locator('#cg-evidence');
  if (await disclosure.count() && await disclosure.getAttribute('open') === null) {
    await disclosure.locator(':scope > summary').click();
  }
  return page.locator('body').innerText();
}
