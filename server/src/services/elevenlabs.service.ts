import { getOpenAI } from "./openai.service.js";

const VOICE_ID_DEFAULT = "21m00Tcm4TlvDq8ikWAM"; // Rachel

function getElevenLabsKey() {
  return process.env.ELEVENLABS_API_KEY || "";
}
export async function textToSpeech(text: string): Promise<Buffer> {
  const elevenLabsKey = getElevenLabsKey();
  // Try ElevenLabs first
  if (elevenLabsKey) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID_DEFAULT}/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": elevenLabsKey,
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_flash_v2_5",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      const errBody = await response.text();
      console.warn(
        `ElevenLabs failed [${response.status}]: ${errBody}. Falling back to OpenAI TTS`
      );
    } catch (err) {
      console.warn("ElevenLabs error, falling back to OpenAI TTS:", err);
    }
  }

  // Fallback: OpenAI TTS
  const mp3 = await getOpenAI().audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
  });

  const arrayBuffer = await mp3.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function polishText(text: string): Promise<string> {
  // Short text (< 20 chars) skips LLM polish
  if (text.length < 20) return text;

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Polish this text to be more natural and professional. Keep it concise. Return only the polished text.",
      },
      { role: "user", content: text },
    ],
    temperature: 0.3,
  });

  return response.choices[0].message.content || text;
}
