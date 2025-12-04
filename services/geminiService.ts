
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProjectContext, CreativeFormat, AdCopy, CreativeConcept, GenResult } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- UTILS ---

function extractJSON<T>(text: string): T {
  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.error("JSON Parse Error", e, text);
    return {} as T;
  }
}

const VISUAL_STYLES = [
  "Shot on 35mm film, Fujifilm Pro 400H, grainy texture, nostalgic",
  "High-end studio photography, softbox lighting, sharp focus, 8k resolution",
  "Gen-Z aesthetic, flash photography, direct flash, high contrast, candid",
  "Cinematic lighting, golden hour, shallow depth of field, bokeh background",
  "Clean minimalist product photography, bright airy lighting, pastel tones"
];

const getRandomStyle = () => VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];

// --- FORMAT DEFINITIONS & STRUCTURES ---

// Used by "Creative Director" (Concept Agent) to understand what to build
const FORMAT_DEFINITIONS: Record<string, string> = {
  [CreativeFormat.POV_HANDS]: "First-person view looking down at hands using the product.",
  [CreativeFormat.US_VS_THEM]: "Split screen comparison. Left side = bad/struggle, Right side = good/solution.",
  [CreativeFormat.COLLAGE_SCRAPBOOK]: "Chaotic mix of photos, stickers, and paper cutouts.",
  [CreativeFormat.REELS_THUMBNAIL]: "Vertical image with a catchy 'Hook Title' overlay and a shocked/expressive face.",
  [CreativeFormat.GMAIL_UX]: "Email interface showing subject line and sender.",
  [CreativeFormat.REDDIT_THREAD]: "Reddit dark mode thread with title and upvotes.",
  [CreativeFormat.MS_PAINT]: "Badly drawn, pixelated MS Paint drawing.",
  [CreativeFormat.MEME]: "Impact font top/bottom text over a funny image.",
  [CreativeFormat.DM_NOTIFICATION]: "Blurred lifestyle background with an Instagram DM notification overlay.",
  [CreativeFormat.TWITTER_REPOST]: "Social media text post styled like Twitter/X.",
  [CreativeFormat.PHONE_NOTES]: "iPhone Notes app text list.",
  [CreativeFormat.GRAPH_CHART]: "A visual chart or graph showing improvement.",
  [CreativeFormat.BEFORE_AFTER]: "Split screen: Before state vs After state.",
  [CreativeFormat.SOCIAL_COMMENT_STACK]: "Floating social media comments.",
  [CreativeFormat.BENEFIT_POINTERS]: "Product shot with lines pointing to features.",
  [CreativeFormat.STICKY_NOTE_REALISM]: "Handwritten sticky note.",
  [CreativeFormat.HANDHELD_TWEET]: "Hand holding phone showing a tweet.",
  [CreativeFormat.SEARCH_BAR]: "Google search bar with query.",
  [CreativeFormat.BIG_FONT]: "Large bold typography.",
  [CreativeFormat.UGLY_VISUAL]: "Flash photography, raw, unpolished.",
  [CreativeFormat.LONG_TEXT]: "Long text message block.",
  [CreativeFormat.CARTOON]: "Flat vector illustration.",
  [CreativeFormat.WHITEBOARD]: "Hand drawing diagram on whiteboard."
};

