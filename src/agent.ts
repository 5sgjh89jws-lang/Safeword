import "dotenv/config";
import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import { think } from "./brain.js";

const DURESS = "water my plants";
const CHECKIN = "i'm good";
const SILENCE_MS = 15_000;

type Mode = "menu" | "stay" | "help";
const modes = new Map<string, Mode>();
const histories = new Map<string, string[]>();
const timers = new Map<string, NodeJS.Timeout>();

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

function clearTimer(who: string) {
  const t = timers.get(who);
  if (t) clearTimeout(t);
  timers.delete(who);
}

function escalate(who: string, trigger: string, lastMessage: string) {
  console.log("\n=== ESCALATION ===", trigger, "\n");
  report({ type: "escalate", trigger, lastMessage, who });
  clearTimer(who);
}

const app = await Spectrum({
  projectId: process.env.SPECTRUM_PROJECT_ID!,
  projectSecret: process.env.SPECTRUM_PROJECT_SECRET!,
  providers: [imessage.config()],
});

console.log("agent live on iMessage");

function armTimer(who: string, space: any) {
  clearTimer(who);
  timers.set(
    who,
    setTimeout(async () => {
      const nudge = "You still there? Just say anything.";
      console.log(`[${who}] silence nudge`);
      report({ type: "message", from: "agent", text: nudge, who });
      try { await space.send(nudge); } catch {}

      timers.set(
        who,
        setTimeout(() => {
          console.log(`[${who}] no response — escalating`);
          modes.set(who, "help");
          escalate(who, "no_response", "[no reply after two prompts]");
        }, SILENCE_MS)
      );
    }, SILENCE_MS)
  );
}

for await (const [space, message] of app.messages) {
  if (message.content.type !== "text") continue;

  const text = message.content.text.trim();
  const who = message.sender?.id ?? space.id;
  const mode = modes.get(who) ?? "menu";
  const started = Date.now();

  clearTimer(who);

  if (!histories.has(who)) histories.set(who, []);
  const history = histories.get(who)!;
  history.push(`user: ${text}`);

  let reply: string;
  let keepWatching = false;

  if (mode === "menu") {
    if (text === "1") {
      modes.set(who, "stay");
      reply = "I'm here. Where are you headed?";
      keepWatching = true;
    } else if (text === "2") {
      modes.set(who, "help");
      reply = "Okay. Getting people to you right now.";
      escalate(who, "help_now", text);
    } else {
      reply = MENU;
    }
  } else if (mode === "stay") {
    const t = await think(history, DURESS, CHECKIN);
    console.log("  think →", JSON.stringify(t));

    if (t.safe) {
      modes.set(who, "menu");
      histories.set(who, []);
      reply = "Good. Glad you made it. I'm here whenever.";
      report({ type: "resolved", who });
    } else if (t.duress) {
      escalate(who, "duress_phrase", text);
      modes.set(who, "help");
      reply = t.reply;
    } else {
      reply = t.reply;
      keepWatching = true;
    }
  } else {
    // help mode — already escalated. any new message starts over.
    modes.set(who, "menu");
    histories.set(who, []);
    reply = MENU;
  }

  history.push(`agent: ${reply}`);

  report({ type: "message", from: "user", text, who, mode: modes.get(who) ?? "menu" });
  report({ type: "message", from: "agent", text: reply, who });

  await space.send(reply);
  console.log(`${Date.now() - started}ms [${who}] →`, reply.slice(0, 40));

  if (keepWatching) armTimer(who, space);
}