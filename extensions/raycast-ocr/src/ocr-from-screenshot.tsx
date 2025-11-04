import { Clipboard, showToast, Toast, showHUD, closeMainWindow } from "@raycast/api";
import { takeScreenshot, cleanupTempFile } from "./utils/clipboard";
import { getBackendConfig } from "./utils/config";
import { OCRBackendFactory } from "./backends/factory";
import { OCRError, OCRErrorType } from "./backends/types";
import { access } from "fs/promises";

export default async function Command() {
  let tempFilePath: string | null = null;

  try {
    // Show instruction toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Please select screen area to recognize...",
      message: "Press ESC to cancel",
    });

    // Hide Raycast window before taking screenshot to avoid capturing it
    await closeMainWindow();

    // Wait a bit for the window to close smoothly
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Take screenshot
    tempFilePath = await takeScreenshot();

    // Check if user cancelled (file doesn't exist)
    try {
      await access(tempFilePath);
    } catch {
      await showHUD("Screenshot cancelled");
      return;
    }

    // Show recognizing toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Recognizing text from screenshot...",
    });

    // Create backend instance
    const config = await getBackendConfig();
    const backend = OCRBackendFactory.create(config);

    // Recognize text
    const recognizedText = await backend.recognizeText(tempFilePath);

    if (!recognizedText || recognizedText.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No text recognized",
        message: "The screenshot may not contain text, or the text is not clear enough",
      });
      return;
    }

    // Copy to clipboard
    await Clipboard.copy(recognizedText);

    // Show success message with preview
    const preview = recognizedText.length > 100 ? recognizedText.substring(0, 100) + "..." : recognizedText;

    await showHUD(`✓ Copied recognition result: ${preview}`);
  } catch (error) {
    console.error("OCR Error:", error);

    // Don't show error if user cancelled
    if (error instanceof Error && error.message.includes("cancelled")) {
      return;
    }

    await handleOCRError(error);
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      await cleanupTempFile(tempFilePath);
    }
  }
}

/**
 * Unified error handling
 */
async function handleOCRError(error: unknown) {
  if (error instanceof OCRError) {
    switch (error.type) {
      case OCRErrorType.API_KEY_INVALID:
        await showToast({
          style: Toast.Style.Failure,
          title: "API Key Error",
          message: "Please configure a valid API Key in extension settings",
        });
        break;

      case OCRErrorType.QUOTA_EXCEEDED:
        await showToast({
          style: Toast.Style.Failure,
          title: "Quota Exceeded",
          message: "API quota exhausted or rate limit reached, please try again later",
        });
        break;

      case OCRErrorType.TIMEOUT:
        await showToast({
          style: Toast.Style.Failure,
          title: "Request Timeout",
          message: "OCR processing took too long, try using a smaller image",
        });
        break;

      case OCRErrorType.NETWORK_ERROR:
        await showToast({
          style: Toast.Style.Failure,
          title: "Network Error",
          message: "Unable to connect to API service, please check your connection",
        });
        break;

      case OCRErrorType.CONFIG_ERROR:
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Error",
          message: error.message,
        });
        break;

      case OCRErrorType.INVALID_IMAGE:
        await showToast({
          style: Toast.Style.Failure,
          title: "Image Error",
          message: error.message,
        });
        break;

      default:
        await showToast({
          style: Toast.Style.Failure,
          title: "Recognition Failed",
          message: error.message,
        });
    }
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Recognition Failed",
      message: error instanceof Error ? error.message : "Unknown error, please try again",
    });
  }
}
