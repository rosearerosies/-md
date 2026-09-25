(() => {
  const { text, all, clean } = window.PageMd;
  const removeSelectors = "script,style,noscript,iframe,svg,canvas,img,video,nav,header,footer,aside,form,button,.comment,.comments,.recommend,.related,.advertisement,.ad,.login,.toolbar";
  function toMarkdown(root) {
    if (!root) return "";
    const clone = root.cloneNode(true);
    all(removeSelectors, clone).forEach((node) => node.remove());
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) return node.nodeValue.replace(/\s+/g, " ");
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const tag = node.tagName.toLowerCase();
      const content = [...node.childNodes].map(walk).join("").replace(/ *\n */g, "\n");
      if (/^h[1-6]$/.test(tag)) return `\n\n${"#".repeat(+tag[1])} ${content.trim()}\n\n`;
      if (tag === "p" || tag === "div" || tag === "section") return `${content.trim()}\n\n`;
      if (tag === "br") return "\n";
      if (tag === "blockquote") return `\n${content.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n`;
      if (tag === "pre") return `\n\`\`\`\n${node.innerText.trim()}\n\`\`\`\n`;
      if (tag === "code") return `\`${content.trim()}\``;
      if (tag === "li") return `- ${content.trim()}\n`;
      if (tag === "a") { const href = node.href || ""; return href ? `[${content.trim() || href}](${href})` : content; }
      if (tag === "table") return `\n${text(node)}\n`;
      return content;
    };
    return walk(clone).replace(/\n{3,}/g, "\n\n").trim();
  }
  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type !== "extract-page") return;
    (async () => {
      const data = await window.PageMd.extractAdapter();
      if (!data.transcript && data.bodyRoot) data.body = toMarkdown(data.bodyRoot);
      if (!data.body && !data.transcript) data.body = toMarkdown(document.body);
      data.title = clean(data.title) || document.title || "未命名页面";
      data.author = clean(data.author);
      data.publishedAt = clean(data.publishedAt);
      data.url = location.href;
      data.note = !data.body && !data.transcript ? "未找到可导出的正文。" : "";
      respond({ ok: true, data });
    })().catch((error) => respond({ ok: false, error: error.message }));
    return true;
  });
})();
