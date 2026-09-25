import { DEFAULT_SETTINGS, getSettings, saveSettings } from "../shared/storage.js";
import { clearExportFolder, folderPermission, getExportFolder, setExportFolder } from "../shared/folder-store.js";
import { listApiModels, testApiProfile } from "../ai/client.js";

const profiles = document.querySelector("#profiles");
const status = document.querySelector("#status");
const setStatus = (message) => { status.textContent = message; };

function id() { return crypto.randomUUID(); }

async function updateFolderName() {
  const folder = await getExportFolder();
  const permission = await folderPermission(folder);
  document.querySelector("#folderName").textContent = folder ? `${folder.name}${permission === "granted" ? "" : "（需要重新授权）"}` : "尚未选择文件夹";
}

function renderProfiles(items, activeId) {
  profiles.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "profile-result";
    empty.textContent = "还没有 API 配置。点击“添加 API”开始配置。";
    profiles.appendChild(empty);
    return;
  }
  items.forEach((profile) => {
    const box = document.createElement("div"); box.className = "profile"; box.dataset.id = profile.id;
    const head = document.createElement("div"); head.className = "profile-head";
    const activeLabel = document.createElement("label"); const radio = document.createElement("input"); radio.type = "radio"; radio.name = "activeApi"; radio.checked = profile.id === activeId; activeLabel.append(radio, " 使用此 API");
    const actions = document.createElement("div"); const test = document.createElement("button"); test.className = "test"; test.type = "button"; test.textContent = "测试"; const remove = document.createElement("button"); remove.className = "danger remove"; remove.type = "button"; remove.textContent = "删除"; actions.append(test, remove); head.append(activeLabel, actions); box.appendChild(head);
    for (const [field, label, type, placeholder] of [["name", "名称", "text", "例如 DeepSeek"], ["baseUrl", "API Base URL", "url", "https://api.deepseek.com/v1"], ["apiKey", "API Key", "password", ""]]) {
      const fieldLabel = document.createElement("label"); fieldLabel.append(document.createTextNode(label)); const input = document.createElement("input"); input.dataset.field = field; input.type = type; input.value = profile[field] || ""; input.placeholder = placeholder; if (field === "apiKey") input.autocomplete = "off"; fieldLabel.appendChild(input); box.appendChild(fieldLabel);
    }
    const modelLabel = document.createElement("label"); modelLabel.append(document.createTextNode("模型名"));
    const modelRow = document.createElement("div"); modelRow.className = "model-row";
    const model = document.createElement("select"); model.dataset.field = "model";
    const currentOption = document.createElement("option");
    currentOption.value = profile.model || "";
    currentOption.textContent = profile.model || "请先获取模型，或手动填写模型 ID";
    currentOption.selected = true;
    model.appendChild(currentOption);
    const fetchModels = document.createElement("button"); fetchModels.className = "secondary fetch-models"; fetchModels.type = "button"; fetchModels.textContent = "获取模型";
    modelRow.append(model, fetchModels); modelLabel.append(modelRow); box.appendChild(modelLabel);
    const result = document.createElement("p"); result.className = "profile-result"; result.hidden = true; box.appendChild(result);
    test.addEventListener("click", async () => {
      const profile = Object.fromEntries([["id", box.dataset.id], ...[...box.querySelectorAll("[data-field]")].map((input) => [input.dataset.field, input.value.trim()])]);
      test.disabled = true; result.hidden = false; result.classList.remove("error"); result.textContent = "正在测试 API…";
      try { const reply = await testApiProfile(profile); result.textContent = `连接成功：${reply.slice(0, 80)}`; }
      catch (error) { result.classList.add("error"); result.textContent = `测试失败：${error.message}`; }
      finally { test.disabled = false; }
    });
    fetchModels.addEventListener("click", async () => {
      const current = Object.fromEntries([["id", box.dataset.id], ...[...box.querySelectorAll("[data-field]")].map((input) => [input.dataset.field, input.value.trim()])]);
      fetchModels.disabled = true; result.hidden = false; result.classList.remove("error"); result.textContent = "正在获取模型列表…";
      try {
        const modelNames = await listApiModels(current);
        const selected = model.value;
        model.replaceChildren(...modelNames.map((name) => {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          option.selected = name === selected;
          return option;
        }));
        if (!modelNames.includes(selected)) model.value = modelNames[0];
        result.textContent = `已获取 ${modelNames.length} 个模型，请从下拉框选择。`;
      } catch (error) { result.classList.add("error"); result.textContent = `获取模型失败：${error.message}`; }
      finally { fetchModels.disabled = false; }
    });
    remove.addEventListener("click", () => { box.remove(); });
    profiles.appendChild(box);
  });
}

function readProfiles() {
  return [...profiles.querySelectorAll(".profile")].map((box) => Object.fromEntries([["id", box.dataset.id], ...[...box.querySelectorAll("[data-field]")].map((input) => [input.dataset.field, input.value.trim()])]));
}

async function load() {
  const settings = await getSettings();
  renderProfiles(settings.apiProfiles, settings.activeApiId);
  document.querySelector("#saveMode").value = settings.saveMode;
  document.querySelector("#saveSubdirectory").value = settings.saveSubdirectory;
  await updateFolderName();
  updateSaveMode();
}

function updateSaveMode() {
  const mode = document.querySelector("#saveMode").value;
  document.querySelector("#folderControls").hidden = mode !== "folder";
  document.querySelector("#subdirectoryControl").hidden = mode !== "subdirectory";
}

document.querySelector("#chooseFolder").addEventListener("click", async () => {
  if (!window.showDirectoryPicker) return setStatus("当前 Chrome 版本不支持本地文件夹选择，请升级 Chrome 后重试。");
  try {
    const folder = await window.showDirectoryPicker({ mode: "readwrite" });
    const permission = await folderPermission(folder, true);
    if (permission !== "granted") throw new Error("未获得文件夹读写授权。");
    await setExportFolder(folder);
    await updateFolderName();
    setStatus("本地保存文件夹已授权。");
  } catch (error) { if (error.name !== "AbortError") setStatus(`选择文件夹失败：${error.message}`); }
});
document.querySelector("#addApi").addEventListener("click", () => { const current = readProfiles(); const newId = id(); renderProfiles([...current, { id: newId, name: "新 API", baseUrl: "", apiKey: "", model: "" }], newId); });
document.querySelector("#saveMode").addEventListener("change", updateSaveMode);
document.querySelector("#save").addEventListener("click", async () => {
  const apiProfiles = readProfiles();
  for (const profile of apiProfiles) { if (!profile.baseUrl || !profile.model) return setStatus(`请完整填写 API：${profile.name || profile.id}`); try { new URL(profile.baseUrl); } catch { return setStatus(`API Base URL 格式不正确：${profile.name || profile.id}`); } }
  const activeApiId = profiles.querySelector("input[name=activeApi]:checked")?.closest(".profile")?.dataset.id || "";
  const settings = { apiProfiles, activeApiId, saveMode: document.querySelector("#saveMode").value, saveSubdirectory: document.querySelector("#saveSubdirectory").value.trim(), openAfterExport: false };
  await saveSettings(settings);
  setStatus("设置已保存在本机浏览器中。");
});
document.querySelector("#clear").addEventListener("click", async () => {
  await saveSettings(DEFAULT_SETTINGS);
  await clearExportFolder();
  await load();
  setStatus("配置已清除。");
});
load();
