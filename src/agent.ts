import "dotenv/config";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { think } from "./brain.js";

const DURESS = "water my plants";
const CHECKIN = "i'm good";

type Mode = "menu" | "stay" | "help";
const modes = new Map<string, Mode>();
const histories = new Map<string, string[]>();

const MENU =
  "Hey — I'm here.\n" +
  "Reply 1 to Stay With Me\n" +
  "Reply 2 for Help Now";

function report(event: any) {
  fetch("http://localhost:3000/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {});
}

function escalate(who: string, trigger: string, lastMessage: string) {
  console.log("\n=== ESCALATION ===", trigger, "\n");
  report({ type: "escalate", trigger, lastMessage, who });
}

const app = await Spectrum({
  projectId: process.env.SPECTRUM_PROJECT_ID!,
  projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
  providers: [imessage.config()],
});

console.log("agent live on iMessage");

for await (const [space, message] of app.messages) {
  if (message.content.type !== "text") continue;

  const text = message.content.text.trim();
  const who = message.sender?.id ?? space.id;
  const mode = modes.get(who) ?? "menu";
  const started = Date.now();

  if (!histories.has(who)) histories.set(who, []);
  const history = histories.get(who)!;
  history.push(`user: ${text}`);

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
    const t = await think(history, DURESS, CHECKIN);

    if (t.safe) {
      modes.set(who, "menu");
      histories.set(who, []);
      reply = "Good. Glad you made it. I'm here whenever.";
    } else {
      if (t.duress) escalate(who, "duress_phrase", text);
      reply = t.reply;
    }
  } else {
    reply = "Hang tight, help is coming.";
  }

  history.push(`agent: ${reply}`);

  report({ type: "message", from: "user", text, who, mode: modes.get(who) ?? "menu" });
  report({ type: "message", from: "agent", text: reply, who });

  await space.send(reply);
  console.log(`${Date.now() - started}ms [${who}] →`, reply.slice(0, 40));
}