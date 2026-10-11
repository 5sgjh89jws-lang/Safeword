import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export function buildAlert(session) {
  const { userName, location, address } = session;
  const maps = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });

  const sms =
`SAFETY ALERT — ${userName}

She triggered an emergency alert and may not be able to speak or call for help herself.

LOCATION: ${address}
MAP: ${maps}
TIME: ${time}

CALL 911 NOW AND READ THIS:

"I'm calling to report a possible emergency at a different location. The person is ${userName}, and she is at ${address}. She sent an automated distress alert from that location and is not responding. I am not at the scene. Please send someone to check on her."

If the dispatcher says it's outside their area, ask them to transfer you to Atlanta, Georgia dispatch.`;

  const voice =
`This is an automated safety alert. This is not a sales call. ${userName} has triggered an emergency alert and may not be able to speak or call for help herself. Her location is ${address}. Repeating her location. ${address}. Please call 9 1 1 now and tell them you are reporting a possible emergency at a different location, that ${userName} sent an automated distress alert from ${address}, that she is not responding, and that you are not at the scene. If the dispatcher says it is outside their area, ask to be transferred to Atlanta Georgia dispatch. Repeating this message now.`;

  return { sms, voice };
}

export async function alertContact(session) {
  const { sms, voice } = buildAlert(session);

  try {
    await client.messages.create({
      to: process.env.WHATSAPP_TO,
      from: process.env.WHATSAPP_FROM,
      body: sms,
    });
    console.log("WhatsApp sent");
  } catch (e) {
    console.error("WhatsApp failed:", e.message);
  }

  try {
    const call = await client.calls.create({
      to: process.env.CONTACT_PHONE,
      from: process.env.TWILIO_PHONE,
      twiml: `<Response><Say voice="Polly.Joanna">${voice}</Say><Pause length="1"/><Say voice="Polly.Joanna">${voice}</Say></Response>`,
    });
    console.log("call placed:", call.sid);
  } catch (e) {
    console.error("call failed:", e.message);
  }
}