/**
 * Google Gemini Vision Language Model Backend Implementation
 * Supports Gemini API for image text recognition
 */

import { readFile } from "fs/promises";
import { IOCRBackend, OCRBackendConfig, OCRError, OCRErrorType } from "./types";
import { STANDARD_OCR_PROMPT } from "../config/prompts";

export class GeminiVLMBackend implements IOCRBackend {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;

  constructor(config: OCRBackendConfig) {
    this.apiKey = config.apiKey || "";
    this.apiEndpoint = config.apiEndpoint || "https://generativelanguage.googleapis.com/v1beta";
    this.model = config.model || "gemini-2.5-flash";
  }

  async recognizeText(imagePath: string, customPrompt?: string): Promise<string> {
    // Validate configuration
    if (!this.apiKey) {
      throw new OCRError(
        OCRErrorType.CONFIG_ERROR,
        "Gemini API Key is not configured. Please set it in extension preferences."
      );
    }

    try {
      // 1. Read and convert image
      const { base64Image, mimeType } = await this.prepareImage(imagePath);

      // 2. Determine the prompt to use
      const prompt = customPrompt || this.getOCRPrompt();

      // 3. Construct Gemini API request
      const url = `${this.apiEndpoint}/models/${this.model}:generateContent`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      // 3. Handle HTTP errors
      if (!response.ok) {
        await this.handleAPIError(response);
      }

      // 4. Parse response
      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      if (!text) {
        throw new OCRError(OCRErrorType.UNKNOWN, "No text content in API response");
      }

      return text.trim();
    } catch (error) {
      if (error instanceof OCRError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === "AbortError" || error.message.includes("timeout")) {
          throw new OCRError(OCRErrorType.TIMEOUT, "Request timed out after 60 seconds");
        }

        if (error.message.includes("fetch")) {
          throw new OCRError(OCRErrorType.NETWORK_ERROR, "Network error: " + error.message);
        }
      }

      throw new OCRError(OCRErrorType.UNKNOWN, error instanceof Error ? error.message : "Unknown error");
    }
  }

  /**
   * Prepare image: read, detect format, convert to base64
   */
  private async prepareImage(imagePath: string): Promise<{
    base64Image: string;
    mimeType: string;
  }> {
    try {
      const imageBuffer = await readFile(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = this.detectImageType(imagePath);

      return { base64Image, mimeType };
    } catch (error) {
      throw new OCRError(
        OCRErrorType.INVALID_IMAGE,
        "Failed to read image file: " + (error instanceof Error ? error.message : "Unknown error")
      );
    }
  }

  /**
   * Detect image MIME type
   */
  private detectImageType(imagePath: string): string {
    const ext = imagePath.toLowerCase().split(".").pop();
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
    };
    return mimeTypes[ext || "png"] || "image/png";
  }

  /**
   * Get default OCR prompt
   */
  private getOCRPrompt(): string {
    return STANDARD_OCR_PROMPT;
  }

  /**
   * Handle API error response
   */
  private async handleAPIError(response: Response): Promise<never> {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorType = OCRErrorType.UNKNOWN;

    try {
      const errorData = (await response.json()) as {
        error?: { message?: string };
      };
      errorMessage = errorData.error?.message || errorMessage;

      // Classify based on error information
      if (response.status === 400 && errorMessage.includes("API_KEY")) {
        errorType = OCRErrorType.API_KEY_INVALID;
        errorMessage = "Invalid API key. Please check your Gemini API key in settings.";
      } else if (response.status === 429) {
        errorType = OCRErrorType.QUOTA_EXCEEDED;
        errorMessage = "API quota exceeded or rate limit reached. Please try again later.";
      } else if (response.status >= 500) {
        errorType = OCRErrorType.NETWORK_ERROR;
        errorMessage = "Gemini server error. Please try again later.";
      }
    } catch {
      // Failed to parse error response, use default message
    }

    throw new OCRError(errorType, errorMessage);
  }

  async validateConfig(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    // Simple API key format validation (Gemini API keys start with AIza)
    return this.apiKey.startsWith("AIza") && this.apiKey.length > 30;
  }

  getName(): string {
    return "Google Gemini Vision";
  }
}
