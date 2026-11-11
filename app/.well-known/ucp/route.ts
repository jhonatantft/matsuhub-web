import { siteOrigin } from "@/lib/pulso/site";
import { PROFILE_HEADERS, businessProfile } from "@/lib/pulso/ucp";

/** UCP business profile (discovery) of the Pulso demo store. Public, unauthenticated. */
export async function GET(request: Request) {
  return new Response(JSON.stringify(businessProfile(siteOrigin(request)), null, 2), { headers: PROFILE_HEADERS });
}
