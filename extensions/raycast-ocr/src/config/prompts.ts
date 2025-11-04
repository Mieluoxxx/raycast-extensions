/**
 * OCR Prompt Configuration
 * Intelligent text and mathematical formula recognition leveraging LLM capabilities
 */

/**
 * Enhanced OCR Prompt
 * Supports general text recognition + automatic conversion of mathematical formulas to LaTeX
 */
export const STANDARD_OCR_PROMPT = `Extract all text from this image accurately. If the image contains mathematical formulas, convert them to LaTeX code.

Requirements:
1. Preserve the original layout and line breaks
2. Support Chinese (Simplified/Traditional), English, and mixed text
3. Maintain formatting (spaces, indentation, tables if present)
4. IMPORTANT: Use appropriate punctuation based on the language:
   - For Chinese text: Use Chinese punctuation marks (。,、;:?!)
   - For English text: Use English punctuation marks (.,;:?!)
   - For mixed Chinese-English text: Use Chinese punctuation for Chinese sentences and English punctuation for English sentences

5. **Mathematical Formulas Handling**:
   - If you detect mathematical expressions, equations, or formulas, convert them to LaTeX
   - For inline formulas: wrap with $...$
   - For display/block formulas: wrap with $$...$$
   - Use standard LaTeX syntax: \\frac{}{}, \\sqrt{}, \\int, \\sum, etc.
   - Preserve formula structure and positioning within the text

6. Return ONLY the extracted text (with LaTeX for formulas) without any explanation or additional content
7. If no text is found, return an empty response

Please extract the text now:`;
