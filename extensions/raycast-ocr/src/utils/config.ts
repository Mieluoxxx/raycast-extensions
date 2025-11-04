/**
 * Configuration Management Tool
 * Reads and parses Raycast extension preference settings
 * Prioritizes reading user custom configuration from LocalStorage, falls back to extension preferences
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
 * Get user-configured OCR backend configuration
 * Prioritizes reading configuration from LocalStorage, falls back to extension preferences if not found
 * @returns OCR backend configuration object
 */
export async function getBackendConfig(): Promise<OCRBackendConfig> {
  // Try reading from LocalStorage
  const storedConfig = await LocalStorage.getItem<string>(CONFIG_STORAGE_KEY);

  if (storedConfig) {
    try {
      return JSON.parse(storedConfig) as OCRBackendConfig;
    } catch (error) {
      console.error("Failed to parse stored config:", error);
      // If parsing fails, continue with default configuration
    }
  }

  // Fall back to extension preferences
  const prefs = getPreferenceValues<Preferences>();
  const backendType = prefs.ocrBackend as OCRBackend;

  // Select corresponding configuration based on backend type
  if (backendType === OCRBackend.GEMINI_VLM) {
    return {
      type: backendType,
      apiKey: prefs.geminiApiKey?.trim(),
      apiEndpoint: prefs.geminiApiEndpoint?.trim() || "https://generativelanguage.googleapis.com/v1beta",
      model: prefs.geminiModel?.trim() || "gemini-2.5-flash",
      detail: "high", // Gemini doesn't use this field, but keep it for interface consistency
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
 * Save OCR backend configuration to LocalStorage
 * @param config OCR backend configuration object
 */
export async function saveBackendConfig(config: OCRBackendConfig): Promise<void> {
  await LocalStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}
