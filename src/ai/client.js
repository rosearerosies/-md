import { chunks, cleanTranscript } from "../shared/markdown.js";
import { getSettings } from "../shared/storage.js";

function endpoint(baseUrl) { return `${baseUrl.replace(/\/$/, "")}/chat/completions`; }
function modelsEndpoint(baseUrl) { return `${baseUrl.replace(/\/$/, "")}/models`; }

async function chat(settings, prompt) {
  const response = await fetch(endpoint(settings.baseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({ model: settings.model, temperature: 0.2, messages: [{ role: "user", content: prompt }] })
  });
  if (!response.ok) throw new Error(`模型接口请求失败：${response.status} ${await response.text()}`);
  const json = await response.json();
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("模型接口未返回摘要内容。");
  return content;
}

export async function testApiProfile(profile) {
  if (!profile?.baseUrl || !profile?.apiKey || !profile?.model) throw new Error("请填写 API Base URL、API Key 和模型名。");
  try { new URL(profile.baseUrl); } catch { throw new Error("API Base URL 格式不正确。"); }
  return chat(profile, "Reply exactly with: OK");
}

export async function listApiModels(profile) {
  if (!profile?.baseUrl || !profile?.apiKey) throw new Error("请先填写 API Base URL 和 API Key。");
  try { new URL(profile.baseUrl); } catch { throw new Error("API Base URL 格式不正确。"); }
  const response = await fetch(modelsEndpoint(profile.baseUrl), {
    headers: { Authorization: `Bearer ${profile.apiKey}` }
  });
  if (!response.ok) throw new Error(`获取模型列表失败：${response.status} ${await response.text()}`);
  const payload = await response.json();
  const models = (Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [])
    .map((item) => typeof item === "string" ? item : item?.id || item?.name)
    .filter(Boolean);
  const unique = [...new Set(models)].sort((left, right) => left.localeCompare(right));
  if (!unique.length) throw new Error("接口未返回可用模型列表。");
  return unique;
}

export async function summarize(data) {
  const settings = await getSettings();
  const profile = settings.apiProfiles.find((item) => item.id === settings.activeApiId) || settings.apiProfiles[0];
  if (!profile?.baseUrl || !profile.apiKey || !profile.model) throw new Error("请先在设置中添加并选择一个 API。");
  const source = cleanTranscript(data.transcript || data.body || "");
  if (!source) throw new Error("当前页面没有可供总结的正文或字幕。");
  const parts = chunks(source);
  const summaries = [];
  for (const [index, part] of parts.entries()) {
    summaries.push(await chat(profile, `请按原始内容语言，用简洁 Markdown 总结以下${data.kind === "video" ? "视频字幕" : "网页正文"}。输出 5 到 8 条要点；不要编造信息。\n\n标题：${data.title}\n简介：${data.body || "无"}\n第 ${index + 1}/${parts.length} 段：\n${part}`));
  }
  if (summaries.length === 1) return summaries[0];
  return chat(profile, `请合并以下分段摘要，按原语言输出简洁 Markdown，总计 5 到 8 条要点，不要重复或编造。\n\n${summaries.join("\n\n")}`);
}