// Used by "Visualizer" (Image Gen Agent) for Strict Layout Control
const FORMAT_STRUCTURES: Record<string, string> = {
  [CreativeFormat.GMAIL_UX]: "A close-up screenshot of a Gmail inbox interface on a desktop screen. The email subject line is clearly visible as a catchy subject related to '{{angle}}'. The sender name is '{{productName}}'. Clean white UI, unread email bold font.",
  [CreativeFormat.REDDIT_THREAD]: "A dark-mode Reddit mobile app interface screenshot. A text post is visible. The thread title reads an engaging question or confession about '{{angle}}'. Upvote buttons and comment icons are visible below. Authentic UI details.",
  [CreativeFormat.MS_PAINT]: "A nostalgic Windows 95 / XP computer screen showing the MS Paint application. A crude, intentionally amateur drawing related to {{productName}} is on the canvas. Retro aesthetic, pixelated icons.",
  [CreativeFormat.MEME]: "A classic internet meme format image. Top text and bottom text format. The visual is funny and relates to {{visualScene}}. High contrast white impact font with black outline. Text relates to the struggle of '{{angle}}'.",
  [CreativeFormat.DM_NOTIFICATION]: "A blurred aesthetic lifestyle background ({{visualScene}}). In the center, a clear iOS lock screen notification banner pops up. The notification is from 'Instagram', message reads a short, intriguing DM related to: '{{angle}}'. Glassmorphism effect.",
  [CreativeFormat.REELS_THUMBNAIL]: "A high-energy YouTube/Reels thumbnail style. A person making a shocked or expressive face looking at {{productName}}. Large, bold text overlay presents a short 3-word hook about '{{angle}}' (DO NOT just write the angle name). High saturation, expressive, clickbait style.",
  [CreativeFormat.BIG_FONT]: "A solid color background with massive, bold typography filling the frame. The text reads a short, punchy headline about: '{{angle}}'. Minimalist, brutalist design. High contrast.",
  [CreativeFormat.UGLY_VISUAL]: "A raw, flash-photography photo of a messy or 'ugly' situation related to the concept of {{angle}}. Intentionally unpolished, amateur aesthetic. High contrast, direct flash.",
  [CreativeFormat.LONG_TEXT]: "A screenshot of a long text message bubble on a smartphone. The header text relates to '{{angle}}'. Wall of text, authentic storytelling vibe. Blue or Green bubble.",
  [CreativeFormat.CARTOON]: "A simple flat vector cartoon illustration. Characters are discussing {{productName}}. A speech bubble clearly reads a short line of dialogue about: '{{angle}}'.",
  [CreativeFormat.WHITEBOARD]: "A photo of a whiteboard with a hand drawing a diagram explaining the concept of {{angle}}. Marker texture, scribbles, 'class is in session' vibe.",
  [CreativeFormat.SEARCH_BAR]: "A close-up of a Google Search bar on a clean white background. The text typed in the search bar is a common user query about: '{{angle}}'. The cursor is blinking. Minimalist UI.",
  [CreativeFormat.GRAPH_CHART]: "A professional data visualization chart. The X-axis represents time, Y-axis represents 'Results'. A line goes up dramatically. Labels relate to {{productName}}. Chart Title: '{{angle}}'. Clean vector style.",
  [CreativeFormat.TIMELINE_JOURNEY]: "A visual timeline infographic. Point A is 'Before', Point B is 'After'. The journey shows the transformation using {{productName}}. Text label highlights the phase: '{{angle}}'.",
  [CreativeFormat.CHAT_CONVERSATION]: "A screenshot of a smartphone chat conversation. Green/Blue bubbles. The last message sent reads a natural text about: '{{angle}}'. Context: {{visualScene}}.",
  [CreativeFormat.REMINDER_NOTIF]: "A close-up of a smartphone lock screen showing a 'Reminder' app notification. The reminder text is a short, urgent note about: '{{angle}}'. Background is a blurred wallpaper of {{visualScene}}.",
  [CreativeFormat.ANNOTATED_PRODUCT]: "A high-end product shot of {{productName}}. White lines and text labels point to key features. The main label highlights the benefit of: '{{angle}}'. Tech review style.",
  [CreativeFormat.BEFORE_AFTER]: "A split composition. Left side shows a problem state ({{visualScene}}). Right side shows the solution state with {{productName}}. Text overlay 'BEFORE' and 'AFTER'.",
  [CreativeFormat.UGC_MIRROR]: "A mirror selfie shot. A person holding {{productName}} while looking in the mirror. Phone covers face slightly. Casual, authentic influencer vibe. Context: {{angle}}.",
  [CreativeFormat.AESTHETIC_MINIMAL]: "A minimalist, beige-aesthetic shot of {{productName}} on a marble table. Hard shadows, natural light. Text overlay in thin serif font reads a short aesthetic word related to: '{{angle}}'.",
  [CreativeFormat.CHECKLIST_TODO]: "A close-up of a paper notebook or whiteboard with a handwritten checklist. The title relates to '{{angle}}'. Items are checked off. Focus on the handwriting and texture.",
  [CreativeFormat.COLLAGE_SCRAPBOOK]: "A chaotic aesthetic scrapbook collage. Cutout photos of {{productName}}, handwritten notes about '{{angle}}', stickers, and tape textures. Mixed media art style.",
  [CreativeFormat.STICKY_NOTE_REALISM]: "A real yellow post-it sticky note stuck on a surface. Handwritten black marker text on the note reads a reminder about: '{{angle}}'. Sharp focus on the text, realistic paper texture, soft shadows.",
  [CreativeFormat.SOCIAL_COMMENT_STACK]: "A graphic design showing floating social media comment bubbles on a clean background. Top comment: 'Highly recommended!'. Middle comment reads an enthusiastic review about: '{{angle}}'. Bottom comment: 'Booking mine now!'. Clean UI, sharp text, modern aesthetic.",
  [CreativeFormat.HANDHELD_TWEET]: "A photorealistic close-up POV shot of a hand holding a modern smartphone. On the screen, a social media post is clearly visible. The text is a short tweet about: '{{angle}}'. The background is blurred {{visualScene}}. High resolution, screen reflection, authentic UI.",
  [CreativeFormat.TWITTER_REPOST]: "A photorealistic close-up POV shot of a hand holding a modern smartphone. On the screen, a social media post is clearly visible. The text is a short tweet about: '{{angle}}'. The background is blurred {{visualScene}}. High resolution, screen reflection, authentic UI.",
  [CreativeFormat.PHONE_NOTES]: "A close-up screenshot of the Apple Notes app UI on an iPhone. The text typed in the note is a header about: '{{angle}}'. The background is the standard paper texture of the Notes app. At the bottom, a checklist related to {{productName}}. Photorealistic screen capture.",
  [CreativeFormat.US_VS_THEM]: "A split screen comparison image. Left side (Them): Cloudy, sad, messy, labeled 'Them'. Right side (Us): Bright, happy, organized, labeled 'Us'. The subject is related to: {{productName}}. Comparison point relates to: {{angle}}.",
  [CreativeFormat.BENEFIT_POINTERS]: "A high-quality product photography shot of {{productName}} (or the main subject of the service). Clean background. There are sleek, modern graphic lines pointing to 3 key features of the subject. The style is 'Anatomy Breakdown'. (Note: The pointers are the main visual hook).",
  [CreativeFormat.STORY_POLL]: "An Instagram Story interface. Background is {{visualScene}}. A 'Poll' sticker is overlaid. Question asks about: '{{angle}}'. Options: 'Yes' / 'No'.",
  [CreativeFormat.STORY_QNA]: "An Instagram Story interface. Background is {{visualScene}}. A 'Q&A' box sticker is overlaid. Question asked relates to: '{{angle}}'.",
};

