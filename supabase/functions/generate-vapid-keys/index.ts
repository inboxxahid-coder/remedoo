import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );

    const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Convert to URL-safe base64 for use with Web Push
    const publicKey = publicKeyJwk.x && publicKeyJwk.y
      ? btoa(String.fromCharCode(...new Uint8Array([4, ...base64UrlToBytes(publicKeyJwk.x), ...base64UrlToBytes(publicKeyJwk.y)])))
          .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
      : "";

    return new Response(
      JSON.stringify({
        publicKey,
        privateKeyJwk: JSON.stringify(privateKeyJwk),
        publicKeyJwk: JSON.stringify(publicKeyJwk),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function base64UrlToBytes(base64url: string): number[] {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Array.from(binary, (c) => c.charCodeAt(0));
}
