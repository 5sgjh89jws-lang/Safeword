// Each registered user. Key = the phone number that identifies them.

export const USERS = {
  "+14706203647": {
    name: "Muhammad Qasim",
    address: "41 Peachtree St NE, Atlanta, GA 30303",
    location: { lat: 33.7537, lng: -84.3863 },
    duressPhrase: "water my plants",
    checkinPhrase: "i'm good",
    contacts: [
      { name: "Nouman Kabir",   phone: "+14049409582", whatsapp: "whatsapp:+14049409582" },
      { name: "Angel Sudan",    phone: "+14706025357", whatsapp: "whatsapp:+14706025357" },
      { name: "Aayushi Sale",   phone: "+14706805711", whatsapp: "whatsapp:+14706805711" },
      { name: "Bethany English", phone: "+12293763570", whatsapp: "whatsapp:+12293763570" },
    ],
  },
};

// Voice calls arrive without a caller ID, so they fall through to this.
export const DEFAULT_USER = USERS["+14706203647"];

export function lookupUser(id) {
  if (!id) return DEFAULT_USER;
  for (const [key, user] of Object.entries(USERS)) {
    const bare = key.replace(/\D/g, "");
    if (id.includes(key) || id.replace(/\D/g, "").includes(bare)) return user;
  }
  return DEFAULT_USER;
}