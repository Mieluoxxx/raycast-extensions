# Changelog

## [1.0.0] - 2025-11-04

### Added
- 🖼️ OCR from clipboard image functionality
- 📸 OCR from screenshot with area selection
- ⚙️ Visual configuration interface for OCR backend settings
- 🔄 Multi-backend support:
  - macOS Vision API (free, local, private)
  - OpenAI Vision API (GPT-4o)
  - Google Gemini Vision API (Gemini 2.5 Flash)
- 🌐 Multi-language text recognition support
- 🧮 Smart LaTeX formula recognition from mathematical expressions
- 📋 Automatic clipboard copying of recognition results
- 🔒 Privacy-first design with offline Vision API option
- ⚡ Fast recognition (2-5 seconds for Vision API)
- 💾 Independent backend configuration storage
- 🎨 User-friendly configuration UI with real-time validation

### Features
- Support for 50+ languages via Vision API
- Support for 100+ languages via OpenAI and Gemini
- Customizable API endpoints for third-party services
- Flexible image detail level settings for OpenAI backend
- Comprehensive error handling with user-friendly messages
- Type-safe backend architecture with factory pattern
