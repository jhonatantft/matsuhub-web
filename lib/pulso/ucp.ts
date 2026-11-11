/**
 * Universal Commerce Protocol (UCP) documents for the Pulso demo store.
 * Spec: https://ucp.dev/2026-08-25/specification/overview (release v2026-08-25 of
 * github.com/Universal-Commerce-Protocol/ucp). Demonstration only — not certified.
 */
import { PULSO_PATHS } from "./site";

export const UCP_VERSION = "2026-08-25";
const base = `https://ucp.dev/${UCP_VERSION}`;

export const UCP_CHECKOUT = "dev.ucp.shopping.checkout";
export const UCP_FULFILLMENT = "dev.ucp.shopping.fulfillment";

export const DEMO_NOTE =
  "Loja fictícia de demonstração da MatsuHub. Implementação de demonstração, não certificada; nenhum pagamento é processado e nenhum pedido é enviado.";

const capabilities = {
  [UCP_CHECKOUT]: [
    {
      version: UCP_VERSION,
      spec: `${base}/specification/shopping/checkout`,
      schema: `${base}/schemas/shopping/checkout.json`,
    },
  ],
  [UCP_FULFILLMENT]: [
    {
      version: UCP_VERSION,
      spec: `${base}/specification/shopping/extensions/fulfillment`,
      schema: `${base}/schemas/shopping/fulfillment.json`,
      extends: UCP_CHECKOUT,
    },
  ],
};

/** Business profile served at /.well-known/ucp (profile.json#/$defs/business_schema). */
export function businessProfile(origin: string) {
  return {
    ucp: {
      version: UCP_VERSION,
      services: {
        "dev.ucp.shopping": [
          {
            version: UCP_VERSION,
            spec: `${base}/specification/overview`,
            transport: "mcp",
            schema: `${base}/services/shopping/mcp.openrpc.json`,
            endpoint: origin + PULSO_PATHS.mcp,
          },
        ],
      },
      capabilities,
      // No payment handler: this demo never collects or processes payment.
      payment_handlers: {},
    },
    // Extra top-level member (the profile wrapper allows additional properties).
    "com.matsuhub.demo": {
      status: "demonstração, não certificado",
      note: DEMO_NOTE,
      store: origin + PULSO_PATHS.store,
      llms_txt: origin + PULSO_PATHS.llms,
    },
  };
}

/**
 * Platform profile of the in-page demo agent (profile.json#/$defs/platform_schema).
 * The console sends this URI as meta["ucp-agent"].profile.
 */
export function demoAgentProfile(origin: string) {
  return {
    ucp: {
      version: UCP_VERSION,
      services: {
        "dev.ucp.shopping": [
          {
            version: UCP_VERSION,
            spec: `${base}/specification/overview`,
            transport: "mcp",
            schema: `${base}/services/shopping/mcp.openrpc.json`,
          },
        ],
      },
      capabilities,
      payment_handlers: {},
    },
    "com.matsuhub.demo": {
      status: "demonstração, não certificado",
      note: "Perfil do agente de demonstração que roda na página da loja Pulso.",
      business_profile: origin + PULSO_PATHS.ucp,
    },
  };
}

/** `ucp` envelope for checkout responses. */
export const checkoutEnvelope = () => ({
  version: UCP_VERSION,
  status: "success" as const,
  capabilities: {
    [UCP_CHECKOUT]: [{ version: UCP_VERSION }],
    [UCP_FULFILLMENT]: [{ version: UCP_VERSION }],
  },
  payment_handlers: {},
});

export const errorEnvelope = () => ({ version: UCP_VERSION, status: "error" as const });

/** Cache headers required for published profiles (overview § Hosting). */
export const PROFILE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "Access-Control-Allow-Origin": "*",
};
