import { Clipboard } from "@raycast/api";
import { unlink, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

/**
 * Get image from clipboard and save to temporary file
 * @returns Path to temporary image file, or null if no image in clipboard
 */
export async function getClipboardImagePath(): Promise<string | null> {
  const clipboardContent = await Clipboard.read();

  // Check if clipboard contains a file path
  if (clipboardContent.file) {
    const filePath = clipboardContent.file;

    // Verify it's an image file
    const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".heic"];
    const isImage = imageExtensions.some((ext) => filePath.toLowerCase().endsWith(ext));

    if (isImage) {
      return filePath;
    }
  }

  // If not a file, try to capture clipboard image using macOS utilities
  // This handles images copied from screenshots or browsers
  try {
    const tempPath = path.join("/tmp", `raycast-ocr-${randomUUID()}.png`);

    // Create a temporary AppleScript file to avoid shell escaping issues
    const scriptPath = path.join("/tmp", `ocr-script-${randomUUID()}.applescript`);
    const script = `set theFile to POSIX file "${tempPath}"
try
  set imageData to the clipboard as «class PNGf»
  set fileRef to open for access theFile with write permission
  write imageData to fileRef
  close access fileRef
  return "success"
on error
  return "no_image"
end try`;

    await writeFile(scriptPath, script);

    try {
      const { stdout } = await execFileAsync("osascript", [scriptPath]);

      if (stdout.trim() === "success") {
        await cleanupTempFile(scriptPath);
        return tempPath;
      }

      await cleanupTempFile(scriptPath);
      return null;
    } finally {
      // Ensure script is cleaned up
      try {
        await cleanupTempFile(scriptPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch {
    // No image in clipboard
    return null;
  }
}

/**
 * Take a screenshot and save to temporary file
 * @returns Path to screenshot file
 */
export async function takeScreenshot(): Promise<string> {
  const tempPath = path.join("/tmp", `raycast-ocr-screenshot-${randomUUID()}.png`);

  // Use macOS screencapture utility with execFile to avoid shell injection
  await execFileAsync("/usr/sbin/screencapture", ["-i", tempPath]);

  return tempPath;
}

/**
 * Clean up temporary file
 * @param filePath - Path to file to delete
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  // Only delete files in /tmp directory for safety
  if (!filePath.startsWith("/tmp/raycast-ocr")) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (error) {
    // Ignore errors during cleanup
    console.error(`Failed to cleanup temp file: ${filePath}`, error);
  }
}