// --- ANALYSIS FUNCTIONS ---

export const analyzeLandingPageContext = async (markdown: string): Promise<ProjectContext> => {
  const model = "gemini-2.5-flash";
  const response = await ai.models.generateContent({
    model,
    contents: `You are a Data Analyst for a Direct Response Agency. 
    Analyze the following raw data (Landing Page Content) to extract the foundational truths.
    
    RAW DATA:
    ${markdown.substring(0, 30000)}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          productDescription: { type: Type.STRING, description: "A punchy, benefit-driven 1-sentence value prop." },
          targetAudience: { type: Type.STRING, description: "Specific demographics and psychographics." },
          targetCountry: { type: Type.STRING },
          brandVoice: { type: Type.STRING },
          offer: { type: Type.STRING, description: "The primary hook or deal found on the page." }
        },
        required: ["productName", "productDescription", "targetAudience"]
      }
    }
  });

  const data = extractJSON<Partial<ProjectContext>>(response.text || "{}");
  
  return {
    productName: data.productName || "Unknown Product",
    productDescription: data.productDescription || "",
    targetAudience: data.targetAudience || "General Audience",
    targetCountry: data.targetCountry || "USA",
    brandVoice: data.brandVoice || "Professional",
    offer: data.offer || "Shop Now",
    landingPageUrl: "" 
  } as ProjectContext;
};

export const analyzeImageContext = async (base64Image: string): Promise<ProjectContext> => {
  const base64Data = base64Image.split(',')[1] || base64Image;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { inlineData: { mimeType: "image/jpeg", data: base64Data } },
        { text: "Analyze this product image. Extract the Product Name (if visible, otherwise guess), a compelling Description, and the likely Target Audience." }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          productDescription: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          targetCountry: { type: Type.STRING }
        },
        required: ["productName", "productDescription"]
      }
    }
  });

  const data = extractJSON<Partial<ProjectContext>>(response.text || "{}");

  return {
    productName: data.productName || "Analyzed Product",
    productDescription: data.productDescription || "A revolutionary product.",
    targetAudience: data.targetAudience || "General Audience",
    targetCountry: "USA", 
    brandVoice: "Visual & Aesthetic",
    offer: "Check it out"
  } as ProjectContext;
};

// --- GENERATION FUNCTIONS ---

export const generatePersonas = async (project: ProjectContext): Promise<GenResult<any[]>> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    You are a Consumer Psychologist specializing in ${project.targetCountry || "the target market"}.
    
    PRODUCT CONTEXT:
    Product: ${project.productName}
    Details: ${project.productDescription}
    
    TASK:
    Define 3 distinct "Avatars" based on their IDENTITY and DEEP PSYCHOLOGICAL NEEDS.
    Do not just list demographics. List who they *are* vs who they *want to be* (The Gap).

    We are looking for:
    1. The Skeptic / Logic Buyer (Identity: "I am smart, I research, I don't get fooled.")
    2. The Status / Aspirer (Identity: "I want to be admired/successful/beautiful.")
    3. The Anxious / Urgent Solver (Identity: "I need safety/certainty/speed.")

    *Cultural nuance mandatory for ${project.targetCountry}. If Indonesia, mention specific local behaviors (e.g., 'Kaum Mendang-Mending', 'Social Climber').*
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            profile: { type: Type.STRING, description: "Demographics + Identity Statement" },
            motivation: { type: Type.STRING, description: "The 'Gap' between current self and desired self." },
            deepFear: { type: Type.STRING, description: "What are they afraid of losing?" },
          },
          required: ["name", "profile", "motivation"]
        }
      }
    }
  });

  return {
    data: extractJSON(response.text || "[]"),
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0
  };
};

export const generateAngles = async (project: ProjectContext, personaName: string, personaMotivation: string): Promise<GenResult<any[]>> => {
  const model = "gemini-2.5-flash";
  const prompt = `
    You are a Direct Response Strategist applying the "Andromeda Testing Playbook".
    
    CONTEXT:
    Product: ${project.productName}
    Persona: ${personaName}
    Deep Motivation: ${personaMotivation}
    Target Country: ${project.targetCountry}
    
    TASK:
    1. "Gather Data": Brainstorm 10 raw angles/hooks.
    2. "Prioritize": Rank by Market Size, Urgency, Differentiation.
    3. "Assign Tier": Assign a Testing Tier to each angle based on its nature:
       - TIER 1 (Concept Isolation): Big, bold, new ideas. High risk/reward.
       - TIER 2 (Persona Isolation): Specifically tailored to this persona's fear/desire.
       - TIER 3 (Sprint Isolation): A simple iteration or direct offer.
    
    OUTPUT:
    Return ONLY the Top 3 High-Potential Insights.
    
    *For ${project.targetCountry}: Ensure the angles fit the local culture.*
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING, description: "The core Hook/Angle name" },
            painPoint: { type: Type.STRING, description: "The specific problem or insight" },
            psychologicalTrigger: { type: Type.STRING, description: "The principle used (e.g. Loss Aversion)" },
            testingTier: { type: Type.STRING, description: "TIER 1, TIER 2, or TIER 3" },
            hook: { type: Type.STRING, description: "The opening line or concept" }
          },
          required: ["headline", "painPoint", "psychologicalTrigger", "testingTier"]
        }
      }
    }
  });

  return {
    data: extractJSON(response.text || "[]"),
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0
  };
};

