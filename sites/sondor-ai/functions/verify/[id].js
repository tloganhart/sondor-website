// sondor.ai/verify/<id> -> the sondor-app backend's own GET /verify/:provenanceId.
//
// WHY THIS FILE EXISTS. A provenance link has to read https://sondor.ai/verify/<id>,
// because the entire value of the mark is that a stranger trusts the address it sits
// on. But the page is rendered live, per request, by the backend on Railway: it reads
// the author's own Notion workspace on every load, so attribution switched off today
// takes effect on a link shared last month. sondor.ai is a static Astro build with no
// adapter and no SSR, so it cannot produce that page. This passes the request through
// to the backend instead, and the static site around it stays static.
//
// A REVERSE PROXY, NOT A REDIRECT. A 302 to railway.app would satisfy the link text
// and then put railway.app in the reader's address bar the moment they clicked, which
// is the one thing the custom domain exists to prevent. The reader stays on sondor.ai
// for the whole visit.
//
// ROUTE SHAPE. [id].js matches exactly ONE path segment, so /verify/<id> arrives here
// and /verify/a/b does not. A bare /verify gets the marketing 404, which is right:
// there is nothing to verify without an id, and the backend 404s that case too.
//
// Paired with PUBLIC_BASE_URL on the backend (see verificationUrl() in
// sondor-app/server/server.js). That variable decides what address gets WRITTEN into
// links; this file decides whether that address RESOLVES. Setting it to sondor.ai
// before this function is live breaks every link, so the order is: deploy this, then
// change that.

/** Sent on the 405 so the response says what the route actually accepts. */
const ALLOWED_METHODS = "GET, HEAD";

// Forwarded upstream. An ALLOWLIST, deliberately, rather than copying the incoming
// headers and deleting the dangerous ones: a proxy built that way leaks whatever it
// forgot to name, and this one sits in front of a page whose whole access model is
// possession of an unguessable link. No cookie and no Authorization header crosses,
// and neither does the reader's IP: the backend has no reader for one, and a page
// about who wrote something has no business learning who read it.
const FORWARD_HEADERS = ["accept", "accept-language", "user-agent"];

// Generous on purpose. The backend makes several live Notion calls per render, and a
// cold Railway container adds to that, so a short deadline would turn a slow page
// into a broken one. Still bounded, so a dead origin fails rather than hanging.
const UPSTREAM_TIMEOUT_MS = 15_000;

export async function onRequest({ request, env, params }) {
  // Checked here rather than by exporting onRequestGet/onRequestHead and nothing else.
  // An unexported method does not 405 on Pages, it falls through to the static asset
  // handler, which would answer a POST with the marketing 404 and say nothing true.
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed.\n", {
      status: 405,
      headers: {
        allow: ALLOWED_METHODS,
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  // Never hard-coded. The origin is a deploy-time fact, it differs between the Pages
  // preview and production environments, and baking it in would mean a repo change to
  // move the backend.
  const origin = (env.SONDOR_VERIFY_ORIGIN || "").trim().replace(/\/+$/, "");
  if (!origin) return unavailable();

  let upstream;
  try {
    // PATH ONLY. The query string is dropped rather than forwarded: the backend route
    // reads none, so forwarding it would add nothing except a way for a visitor to
    // vary the upstream URL. encodeURIComponent keeps the id to a single segment even
    // if it arrived percent-encoded, so no id can walk the path upward; it is a no-op
    // on a real 22-character base64url id, every character of which is unreserved.
    upstream = new URL(`/verify/${encodeURIComponent(params.id)}`, origin);
  } catch {
    // A malformed SONDOR_VERIFY_ORIGIN lands here. Same answer as an unreachable one,
    // since from the reader's side it is the same situation.
    return unavailable();
  }

  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let response;
  try {
    response = await fetch(upstream, {
      method: request.method,
      headers,
      // Redirects are followed HERE rather than passed back to the browser. The route
      // does not redirect today, but if the platform ever answered one, handing the
      // reader a Location on railway.app would flip the address bar, which is exactly
      // what this file exists to stop.
      redirect: "follow",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return unavailable();
  }

  // The backend's answer passes through as it stands. A missing or malformed id gets
  // the backend's OWN not-found page with its own 404, not the marketing 404 and not
  // anything written here: the backend is the only thing that knows what a valid
  // provenance id is, and duplicating that rule in a second place would let the two
  // disagree.
  const out = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) out.set("content-type", contentType);

  // Nothing is cached unless the backend asks for it. The page is rendered live and
  // attribution can change between two loads of the same link, so a cached copy could
  // show a name its author has since withdrawn. The backend currently sends no
  // Cache-Control at all, and for a live page the honest default is not to store it.
  out.set("cache-control", response.headers.get("cache-control") || "no-store");

  return new Response(response.body, { status: response.status, headers: out });
}

/**
 * Shown when the backend cannot be reached, or when SONDOR_VERIFY_ORIGIN is unset.
 *
 * DELIBERATELY NOT THE MARKETING 404. A 404 tells a reader the link is wrong, which
 * would be a lie about someone's work and the kind of lie they cannot correct. A 502
 * says the fault is ours and the link is worth trying again, which is both true and
 * the fact a reader can act on.
 */
function unavailable() {
  return new Response(UNAVAILABLE_PAGE, {
    status: 502,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

// Self-contained on purpose: no stylesheet, no font and no image, so the one page that
// renders when something is already broken has nothing further left to fail.
const UNAVAILABLE_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Verification is temporarily unavailable</title>
<meta name="robots" content="noindex">
<style>
  :root { color-scheme: light dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 2rem;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         line-height: 1.55; background: #fbfaf8; color: #1c1b19; }
  main { max-width: 34rem; text-align: center; }
  h1 { font-size: 1.375rem; font-weight: 600; letter-spacing: -0.01em; margin: 0 0 0.75rem; }
  p { margin: 0 0 0.75rem; }
  .note { font-size: 0.9375rem; opacity: 0.7; }
  a { color: inherit; }
  @media (prefers-color-scheme: dark) { body { background: #14130f; color: #f2efe9; } }
</style>
</head>
<body>
  <main>
    <h1>Verification is temporarily unavailable</h1>
    <p>This verification page could not be reached just now. The link itself is still good, so it is worth trying again in a few minutes.</p>
    <p class="note"><a href="https://sondor.ai">sondor.ai</a></p>
  </main>
</body>
</html>
`;
