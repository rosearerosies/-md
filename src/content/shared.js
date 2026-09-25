(() => {
  const text = (node) => (node?.innerText || node?.textContent || "").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const one = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const meta = (...names) => {
    for (const name of names) {
      const el = one(`meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`);
      if (el?.content) return el.content.trim();
    }
    return "";
  };
  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  window.PageMd = { text, one, all, meta, clean };
})();
