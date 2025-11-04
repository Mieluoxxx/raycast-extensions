#!/usr/bin/env swift

import Vision
import AppKit
import Foundation

// MARK: - Main Entry Point
guard CommandLine.arguments.count > 1 else {
    printError(message: "Usage: vision-ocr.swift <image_path>")
    exit(1)
}

let imagePath = CommandLine.arguments[1]
recognizeText(from: imagePath)

// MARK: - Text Recognition Function
func recognizeText(from imagePath: String) {
    // Load image
    guard let image = NSImage(contentsOfFile: imagePath) else {
        printError(message: "Failed to load image from path: \(imagePath)")
        exit(1)
    }

    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        printError(message: "Failed to convert image to CGImage")
        exit(1)
    }

    // Create request handler
    let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])

    // Create text recognition request
    let request = VNRecognizeTextRequest { (request, error) in
        if let error = error {
            printError(message: "Vision API error: \(error.localizedDescription)")
            exit(1)
        }

        guard let observations = request.results as? [VNRecognizedTextObservation] else {
            printError(message: "No text recognition results")
            exit(1)
        }

        // Extract recognized text
        let recognizedStrings = observations.compactMap { observation in
            observation.topCandidates(1).first?.string
        }

        if recognizedStrings.isEmpty {
            printResult(text: "")
        } else {
            let fullText = recognizedStrings.joined(separator: "\n")
            printResult(text: fullText)
        }

        exit(0)
    }

    // Configure request for accuracy and language support
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US"]
    request.usesLanguageCorrection = true

    // Perform recognition
    do {
        try requestHandler.perform([request])
        // Keep the run loop alive for async callback
        RunLoop.main.run()
    } catch {
        printError(message: "Failed to perform text recognition: \(error.localizedDescription)")
        exit(1)
    }
}

// MARK: - Helper Functions
func printResult(text: String) {
    let result = ["success": true, "text": text] as [String : Any]
    if let jsonData = try? JSONSerialization.data(withJSONObject: result, options: []),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        print(jsonString)
    }
}

func printError(message: String) {
    let result = ["success": false, "error": message] as [String : Any]
    if let jsonData = try? JSONSerialization.data(withJSONObject: result, options: []),
       let jsonString = String(data: jsonData, encoding: .utf8) {
        fputs(jsonString + "\n", stderr)
    }
}
