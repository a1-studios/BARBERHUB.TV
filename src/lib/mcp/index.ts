import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import searchBarbers from "./tools/search-barbers";
import listBattles from "./tools/list-battles";
import listOpenChallenges from "./tools/list-open-challenges";
import listMyNotifications from "./tools/list-my-notifications";
import markNotificationsRead from "./tools/mark-notifications-read";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (inlined by Vite at build time) — never from SUPABASE_URL.
const projectRef = import.meta.env?.VITE_SUPABASE_PROJECT_ID ?? "msuepyfssovvkjzpfjzu";

export default defineMcp({
  name: "barberhub-mcp",
  title: "BARBER-HUB",
  version: "0.1.0",
  instructions:
    "Tools for BARBER-HUB, a global barber competition platform. Callers act as their own signed-in BARBER-HUB user. Use `get_my_profile` for the user's identity, role (fan or barber) and Barber Bucks balance; `search_barbers` for the barber directory; `list_battles` and `list_open_challenges` for competition activity; and the notification tools to read and clear their inbox. All amounts are in Barber Bucks (BB), where $1 = 5 BB.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfile,
    searchBarbers,
    listBattles,
    listOpenChallenges,
    listMyNotifications,
    markNotificationsRead,
  ],
});
