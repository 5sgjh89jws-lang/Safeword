import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export function buildAlert(user) {
  const { name, location, address } = user;
  const maps = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/New_York",
  });

  const sms =
`SAFETY ALERT — ${name}

They triggered an emergency alert and may not be able to speak or call for help themselves.

LOCATION: ${address}
MAP: ${maps}
TIME: ${time}

CALL 911 NOW AND READ THIS:

"I'm calling to report a possible emergency at a different location. The person is ${name}, and they are at ${address}. They sent an automated distress alert from that location and are not responding. I am not at the scene. Please send someone to check on them."

If the dispatcher says it's outside their area, ask them to transfer you to Atlanta, Georgia dispatch.`;

  const voice =
`This is an automated safety alert. This is not a sales call. ${name} has triggered an emergency alert and may not be able to speak or call for help. Their location is ${address}. Repeating their location. ${address}. Please call 9 1 1 now and tell them you are reporting a possible emergency at a different location, that ${name} sent an automated distress alert from ${address}, that they are not responding, and that you are not at the scene. If the dispatcher says it is outside their area, ask to be transferred to Atlanta Georgia dispatch. Repeating this message now.`;

  return { sms, voice };
}

export async function alertContacts(user) {
  const { sms, voice } = buildAlert(user);

  await Promise.all(
    user.contacts.map(async (c) => {
      if (c.whatsapp) {
        try {
          await client.messages.create({
            to: c.whatsapp,
            from: process.env.WHATSAPP_FROM,
            body: sms,
          });
          console.log("WhatsApp →", c.name);
        } catch (e) {
          console.error("WhatsApp failed →", c.name, e.message);
        }
      }

      if (c.phone) {
        try {
          const call = await client.calls.create({
            to: c.phone,
            from: process.env.TWILIO_PHONE,
            twiml: `<Response><Say voice="Polly.Joanna">${voice}</Say><Pause length="1"/><Say voice="Polly.Joanna">${voice}</Say></Response>`,
          });
          console.log("call →", c.name, call.sid);
        } catch (e) {
          console.error("call failed →", c.name, e.message);
        }
      }
    })
  );
}