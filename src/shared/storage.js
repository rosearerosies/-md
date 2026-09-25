export const DEFAULT_SETTINGS = {
  apiProfiles: [],
  activeApiId: "",
  saveMode: "folder",
  saveSubdirectory: "",
  openAfterExport: false
};

export async function getSettings() {
  const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
  if (!saved.apiProfiles?.length && saved.baseUrl && saved.model) {
    saved.apiProfiles = [{ id: crypto.randomUUID(), name: "旧配置", baseUrl: saved.baseUrl, apiKey: saved.apiKey || "", model: saved.model }];
    saved.activeApiId = saved.apiProfiles[0].id;
  }
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}
