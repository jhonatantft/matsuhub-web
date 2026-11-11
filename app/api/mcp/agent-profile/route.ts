import { siteOrigin } from "@/lib/pulso/site";
import { PROFILE_HEADERS, demoAgentProfile } from "@/lib/pulso/ucp";

/** UCP platform profile of the in-page demo agent (sent as meta["ucp-agent"].profile). */
export async function GET(request: Request) {
  return new Response(JSON.stringify(demoAgentProfile(siteOrigin(request)), null, 2), { headers: PROFILE_HEADERS });
}
