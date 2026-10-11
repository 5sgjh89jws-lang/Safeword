import "dotenv/config";
import express from "express";
import { alertContacts, buildAlert } from "./notify.js";
import { lookupUser, DEFAULT_USER } from "./users.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

const AUTO_RESET_MS = 60_000;
let resetTimer = null;

function freshSession(user = DEFAULT_USER) {
  return {
    status: "IDLE",
    mode: "menu",
    transcript: [],
    trigger: null,
    escalatedAt: null,
    userName: user.name,
    address: user.address,
    location: user.location,
    contacts: user.contacts.map(c => c.name),
    alertText: null,
  };
}

let session = freshSession();

function scheduleReset(user, ms) {
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    session = freshSession(user);
    resetTimer = null;
    console.log("session auto-reset");
  }, ms);
}

app.post("/event", (req, res) => {
  const e = req.body;
  const user = lookupUser(e.who);

  if (e.type === "message") {
    if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
    if (session.userName !== user.name) session = freshSession(user);
    session.transcript.push({ from: e.from, text: e.text });
    session.mode = e.mode ?? session.mode;
    if (session.status === "IDLE" || session.status === "SAFE") {
      session.status = "ACTIVE";
    }
  }

  if (e.type === "escalate") {
    session.userName = user.name;
    session.address = user.address;
    session.location = user.location;
    session.contacts = user.contacts.map(c => c.name);
    session.status = "ESCALATED";
    session.trigger = e.trigger;
    session.escalatedAt = new Date().toISOString();
    session.alertText = buildAlert(user).sms;
    alertContacts(user);
    scheduleReset(user, AUTO_RESET_MS);
    console.log("escalated — auto-reset in 60s");
  }

  if (e.type === "resolved") {
    session.status = "SAFE";
    session.mode = "menu";
    scheduleReset(user, 10_000);
    console.log("resolved — auto-reset in 10s");
  }

  if (e.type === "reset") {
    if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
    session = freshSession(user);
  }

  res.json({ ok: true });
});

app.get("/state", (_, res) => res.json(session));

app.listen(3000, () => console.log("dashboard on http://localhost:3000"));