import express from "express";

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
  location: { lat: 33.7537, lng: -84.3863 },
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
  }
  if (e.type === "reset") {
    session = { ...session, status: "IDLE", mode: "menu", transcript: [], trigger: null, escalatedAt: null };
  }
  res.json({ ok: true });
});

app.get("/state", (_, res) => res.json(session));

app.listen(3000, () => console.log("dashboard → http://localhost:3000"));