/**
 * OpenAI Vision Language Model Backend Implementation
 * Supports OpenAI API and compatible third-party API endpoints
 */

import { readFile } from "fs/promises";
import { IOCRBackend, OCRBackendConfig, OCRError, OCRErrorType } from "./types";
import { STANDARD_OCR_PROMPT } from "../config/prompts";

export class OpenAIVLMBackend implements IOCRBackend {
  private apiKey: string;
  private apiEndpoint: string;
  private model: string;
  private detail: "auto" | "low" | "high";

  constructor(config: OCRBackendConfig) {
    this.apiKey = config.apiKey || "";
    this.apiEndpoint = config.apiEndpoint || "https://api.openai.com/v1";
    this.model = config.model || "gpt-4o";
    this.detail = config.detail || "high"; // High is recommended for OCR scenarios
  }

  async recognizeText(imagePath: string, customPrompt?: string): Promise<string> {
    // Validate configuration
    if (!this.apiKey) {
      throw new OCRError(
        OCRErrorType.CONFIG_ERROR,
        "OpenAI API Key is not configured. Please set it in extension preferences."
      );
    }

    try {
      // 1. Read and convert image
      const { base64Image, mimeType } = await this.prepareImage(imagePath);

      // 2. Determine the prompt to use
      const prompt = customPrompt || this.getOCRPrompt();

      // 3. Construct API request
      const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: this.detail,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0, // Improve consistency
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      // 4. Handle HTTP errors
      if (!response.ok) {
        await this.handleAPIError(response);
      }

      // 5. Parse response
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content || "";

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
      if (response.status === 401) {
        errorType = OCRErrorType.API_KEY_INVALID;
        errorMessage = "Invalid API key. Please check your OpenAI API key in settings.";
      } else if (response.status === 429) {
        errorType = OCRErrorType.QUOTA_EXCEEDED;
        errorMessage = "API quota exceeded or rate limit reached. Please try again later.";
      } else if (response.status >= 500) {
        errorType = OCRErrorType.NETWORK_ERROR;
        errorMessage = "OpenAI server error. Please try again later.";
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

    // Simple API key validation to avoid extra API calls
    // For official OpenAI endpoint, validate the sk- prefix
    // For third-party endpoints, accept any non-empty key with reasonable length
    const isOfficialEndpoint = this.apiEndpoint.includes("api.openai.com");

    if (isOfficialEndpoint) {
      return this.apiKey.startsWith("sk-") && this.apiKey.length > 20;
    } else {
      // Third-party endpoints may use different key formats
      return this.apiKey.length >= 10;
    }
  }

  getName(): string {
    return "OpenAI Vision";
  }
}
