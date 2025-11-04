import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { environment } from "@raycast/api";

const execAsync = promisify(exec);

interface VisionResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Escape shell argument to prevent command injection
 */
function escapeShellArg(arg: string): string {
  return arg.replace(/'/g, "'\\''");
}

/**
 * Recognize text from an image using macOS Vision API
 * @param imagePath - Absolute path to the image file
 * @returns Recognized text
 * @throws Error if recognition fails
 */
export async function recognizeTextFromImage(imagePath: string): Promise<string> {
  // Use Raycast's assetsPath to get the correct path to the Swift script
  const scriptPath = path.join(environment.assetsPath, "scripts", "vision-ocr.swift");

  try {
    const { stdout, stderr } = await execAsync(
      `/usr/bin/swift '${escapeShellArg(scriptPath)}' '${escapeShellArg(imagePath)}'`,
      {
        timeout: 30000, // 30 second timeout for Swift compilation and Vision API processing
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large text output
      }
    );

    // Log stderr for debugging if present
    if (stderr) {
      console.error("Swift script stderr:", stderr);
    }

    // Parse the JSON output
    const trimmedOutput = stdout.trim();
    if (!trimmedOutput) {
      throw new Error("No output from OCR script. The script might have failed silently.");
    }

    const result: VisionResult = JSON.parse(trimmedOutput);

    if (!result.success) {
      throw new Error(result.error || "Unknown error occurred");
    }

    return result.text || "";
  } catch (error) {
    if (error instanceof Error) {
      // Handle timeout errors
      if (error.message.includes("ETIMEDOUT") || error.message.includes("SIGTERM")) {
        throw new Error(
          "OCR operation timed out after 30 seconds. This might happen on first run while Swift compiles the script."
        );
      }

      // Handle JSON parse errors
      if (error.message.includes("JSON") || error.message.includes("Unexpected token")) {
        throw new Error(`Failed to parse OCR result. Output was: ${error.message}`);
      }

      // Re-throw with additional context
      throw new Error(`OCR Error: ${error.message}`);
    }

    throw new Error("An unexpected error occurred during text recognition");
  }
}