export const generateCreativeConcept = async (
  project: ProjectContext, 
  personaName: string, 
  angle: string, 
  format: CreativeFormat
): Promise<GenResult<CreativeConcept>> => {
  const model = "gemini-2.5-flash";
  const awareness = project.marketAwareness || "Problem Aware";
  
  let awarenessInstruction = "";
  if (awareness.includes("Unaware") || awareness.includes("Problem")) {
      awarenessInstruction = `AWARENESS: LOW. Focus on SYMPTOM. Use Pattern Interrupt.`;
  } else if (awareness.includes("Solution")) {
      awarenessInstruction = `AWARENESS: MEDIUM. Focus on MECHANISM and SOCIAL PROOF.`;
  } else {
      awarenessInstruction = `AWARENESS: HIGH. Focus on URGENCY and OFFER.`;
  }

  const formatDefinitionsText = Object.entries(FORMAT_DEFINITIONS)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const prompt = `
    # Role: Creative Director (Focus: Message & Imagery Congruency)

    **THE GOLDEN RULE OF CONGRUENCE:**
    Ads fail when the image matches the *product* but ignores the *message*.
    
    *   **Bad Example:** Headline: "Stretchiest Jeans ever" -> Image: Sexy model standing still (Fail).
    *   **Good Example:** Headline: "Stretchiest Jeans ever" -> Image: Close up of fabric stretching 2x wide (Pass).

    **FORMAT DEFINITIONS (Use this to guide the Technical Prompt):**
    ${formatDefinitionsText}
    
    **INPUTS:**
    Product: ${project.productName}
    Winning Insight (The Message): ${angle}
    Persona: ${personaName}
    Format: ${format}
    Context: ${project.targetCountry}
    ${awarenessInstruction}
    
    **TASK:**
    Create a concept where the VISUAL **proves** the HEADLINE.
    
    **OUTPUT REQUIREMENTS (JSON):**

    **1. Congruence Rationale:**
    Explain WHY this image matches this specific headline. "The headline promises X, so the image shows X happening."

    **2. TECHNICAL PROMPT (technicalPrompt):**
    A STRICT prompt for the Image Generator. 
    *   If format is text-heavy (e.g. Twitter, Notes), describe the BACKGROUND VIBE and UI details.
    *   If format is visual (e.g. Photography), the SUBJECT ACTION must match the HOOK.
    
    **3. SCRIPT DIRECTION (copyAngle):**
    Instructions for the copywriter.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visualScene: { type: Type.STRING, description: "Director's Note" },
          visualStyle: { type: Type.STRING, description: "Aesthetic vibe" },
          technicalPrompt: { type: Type.STRING, description: "Strict prompt for Image Gen" },
          copyAngle: { type: Type.STRING, description: "Strategy for the copywriter" },
          rationale: { type: Type.STRING, description: "Strategic Hypothesis" },
          congruenceRationale: { type: Type.STRING, description: "Why the Image proves the Text (The Jeans Rule)" },
          hookComponent: { type: Type.STRING, description: "The Visual Hook element" },
          bodyComponent: { type: Type.STRING, description: "The Core Argument element" },
          ctaComponent: { type: Type.STRING, description: "The Call to Action element" }
        },
        required: ["visualScene", "visualStyle", "technicalPrompt", "copyAngle", "rationale", "congruenceRationale"]
      }
    }
  });

  return {
    data: extractJSON(response.text || "{}"),
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0
  };
};

export const generateAdCopy = async (
  project: ProjectContext, 
  persona: any, 
  concept: CreativeConcept
): Promise<GenResult<AdCopy>> => {
  const model = "gemini-2.5-flash";
  const isIndo = project.targetCountry?.toLowerCase().includes("indonesia");
  const languageInstruction = isIndo
    ? "Write in Bahasa Indonesia. Use 'Bahasa Marketing' (mix of persuasive & conversational). Use local power words (e.g., 'Slot Terbatas', 'Best Seller', 'Gak Nyesel')."
    : "Write in English (or native language). Use persuasive Direct Response copy.";

  const prompt = `
    # Role: Senior Direct Response Copywriter (Static Ad Specialist)

    **MANDATORY INSTRUCTION:**
    ${languageInstruction}

    **THE HEADLINE CONTEXT LIBRARY (RULES):**
    1.  **Assume No One Knows You:** Treat the audience as COLD. Do not be vague. "I feel new" (BAD) vs "Bye-Bye Bloating" (GOOD).
    2.  **Clear > Clever:** Clarity drives conversions. No puns. No jargon. If they have to think, you lose.
    3.  **The "So That" Test (Transformation > Feature):** 
        *   Feature: "1000mAh Battery" (Boring).
        *   Transformation: "Listen to music for 48 hours straight" (Winner).
        *   *Rule:* Sell the AFTER state.
    4.  **Call Out the Audience/Pain:** Flag down the user immediately.
        *   "For Busy Moms..."
        *   "Knee Pain keeping you up?"
        *   "The last backpack a Digital Nomad will need."
    5.  **Scannability:** Under 7 words. High contrast thought.
    6.  **Visual Hierarchy:** The headline MUST match the image scene described below.

    **STRATEGY CONTEXT:**
    Product: ${project.productName}
    Offer: ${project.offer}
    Target: ${persona.name}
    
    **CONGRUENCE CONTEXT (IMAGE SCENE):**
    Visual Scene: "${concept.visualScene}"
    Rationale: "${concept.congruenceRationale}"
    
    **TASK:**
    Write the ad copy applying the rules above.

    **OUTPUT:**
    1. Primary Text: The main caption. Match the tone to the identity of the persona.
    2. Headline: Apply the "So That" test. Max 7 words. MUST be congruent with the Visual Scene.
    3. CTA: Clear instruction.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primaryText: { type: Type.STRING },
          headline: { type: Type.STRING },
          cta: { type: Type.STRING }
        },
        required: ["primaryText", "headline", "cta"]
      }
    }
  });

  return {
    data: extractJSON(response.text || "{}"),
    inputTokens: response.usageMetadata?.promptTokenCount || 0,
    outputTokens: response.usageMetadata?.candidatesTokenCount || 0
  };
};

