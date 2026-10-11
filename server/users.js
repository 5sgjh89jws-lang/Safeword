// Each registered user. Key = the phone number that identifies them.
// Add contacts by adding entries to the contacts array.

export const USERS = {
  "+14706203647": {
    name: "Muhammad Qasim",
    address: "41 Peachtree St NE, Atlanta, GA 30303",
    location: { lat: 33.7537, lng: -84.3863 },
    duressPhrase: "water my plants",
    checkinPhrase: "i'm good",
    contacts: [
      { name: "Mom", phone: "+14706203647", whatsapp: "whatsapp:+14706203647" },
      // add more here:
      // { name: "Alex", phone: "+1XXXXXXXXXX", whatsapp: "whatsapp:+1XXXXXXXXXX" },
    ],
  },
};

// Voice calls arrive without a caller ID, so they fall through to this.
// Pointing it at the primary user keeps the demo correct.
export const DEFAULT_USER = USERS["+14706203647"];

export function lookupUser(id) {
  if (!id) return DEFAULT_USER;
  for (const [key, user] of Object.entries(USERS)) {
    const bare = key.replace(/\D/g, "");
    if (id.includes(key) || id.replace(/\D/g, "").includes(bare)) return user;
  }
  return DEFAULT_USER;
}