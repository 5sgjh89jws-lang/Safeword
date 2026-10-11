import "dotenv/config";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { terminal } from "spectrum-ts/providers/terminal";

const DURESS = "water my plants";

type Mode = "menu" | "stay" | "help";
const modes = new Map<string, Mode>();

const MENU =
  "Hey — I'm here.\n" +
  "Reply 1 to Stay With Me\n" +
  "Reply 2 for Help Now";

async function report(event: any) {
  try {
    await fetch("http://localhost:3000/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {}
}

function escalate(who: string, trigger: string, lastMessage: string) {
  console.log("\n=== ESCALATION ===", trigger, "\n");
  report({ type: "escalate", trigger, lastMessage });
}

const app = await Spectrum({
  projectId: process.env.SPECTRUM_PROJECT_ID!,
  projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
  providers: [imessage.config(), terminal.config()],
});

console.log("agent live on iMessage + terminal");

for await (const [space, message] of app.messages) {
  console.log(
    "INCOMING:",
    message.platform,
    message.content.type,
    "sender:", message.sender?.id ?? "unknown",
    "space:", space.id
  );

  if (message.content.type !== "text") continue;

  const text = message.content.text.trim();
  const who = space.id;
  const mode = modes.get(who) ?? "menu";

  let reply: string;

  if (mode === "menu") {
    if (text === "1") {
      modes.set(who, "stay");
      reply = "I'm here. Where are you headed?";
    } else if (text === "2") {
      modes.set(who, "help");
      reply = "Okay. Getting people to you right now.";
      escalate(who, "help_now", text);
    } else {
      reply = MENU;
    }
  } else if (mode === "stay") {
    if (text.toLowerCase().includes(DURESS)) {
      escalate(who, "duress_phrase", text);
      reply = "Sure, no problem. How's the walk going?";
    } else {
      reply = "Still with you. What's going on?";
    }
  } else {
    reply = "Hang tight, help is coming.";
  }

  await report({ type: "message", from: "user", text, mode: modes.get(who) ?? "menu" });
  await report({ type: "message", from: "agent", text: reply });

  try {
    await space.send(reply);
    console.log("SENT:", reply.slice(0, 40));
  } catch (e: any) {
    console.error("SEND FAILED:", e.message);
  }
}