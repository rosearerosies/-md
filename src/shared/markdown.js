export function cleanTranscript(text = "") {
  const seen = new Set();
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s*(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d+)?\s*/, "").trim())
    .filter((line) => line && !seen.has(line) && seen.add(line))
    .join("\n");
}

export function chunks(text, limit = 12000) {
  const source = String(text || "").trim();
  if (!source) return [];
  const lines = source.split("\n");
  const result = [];
  let current = "";
  for (const line of lines) {
    if (current && current.length + line.length + 1 > limit) {
      result.push(current);
      current = line;
    } else current += `${current ? "\n" : ""}${line}`;
  }
  if (current) result.push(current);
  return result;
}

export function filename(value = "export") {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim().slice(0, 100) || "export";
}

function escapeXml(value = "") {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function makeOverviewSvg(data) {
  const title = escapeXml(data.title || "未命名页面");
  const site = escapeXml(data.site || "网页");
  const author = escapeXml(data.author || "未知作者");
  const summary = String(data.summary || data.body || data.transcript || "暂无摘要")
    .replace(/\r/g, "").split("\n").map((line) => line.replace(/^[-*#>\s]+/, "").trim()).filter(Boolean).slice(0, 8);
  const wrap = (value, max = 34) => {
    const chars = [...value]; const lines = [];
    while (chars.length) lines.push(chars.splice(0, max).join(""));
    return lines.length ? lines : [""];
  };
  const titleLines = wrap(data.title || "未命名页面", 22).slice(0, 2);
  const summaryLines = summary.flatMap((line) => wrap(line, 38)).slice(0, 14);
  const titleSvg = titleLines.map((line, index) => `<text x="72" y="${92 + index * 46}" class="title">${escapeXml(line)}</text>`).join("");
  const summarySvg = summaryLines.map((line, index) => `<text x="92" y="${235 + index * 28}" class="body">${index === 0 ? "• " : "  "}${escapeXml(line)}</text>`).join("");
  const height = Math.max(520, 275 + summaryLines.length * 28 + 105);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}">
  <rect width="1200" height="${height}" fill="#f6f8fc"/><rect x="40" y="40" width="1120" height="${height - 80}" rx="18" fill="#ffffff" stroke="#d9e0eb"/>
  <rect x="40" y="40" width="14" height="${height - 80}" rx="7" fill="#1264d6"/>
  <text x="72" y="72" class="meta">${site} · 一图速览</text>${titleSvg}
  <text x="72" y="190" class="meta">${author}</text><line x1="72" y1="205" x2="1128" y2="205" stroke="#e4e8ef"/>
  <text x="72" y="230" class="heading">核心内容</text>${summarySvg}
  <text x="72" y="${height - 58}" class="footer">由网页与视频转 Markdown 本地生成 · ${escapeXml(new Date().toLocaleDateString())}</text>
  <style>.title{font:700 40px system-ui,sans-serif;fill:#172033}.heading{font:700 22px system-ui,sans-serif;fill:#172033}.meta,.footer{font:14px system-ui,sans-serif;fill:#687386}.body{font:20px system-ui,sans-serif;fill:#263247}</style></svg>`;
}

export function makeMarkdown(data) {
  const lines = [`# ${data.title || "未命名页面"}`, "", `> 来源：${data.site || "网页"}`, `> 原文链接：${data.url}`];
  if (data.author) lines.push(`> 作者：${data.author}`);
  if (data.publishedAt) lines.push(`> 发布时间：${data.publishedAt}`);
  if (data.summary) lines.push("", "## 摘要", "", data.summary.trim());
  if (data.chapters?.length) {
    lines.push("", "## 章节", "");
    for (const chapter of data.chapters) lines.push(`- ${chapter.time ? `${chapter.time} ` : ""}${chapter.title}`.trim());
  }
  const body = data.transcript || data.body;
  if (body) lines.push("", data.transcript ? "## 字幕" : "## 正文", "", body.trim());
  if (data.note) lines.push("", "## 提示", "", data.note.trim());
  return `${lines.join("\n").trim()}\n`;
}
