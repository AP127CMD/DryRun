/* ============================================================
   Nu's Dry Run — password gate (Cloudflare Pages Function)
   - Password comes from the DRYRUN_PASSWORD project secret
     (fallback default below if the secret is not set).
   - Successful login sets an HMAC-signed, HttpOnly cookie
     valid for 30 days. /logout clears it.
   Change the password:
     printf 'NewPass' | npx wrangler pages secret put DRYRUN_PASSWORD --project-name ap127-dryrun
     (then redeploy once so the new value is picked up)
   ============================================================ */

const COOKIE = "nudr_auth";
const DEFAULT_PASSWORD = "NuDA40-1907";
const enc = new TextEncoder();

async function hmacKey(pass) {
  return crypto.subtle.importKey(
    "raw", enc.encode(pass + "|nudryrun-cookie-salt-v1"),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]
  );
}
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function makeToken(pass, expMs) {
  const key = await hmacKey(pass);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(String(expMs)));
  return `${expMs}.${b64(sig)}`;
}
async function checkToken(pass, token) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || +exp < Date.now()) return false;
  const key = await hmacKey(pass);
  const expect = b64(await crypto.subtle.sign("HMAC", key, enc.encode(exp)));
  return expect === sig;
}
function getCookie(request, name) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

function loginPage(msg = "") {
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nu's Dry Run — Sign in</title>
<link href="https://fonts.googleapis.com/css2?family=B612:wght@400;700&family=B612+Mono&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#04070b; color:#dfe7ec; font-family:"B612",sans-serif;
    background-image:radial-gradient(900px 400px at 70% -10%, rgba(0,229,255,.06), transparent 60%),
      radial-gradient(700px 400px at 10% 110%, rgba(255,46,196,.06), transparent 60%); }
  .box { width:min(360px, 92vw); background:#0b1219; border:1px solid #1c2a35; border-top:3px solid #ff2ec4;
    border-radius:8px; padding:28px; box-shadow:0 24px 80px rgba(0,0,0,.7); }
  h1 { font-size:20px; letter-spacing:.12em; } h1 em { color:#ff2ec4; font-style:normal; }
  .sub { font-size:10.5px; color:#8fa0ab; letter-spacing:.18em; margin:4px 0 22px; }
  label { display:block; font-size:11px; color:#8fa0ab; letter-spacing:.12em; margin-bottom:6px; }
  input { width:100%; background:#000; color:#00e5ff; border:1px solid #1c2a35; border-radius:4px;
    padding:11px; font-family:"B612 Mono",monospace; font-size:15px; letter-spacing:.1em; }
  input:focus { outline:none; border-color:#00e5ff; }
  button { width:100%; margin-top:16px; background:#ff2ec4; color:#16000f; border:0; border-radius:4px;
    padding:12px; font-family:"B612 Mono",monospace; font-weight:700; font-size:14px; letter-spacing:.14em; cursor:pointer; }
  button:hover { filter:brightness(1.12); }
  .err { color:#ff3b30; font-size:12px; margin-top:12px; font-family:"B612 Mono",monospace; }
  .foot { margin-top:20px; font-size:10px; color:#5a6a74; line-height:1.5; }
</style></head><body>
<form class="box" method="POST" action="/login">
  <h1>NU'S <em>DRY RUN</em></h1>
  <div class="sub">DA40 CS · XC CHAIR FLIGHT TRAINER</div>
  <label for="p">PASSWORD</label>
  <input id="p" name="password" type="password" autofocus autocomplete="current-password">
  <button type="submit">ENTER COCKPIT ▶</button>
  ${msg ? `<div class="err">✗ ${msg}</div>` : ""}
  <div class="foot">Private training aid — authorized use only.</div>
</form></body></html>`, { status: 401, headers: { "Content-Type": "text/html;charset=UTF-8", "Cache-Control": "no-store" } });
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const pass = env.DRYRUN_PASSWORD || DEFAULT_PASSWORD;

  if (url.pathname === "/logout") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/", "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` }
    });
  }

  if (url.pathname === "/login" && request.method === "POST") {
    const form = await request.formData();
    if ((form.get("password") || "") === pass) {
      const exp = Date.now() + 30 * 24 * 3600 * 1000;
      const token = await makeToken(pass, exp);
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=${30 * 24 * 3600}; HttpOnly; Secure; SameSite=Lax`
        }
      });
    }
    return loginPage("Wrong password — try again.");
  }

  if (await checkToken(pass, getCookie(request, COOKIE))) {
    const res = await next();
    const r = new Response(res.body, res);
    r.headers.set("Cache-Control", "no-store");   // keep the gated app out of shared caches
    return r;
  }
  return loginPage();
}
