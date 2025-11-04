/**
 * macOS Vision API 后端实现
 * 封装现有的 Swift Vision API 调用逻辑
 */

import { exec } from "child_process";
import { promisify } from "util";
import { access } from "fs/promises";
import path from "path";
import { environment } from "@raycast/api";
import { IOCRBackend, OCRError, OCRErrorType } from "./types";

const execAsync = promisify(exec);

interface VisionResult {
  success: boolean;
  text?: string;
  error?: string;
}

export class VisionAPIBackend implements IOCRBackend {
  async recognizeText(imagePath: string, _customPrompt?: string): Promise<string> {
    // Vision API doesn't support custom prompts, this parameter is intentionally unused
    // LLM backends will automatically handle math formula to LaTeX conversion, Vision API only does basic text recognition
    const scriptPath = path.join(environment.assetsPath, "scripts", "vision-ocr.swift");

    try {
      const { stdout, stderr } = await execAsync(`/usr/bin/swift "${scriptPath}" "${imagePath}"`, {
        timeout: 30000, // 30 second timeout for Swift compilation and Vision API processing
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large text output
      });

      // Log stderr for debugging if present
      if (stderr) {
        console.error("Swift script stderr:", stderr);
      }

      // Parse the JSON output
      const trimmedOutput = stdout.trim();
      if (!trimmedOutput) {
        throw new OCRError(OCRErrorType.UNKNOWN, "No output from OCR script. The script might have failed silently.");
      }

      const result: VisionResult = JSON.parse(trimmedOutput);

      if (!result.success) {
        throw new OCRError(OCRErrorType.UNKNOWN, result.error || "Unknown error occurred");
      }

      return result.text || "";
    } catch (error) {
      // Re-throw OCRError as-is
      if (error instanceof OCRError) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle timeout errors
        if (error.message.includes("ETIMEDOUT") || error.message.includes("SIGTERM")) {
          throw new OCRError(
            OCRErrorType.TIMEOUT,
            "OCR operation timed out after 30 seconds. This might happen on first run while Swift compiles the script."
          );
        }

        // Handle JSON parse errors
        if (error.message.includes("JSON") || error.message.includes("Unexpected token")) {
          throw new OCRError(OCRErrorType.UNKNOWN, "Failed to parse OCR result. The script output might be malformed.");
        }
      }

      // Generic error
      throw new OCRError(OCRErrorType.UNKNOWN, error instanceof Error ? error.message : "Unknown error");
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      const scriptPath = path.join(environment.assetsPath, "scripts", "vision-ocr.swift");
      await access(scriptPath);
      return true;
    } catch {
      return false;
    }
  }

  getName(): string {
    return "macOS Vision API";
  }
}
