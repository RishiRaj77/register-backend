const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const fs = require('fs').promises;
const path = require('path');

router.post('/generate-avatar', async (req, res) => {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_KEY,
      httpOptions: { apiVersion: 'v1beta' }
    });
    const { imageBase64, style } = req.body;

    if (!imageBase64 || imageBase64 === 'data:,' || imageBase64.length < 100) {
      return res.status(400).json({ error: "Image data is empty or invalid. Please try uploading again." });
    }

    // Ensure clean base64 — strip the data URL prefix
    const mimeMatch = imageBase64.match(/^data:([^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");

    if (!base64Data || base64Data.length < 50) {
      return res.status(400).json({ error: "Could not read image data. Please try a different image." });
    }

    // Read the style-specific prompt
    let stylePrompt = "";
    try {
      const promptPath = path.join(__dirname, '../prompts', `${style}.txt`);
      stylePrompt = await fs.readFile(promptPath, 'utf8');
    } catch (err) {
      stylePrompt = `Transform this person into a high-quality ${style} style avatar.`;
    }

    // Step 1: Use Gemini Vision to analyze the person's physical features
    console.log("Step 1: Analyzing photo with Gemini Vision...");
    let physicalDescription = "";
    try {
      const analysisPrompt = `Describe this person's appearance in 2-3 sentences for avatar creation. Include: gender, hair color & style, eye color, skin tone, distinctive features, and the EXACT clothing/outfit they are wearing.`;
      const analysisResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          role: 'user',
          parts: [
            { text: analysisPrompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }]
      });
      physicalDescription = analysisResponse.text.substring(0, 200);
      console.log("Gemini vision analysis done.");
    } catch (err) {
      console.warn("Gemini Vision failed, using fallback:", err.message);
      physicalDescription = `A person styled as a ${style} avatar.`;
    }

    // Step 2: Generate image with gemini-3.1-flash-image
    console.log("Step 2: Generating image with gemini-3.1-flash-image...");
    
    // Using standard prompt to avoid triggering safety blocks
    const generationPrompt = `Create an avatar based on this attached photo. 
Person's features: ${physicalDescription}
Style requested: ${stylePrompt}`;

    let imageResponse;
    try {
      imageResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-image",
      contents: [
        {
          role: 'user',
          parts: [
            { text: generationPrompt },
            { inlineData: { mimeType, data: base64Data } }
          ]
        }
      ]
    });
    } catch (err) {
      console.error("Gemini Image generation failed:", err);
      return res.status(500).json({ error: "Image generation failed: " + err.message });
    }

    let generatedImageBase64 = null;
    let personaText = `✨ Your ${style} avatar is ready!`;

    // Parse response exactly as requested, with safety checks to prevent crashes
    if (imageResponse && imageResponse.candidates && imageResponse.candidates.length > 0) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.text) {
          personaText = part.text;
        } else if (part.inlineData) {
          generatedImageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } else {
       console.log("Model response missing candidates. Full response:", JSON.stringify(imageResponse));
       return res.status(500).json({ error: "The AI model rejected the prompt or returned an empty image. Try a different photo." });
    }

    if (!generatedImageBase64) {
      return res.status(500).json({
        error: "Image generation model returned no image."
      });
    }

    console.log("Image generated successfully!");
    res.json({
      persona: personaText,
      generatedImage: generatedImageBase64
    });

  } catch (error) {
    console.error("Avatar generation Error:", error.message);
    res.status(500).json({ error: "Failed to generate image: " + error.message });
  }
});

module.exports = router;
