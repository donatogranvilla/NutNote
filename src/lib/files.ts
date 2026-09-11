import { convertFileSrc } from '@tauri-apps/api/core';
import { filesApi } from './api';

export async function uploadFile(sourcePath: string): Promise<{ path: string, url: string, filename: string }> {
  // Use our Rust command to copy the file to AppData
  const result = await filesApi.uploadFile(sourcePath);
  
  // convertFileSrc gives us a secure URL that the Tauri webview can load (asset:// protocol)
  const url = convertFileSrc(result.path);
  
  return {
    path: result.path,
    url,
    filename: result.filename
  };
}

export async function getFileUrl(filePath: string): Promise<string> {
  return convertFileSrc(filePath);
}
