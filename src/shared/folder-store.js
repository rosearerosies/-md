const DB_NAME = "page-md-local";
const STORE_NAME = "handles";
const FOLDER_KEY = "export-folder";

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export const getExportFolder = () => transaction("readonly", (store) => store.get(FOLDER_KEY));
export const setExportFolder = (handle) => transaction("readwrite", (store) => store.put(handle, FOLDER_KEY));
export const clearExportFolder = () => transaction("readwrite", (store) => store.delete(FOLDER_KEY));

export async function folderPermission(handle, request = false) {
  if (!handle) return "denied";
  const options = { mode: "readwrite" };
  const current = await handle.queryPermission(options);
  return current === "granted" || !request ? current : handle.requestPermission(options);
}

export async function writeToFolder(handle, name, content, type) {
  const parts = name.split("/").filter(Boolean);
  const fileName = parts.pop();
  let directory = handle;
  for (const part of parts) directory = await directory.getDirectoryHandle(part, { create: true });
  const file = await directory.getFileHandle(fileName, { create: true });
  const writable = await file.createWritable();
  await writable.write(new Blob([content], { type }));
  await writable.close();
}