export const checkAdCompliance = async (adCopy: AdCopy): Promise<string> => {
  const model = "gemini-2.5-flash";
  const response = await ai.models.generateContent({
    model,
    contents: `Check this Ad Copy for policy violations. If safe, return "SAFE".\nHeadline: ${adCopy.headline}\nText: ${adCopy.primaryText}`,
  });
  return response.text || "SAFE";
};

// --- IMAGE GENERATION (NANO BANANA) ---

export const generateCreativeImage = async (
  project: ProjectContext,
  personaName: string,
  angle: string,
  format: CreativeFormat,
  visualScene: string,
  visualStyle: string,
  technicalPrompt: string,
  aspectRatio: string = "1:1"
): Promise<GenResult<string | null>> => {
  
  const model = "gemini-2.5-flash-image";
  const isIndo = project.targetCountry?.toLowerCase().includes("indonesia");
  const lowerDesc = project.productDescription.toLowerCase();
  
  const isService = lowerDesc.includes("studio") || lowerDesc.includes("service") || lowerDesc.includes("jasa") || lowerDesc.includes("photography") || lowerDesc.includes("clinic");
  
  let culturePrompt = "";
  if (isIndo) {
     culturePrompt = " Indonesian aesthetic, Asian features, localized environment.";
     if (lowerDesc.includes("graduation") || lowerDesc.includes("wisuda")) {
         culturePrompt += " Young Indonesian university student wearing a black graduation toga with university sash/selempang (Indonesian style), holding a tube or bouquet. Authentic Indonesian look (hijab optional but common).";
     }
  }

  const visualEnhancers = "Photorealistic, 8k resolution, highly detailed, shot on 35mm lens, depth of field, natural lighting.";
  const contextInjection = `(Context: The image must match this headline: "${angle}").`;

  let finalPrompt = "";
  
  if (FORMAT_STRUCTURES[format]) {
      const sceneToUse = (technicalPrompt && technicalPrompt.length > 20) ? technicalPrompt : visualScene;

      finalPrompt = FORMAT_STRUCTURES[format]
        .replace(/{{angle}}/g, angle)
        .replace(/{{productName}}/g, project.productName)
        .replace(/{{visualScene}}/g, sceneToUse); 
      
      finalPrompt += ` ${visualEnhancers} ${culturePrompt}`;
  } 
  // Allow direct technicalPrompt pass-through for GEN Z CAROUSELS (handled by logic below)
  else if (
      format === CreativeFormat.CAROUSEL_REAL_STORY || 
      format === CreativeFormat.CAROUSEL_EDUCATIONAL || 
      format === CreativeFormat.CAROUSEL_TESTIMONIAL
  ) {
      finalPrompt = `${technicalPrompt}. ${visualEnhancers} ${culturePrompt}`;
  }
  else {
     if (technicalPrompt && technicalPrompt.length > 20) {
         finalPrompt = `${contextInjection} ${technicalPrompt}. ${visualEnhancers} ${culturePrompt}`;
     } 
     else if (isService) {
         finalPrompt = `${contextInjection} ${visualScene}. (Show the person experiencing the result/service). ${culturePrompt} ${visualEnhancers}.`;
     }
     else {
         finalPrompt = `${contextInjection} ${visualScene}. Style: ${visualStyle || getRandomStyle()}. ${visualEnhancers} ${culturePrompt}`;
     }
  }

  const parts: any[] = [{ text: finalPrompt }];
  
  if (project.productReferenceImage) {
      const base64Data = project.productReferenceImage.split(',')[1] || project.productReferenceImage;
      parts.unshift({
          inlineData: { mimeType: "image/png", data: base64Data }
      });
      parts.push({ text: "Use the product/subject in the provided image as the reference. Maintain brand colors and visual identity." });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { imageConfig: { aspectRatio: aspectRatio === "1:1" ? "1:1" : "9:16" } }
    });

    let imageUrl: string | null = null;
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                break;
            }
        }
    }
    return {
      data: imageUrl,
      inputTokens: response.usageMetadata?.promptTokenCount || 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount || 0
    };
  } catch (error) {
    console.error("Image Gen Error", error);
    return { data: null, inputTokens: 0, outputTokens: 0 };
  }
};

