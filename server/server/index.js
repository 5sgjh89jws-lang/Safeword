import "dotenv/config";
import express from "express";
import { alertContact, buildAlert } from "./notify.js";

const app = express();
app.use(express.json());
app.use(express.static("public"));

let session = {
  status: "IDLE",
  mode: "menu",
  transcript: [],
  trigger: null,
  escalatedAt: null,
  userName: "Sarah Chen",
  address: "41 Peachtree St NE, Atlanta, GA 30303",
  location: { lat: 33.7537, lng: -84.3863 },
  alertText: null,
};

app.post("/event", (req, res) => {
  const e = req.body;

  if (e.type === "message") {
    session.transcript.push({ from: e.from, text: e.text });
    session.mode = e.mode ?? session.mode;
    if (session.status === "IDLE") session.status = "ACTIVE";
  }

  if (e.type === "escalate") {
    session.status = "ESCALATED";
    session.trigger = e.trigger;
    session.escalatedAt = new Date().toISOString();
    session.alertText = buildAlert(session).sms;
    alertContact(session);
  }

  if (e.type === "reset") {
    session = {
      ...session,
      status: "IDLE",
      mode: "menu",
      transcript: [],
      trigger: null,
      escalatedAt: null,
      alertText: null,
    };
  }

  res.json({ ok: true });
});

app.get("/state", (_, res) => res.json(session));

app.listen(3000, () => console.log("dashboard on http://localhost:3000"));