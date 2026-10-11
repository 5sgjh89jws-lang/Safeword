import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
const TIMEOUT_MS = 8000;

export type Thought = { duress: boolean; safe: boolean; reply: string };

const FILLERS = [
  "Still with you. What's going on?",
  "Yeah? How much further do you have?",
  "Gotcha. You doing okay out there?",
  "Mm. What's the street like right now?",
  "I'm here. Keep talking to me.",
  "Okay. How are you feeling?",
];
let fillerIdx = 0;

function fallback(transcript: string[], duressPhrase: string, checkinPhrase: string): Thought {
  const last = transcript[transcript.length - 1]?.toLowerCase() ?? "";
  const reply = FILLERS[fillerIdx++ % FILLERS.length];
  return {
    duress: last.includes(duressPhrase),
    safe: last.includes(checkinPhrase),
    reply,
  };
}

function buildPrompt(recent: string, duressPhrase: string, checkinPhrase: string) {
  return `You are texting a friend who is walking home alone at night. Keep them company.

Reply with ONE short casual sentence. Sometimes ask a light question. Never sound like a bot.

Before your sentence, output exactly one tag on the same line:
[N] normal
[D] their last message contained "${duressPhrase}" or a close paraphrase
[S] their last message contained "${checkinPhrase}" or means they are safe now

If [D], your sentence must still sound completely normal and casual. Never mention danger, help, or an alert.

Output nothing except the tag and the sentence.

Example: [N] Gotcha, how much further do you have?

Conversation:
${recent}`;
}

function parse(raw: string): Thought {
  const text = raw.trim();
  const duress = text.startsWith("[D]");
  const safe = text.startsWith("[S]");
  const reply = text.replace(/^\[[NDS]\]\s*/, "").trim();

  if (reply.length < 8 || !/[a-zA-Z]/.test(reply)) {
    throw new Error("junk reply: " + reply.slice(0, 20));
  }

  return { duress, safe, reply };
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  const timeout = new Promise<never>((_, rej) =>
    setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS)
  );
  return Promise.race([p, timeout]);
}

export async function think(
  transcript: string[],
  duressPhrase: string,
  checkinPhrase: string
): Promise<Thought> {
  const recent = transcript.slice(-6).join("\n");
  const prompt = buildPrompt(recent, duressPhrase, checkinPhrase);

  // primary: Claude Haiku
  try {
    const res = await withTimeout(
      claude.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      })
    );
    const raw = res.content[0].type === "text" ? res.content[0].text : "";
    return parse(raw);
  } catch (e: any) {
    console.error("claude:", e.message.slice(0, 100));
  }

  // backup: gemini chain
  for (const model of GEMINI_MODELS) {
    try {
      const res: any = await withTimeout(
        gemini.models.generateContent({
          model,
          contents: prompt,
          config: { maxOutputTokens: 100, temperature: 0.9 },
        })
      );
      return parse(res.text ?? "");
    } catch (e: any) {
      console.error(`gemini [${model}]:`, e.message.slice(0, 80));
    }
  }

  return fallback(transcript, duressPhrase, checkinPhrase);
}