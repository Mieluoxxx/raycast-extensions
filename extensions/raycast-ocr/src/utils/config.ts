/**
 * 配置管理工具
 * 读取和解析 Raycast 扩展偏好设置
 * 优先从 LocalStorage 读取用户自定义配置，回退到扩展偏好设置
 */

import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { OCRBackend, OCRBackendConfig } from "../backends/types";

interface Preferences {
  ocrBackend: string;
  openaiApiKey?: string;
  openaiApiEndpoint?: string;
  openaiModel?: string;
  openaiDetail?: "auto" | "low" | "high";
  geminiApiKey?: string;
  geminiApiEndpoint?: string;
  geminiModel?: string;
}

const CONFIG_STORAGE_KEY = "ocr-backend-config";

/**
 * 获取用户配置的 OCR 后端配置
 * 优先读取 LocalStorage 中的配置，如果没有则读取扩展偏好设置
 * @returns OCR 后端配置对象
 */
export async function getBackendConfig(): Promise<OCRBackendConfig> {
  // 尝试从 LocalStorage 读取
  const storedConfig = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);

  if (storedConfig) {
    try {
      return JSON.parse(storedConfig) as OCRBackendConfig;
    } catch (error) {
      console.error("Failed to parse stored config:", error);
      // 如果解析失败，继续使用默认配置
    }
  }

  // 回退到扩展偏好设置
  const prefs = getPreferenceValues<Preferences>();
  const backendType = prefs.ocrBackend as OCRBackend;

  // 根据后端类型选择对应的配置
  if (backendType === OCRBackend.GEMINI_VLM) {
    return {
      type: backendType,
      apiKey: prefs.geminiApiKey?.trim(),
      apiEndpoint: prefs.geminiApiEndpoint?.trim() || "https://generativelanguage.googleapis.com/v1beta",
      model: prefs.geminiModel?.trim() || "gemini-2.5-flash",
      detail: "high", // Gemini 不使用此字段，但保持接口一致
    };
  } else if (backendType === OCRBackend.OPENAI_VLM) {
    return {
      type: backendType,
      apiKey: prefs.openaiApiKey?.trim(),
      apiEndpoint: prefs.openaiApiEndpoint?.trim() || "https://api.openai.com/v1",
      model: prefs.openaiModel?.trim() || "gpt-4o",
      detail: prefs.openaiDetail || "high",
    };
  } else {
    // Vision API
    return {
      type: backendType,
      apiKey: undefined,
      apiEndpoint: undefined,
      model: undefined,
      detail: undefined,
    };
  }
}

/**
 * 保存 OCR 后端配置到 LocalStorage
 * @param config OCR 后端配置对象
 */
export async function saveBackendConfig(config: OCRBackendConfig): Promise<void> {
  await LocalStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}
