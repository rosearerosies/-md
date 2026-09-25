import { makeMarkdown, makeOverviewSvg, filename } from "../shared/markdown.js";
import { getSettings } from "../shared/storage.js";
import { folderPermission, getExportFolder, writeToFolder } from "../shared/folder-store.js";

function downloadFolder(settings) {
  if (settings.saveMode !== "subdirectory") return "";
  return String(settings.saveSubdirectory || "")
    .replace(/[\\/]+/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .map((part) => part.replace(/[<>:"|?*]/g, "_").trim())
    .filter(Boolean)
    .join("/") + "/";
}

async function saveExport(name, content, mimeType, settings) {
  if (settings.saveMode === "folder") {
    const handle = await getExportFolder();
    if (!handle) throw new Error("尚未选择本地保存文件夹，请到后台管理设置中选择。");
    if (await folderPermission(handle) !== "granted") throw new Error("本地文件夹授权已失效，请到后台管理设置中重新选择文件夹。");
    await writeToFolder(handle, `${downloadFolder(settings)}${name}`, content, mimeType);
    return;
  }
  const url = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
  await chrome.downloads.download({ url, filename: `${downloadFolder(settings)}${name}`, saveAs: settings.saveMode === "ask" });
}
import { summarize } from "../ai/client.js";

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type === "fetch-json") {
    fetch(message.url, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`页面数据请求失败：${response.status}`);
        return response.json();
      })
      .then((data) => respond({ ok: true, data }))
      .catch((error) => respond({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "summarize") {
    summarize(message.data).then((summary) => respond({ ok: true, summary })).catch((error) => respond({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "download-markdown") {
    const markdown = makeMarkdown(message.data);
    getSettings().then((settings) => saveExport(`${filename(message.data.title)}.md`, markdown, "text/markdown", settings))
      .then(() => respond({ ok: true }))
      .catch((error) => respond({ ok: false, error: error.message }));
    return true;
  }
  if (message.type === "download-overview") {
    const svg = makeOverviewSvg(message.data);
    getSettings().then((settings) => saveExport(`${filename(message.data.title)}-overview.svg`, svg, "image/svg+xml", settings))
      .then(() => respond({ ok: true }))
      .catch((error) => respond({ ok: false, error: error.message }));
    return true;
  }
});