export const generateCarouselSlides = async (
  project: ProjectContext,
  format: CreativeFormat,
  angle: string,
  visualScene: string,
  visualStyle: string,
  technicalPrompt: string
): Promise<GenResult<{images: string[], captions: string[]}>> => {
    const slides: string[] = [];
    const captions: string[] = [];
    let totalInput = 0;
    let totalOutput = 0;

    // --- GEN Z UGC CAROUSEL WORKFLOW ---
    if (format === CreativeFormat.CAROUSEL_REAL_STORY) {
      const genZPrompt = `
        ## Role
        You are a **UGC Carousel Concept, Caption, and Visual Shot Generator**.
        Your responsibility is to create creator-style, Gen-Z-inspired carousels made of **5 cohesive images**, each with a matching caption. Everything should feel cozy, authentic, aesthetic, and subtly tied to the product in a natural way.

        ## Task Requirements
        Inputs:
        * Product Name: ${project.productName}
        * Product Description: ${project.productDescription}
        * Key Theme/Angle: ${angle}

        ## Creative Framework (Gen Z Style)
        *   **IMAGE 1 (Hook/Face):** Creator moment, 0.5x wide selfie/mirror. Low-res, warm. Caption 1: Hook, personal insight.
        *   **IMAGES 2-4 (POV B-roll):** POV/Lifestyle shots (No face). Props: laptop, candle, coffee. Image 4 must have product. Captions 2-4: Relatable thoughts.
        *   **IMAGE 5 (Closer):** Soft, comforting aesthetic (No face). Caption 5: Affirming message.

        ## Caption Style Rules
        *   Write all captions in **lowercase**, except Product Name.
        *   Tone: casual, friendly, warm, lightly introspective.

        ## Output Format
        Return a **single JSON object**:
        {
          "idea": "Theme description",
          "image1": "Description for image 1",
          "image2": "Description for image 2",
          "image3": "Description for image 3",
          "image4": "Description for image 4",
          "image5": "Description for image 5",
          "caption1": "Caption text for slide 1",
          "caption2": "Caption text for slide 2",
          "caption3": "Caption text for slide 3",
          "caption4": "Caption text for slide 4",
          "caption5": "Caption text for slide 5"
        }
      `;

      try {
        const planResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: genZPrompt,
            config: { responseMimeType: "application/json" }
        });

        const plan = extractJSON<any>(planResponse.text || "{}");
        totalInput += planResponse.usageMetadata?.promptTokenCount || 0;
        totalOutput += planResponse.usageMetadata?.candidatesTokenCount || 0;

        // Generate the 5 images based on the plan
        for (let i = 1; i <= 5; i++) {
           const imgDesc = plan[`image${i}`] || `${technicalPrompt} - part ${i}`;
           const cap = plan[`caption${i}`] || "";
           captions.push(cap);

           const result = await generateCreativeImage(
               project, "Gen Z Creator", angle, format, visualScene, visualStyle, imgDesc, "1:1"
           );
           if (result.data) slides.push(result.data);
           totalInput += result.inputTokens;
           totalOutput += result.outputTokens;
        }

        return { data: { images: slides, captions: captions }, inputTokens: totalInput, outputTokens: totalOutput };

      } catch (e) {
         console.error("Gen Z Carousel Planner Failed", e);
         // Fallback to standard flow below if planning fails, but empty captions
      }
    }

    // --- STANDARD CAROUSEL WORKFLOW (Fallback or Other Types) ---
    // If not Real Story or if Real Story failed above
    
    const count = (format === CreativeFormat.CAROUSEL_REAL_STORY) ? 5 : 3; 

    for (let i = 1; i <= count; i++) {
        let slidePrompt = "";
        
        if (format === CreativeFormat.CAROUSEL_EDUCATIONAL) {
             if (i === 1) slidePrompt = `Slide 1 (Title Card): Minimalist background with plenty of negative space for text. Visual icon representing the topic: ${angle}.`;
             if (i === 2) slidePrompt = `Slide 2 (The Method): A diagram or clear photo demonstrating the 'How To' aspect of the solution.`;
             if (i === 3) slidePrompt = `Slide 3 (Summary): A checklist visual or a final result shot showing success.`;
        }
        else {
            if (i === 1) slidePrompt = `${technicalPrompt}. Slide 1: The Hook/Problem. High tension visual.`;
            if (i === 2) slidePrompt = `${technicalPrompt}. Slide 2: The Solution/Process. Detailed macro shot.`;
            if (i === 3) slidePrompt = `${technicalPrompt}. Slide 3: The Result/CTA. Happy resolution.`;
        }

        const result = await generateCreativeImage(
            project, "User", angle, format, visualScene, visualStyle, slidePrompt, "1:1"
        );
        if (result.data) slides.push(result.data);
        totalInput += result.inputTokens;
        totalOutput += result.outputTokens;
    }

    return { data: { images: slides, captions: [] }, inputTokens: totalInput, outputTokens: totalOutput };
};

// --- AUDIO GENERATION ---

export const generateAdScript = async (project: ProjectContext, personaName: string, angle: string): Promise<string> => {
    const model = "gemini-2.5-flash";
    const lang = project.targetCountry?.toLowerCase().includes("indonesia") ? "Bahasa Indonesia (Colloquial/Gaul)" : "English";

    const response = await ai.models.generateContent({
        model,
        contents: `Write a 15-second TikTok/Reels UGC script for: ${project.productName}. Language: ${lang}. Angle: ${angle}. Keep it under 40 words. Hook the viewer instantly.`
    });
    return response.text || "Script generation failed.";
};

export const generateVoiceover = async (script: string, personaName: string): Promise<string | null> => {
    const spokenText = script.replace(/\[.*?\]/g, '').trim();
    let voiceName = 'Zephyr'; 
    if (personaName.toLowerCase().includes('skeptic') || personaName.toLowerCase().includes('man')) voiceName = 'Fenrir';
    if (personaName.toLowerCase().includes('status') || personaName.toLowerCase().includes('woman')) voiceName = 'Kore';

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: { parts: [{ text: spokenText }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
            }
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (e) {
        console.error("TTS Error", e);
        return null;
    }
};
