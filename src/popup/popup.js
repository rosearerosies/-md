const status = document.querySelector("#status");
const download = document.querySelector("#download");
const retry = document.querySelector("#retry");
const overview = document.querySelector("#overview");
const settings = document.querySelector("#settings");

function setStatus(message, failed = false) {
  status.textContent = message;
  status.style.color = failed ? "#b42318" : "";
  retry.hidden = !failed;
}

async function send(message) { return chrome.runtime.sendMessage(message); }

async function extractCurrentPage(tab) {
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: "extract-page" });
    if (!result?.ok) throw new Error(result?.error || "页面提取失败。");
    return result.data;
  } catch (error) {
    const canInject = /^https?:/.test(tab.url || "");
    if (!canInject) {
      throw new Error("当前页面不允许注入网页提取脚本，请打开普通网页后再试。");
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "src/content/shared.js",
          "src/content/adapters.js",
          "src/content/extractor.js"
        ]
      });
      const result = await chrome.tabs.sendMessage(tab.id, { type: "extract-page" });
      if (!result?.ok) throw new Error(result?.error || "页面提取失败。");
      return result.data;
    } catch (injectError) {
      throw new Error(`无法连接当前页面，请刷新页面后重试：${injectError.message}`);
    }
  }
}

async function run() {
  download.disabled = true;
  retry.hidden = true;
  try {
    setStatus("正在提取当前页面…");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("请在普通网页、文章页或视频页中使用此扩展。");
    const data = await extractCurrentPage(tab);
    if (document.querySelector("#summary").checked) {
      if (data.kind === "video" && !data.transcript) data.note = [data.note, "未发现当前页面可访问的字幕，已仅导出视频信息。"].filter(Boolean).join("\n");
      else {
        setStatus("正在生成摘要…");
        const summary = await send({ type: "summarize", data });
        if (!summary?.ok) throw new Error(summary?.error || "摘要生成失败。");
        data.summary = summary.summary;
      }
    }
    setStatus("正在下载 Markdown…");
    const saved = await send({ type: "download-markdown", data });
    if (!saved?.ok) throw new Error(saved?.error || "下载失败。");
    setStatus("已下载 Markdown。")
  } catch (error) {
    setStatus(error.message || "导出失败。", true);
  } finally { download.disabled = false; }
}

async function runOverview() {
  overview.disabled = true;
  try {
    setStatus("正在生成一图速览…");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:/.test(tab.url || "")) throw new Error("请在普通网页、文章页或视频页中使用此扩展。");
    const data = await extractCurrentPage(tab);
    if (document.querySelector("#summary").checked && (data.transcript || data.body)) {
      setStatus("正在生成摘要…");
      const result = await send({ type: "summarize", data });
      if (result?.ok) data.summary = result.summary;
    }
    const saved = await send({ type: "download-overview", data });
    if (!saved?.ok) throw new Error(saved?.error || "一图速览下载失败。");
    setStatus("已下载一图速览 SVG。")
  } catch (error) { setStatus(error.message || "生成失败。", true); }
  finally { overview.disabled = false; }
}

download.addEventListener("click", run);
retry.addEventListener("click", run);
overview.addEventListener("click", runOverview);
settings.addEventListener("click", () => chrome.runtime.openOptionsPage());
