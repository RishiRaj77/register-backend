const key = "AIzaSyBa5I5W01ap_7MMb1vyAn6TtWNdpGT-uUY";

async function testKey() {
  try {
    console.log("Fetching models for key...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    
    if (data.models) {
      const imageModels = data.models.filter(m => 
        m.name.includes('imagen') || 
        m.name.includes('image') ||
        (m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateImages'))
      );
      
      console.log("\n=== IMAGE MODELS AVAILABLE ===");
      if (imageModels.length === 0) console.log("NONE");
      imageModels.forEach(m => {
        console.log(`- ${m.name}`);
        console.log(`  Methods: ${m.supportedGenerationMethods ? m.supportedGenerationMethods.join(', ') : 'unknown'}`);
      });
      
      const allFlash = data.models.filter(m => m.name.includes('flash') || m.name.includes('imagen'));
      console.log("\n=== FLASH/IMAGEN MODELS ===");
      allFlash.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log("Error listing models:", data);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

testKey();
