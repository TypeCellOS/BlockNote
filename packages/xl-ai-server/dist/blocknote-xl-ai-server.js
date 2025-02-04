import { serve as A } from "@hono/node-server";
import { Hono as g } from "hono";
import { existsSync as w, readFileSync as h } from "node:fs";
import { createSecureServer as q } from "node:http2";
import { setGlobalDispatcher as v, Agent as m } from "undici";
var x = (r) => {
  const t = {
    ...{
      origin: "*",
      allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
      allowHeaders: [],
      exposeHeaders: []
    },
    ...r
  }, n = /* @__PURE__ */ ((s) => typeof s == "string" ? s === "*" ? () => s : (e) => s === e ? e : null : typeof s == "function" ? s : (e) => s.includes(e) ? e : null)(t.origin);
  return async function(e, y) {
    var f, p;
    function a(o, i) {
      e.res.headers.set(o, i);
    }
    const d = n(e.req.header("origin") || "", e);
    if (d && a("Access-Control-Allow-Origin", d), t.origin !== "*") {
      const o = e.req.header("Vary");
      o ? a("Vary", o) : a("Vary", "Origin");
    }
    if (t.credentials && a("Access-Control-Allow-Credentials", "true"), (f = t.exposeHeaders) != null && f.length && a("Access-Control-Expose-Headers", t.exposeHeaders.join(",")), e.req.method === "OPTIONS") {
      t.maxAge != null && a("Access-Control-Max-Age", t.maxAge.toString()), (p = t.allowMethods) != null && p.length && a("Access-Control-Allow-Methods", t.allowMethods.join(","));
      let o = t.allowHeaders;
      if (!(o != null && o.length)) {
        const i = e.req.header("Access-Control-Request-Headers");
        i && (o = i.split(/\s*,\s*/));
      }
      return o != null && o.length && (a("Access-Control-Allow-Headers", o.join(",")), e.res.headers.append("Vary", "Access-Control-Request-Headers")), e.res.headers.delete("Content-Length"), e.res.headers.delete("Content-Type"), new Response(null, {
        headers: e.res.headers,
        status: 204,
        statusText: e.res.statusText
      });
    }
    await y();
  };
};
v(
  new m({
    allowH2: !0
  })
);
const H = /^content-(?:encoding|length|range)$/i, T = async (r, l) => {
  const t = new Request(r, l);
  t.headers.delete("accept-encoding");
  const n = await fetch(t), s = [...n.headers.entries()].filter(
    ([e]) => !H.test(e) && e !== "strict-transport-security"
  );
  return new Response(n.body, {
    ...n,
    status: n.status,
    statusText: n.statusText,
    headers: s
  });
};
function C(r) {
  return r === "openai" ? {
    key: process.env.OPENAI_API_KEY
  } : r === "groq" ? {
    key: process.env.GROQ_API_KEY
  } : r === "albert-etalab" ? {
    key: process.env.ALBERT_ETALAB_API_KEY
  } : "not-found";
}
const c = new g();
c.use("/health", async (r) => r.json({ status: "ok" }));
c.use("/ai", x(), async (r) => {
  var e;
  const l = r.req.query("url");
  if (!l)
    return r.json({ error: "url parameter is required" }, 400);
  const t = r.req.query("provider");
  if (!t)
    return r.json({ error: "provider parameter is required" }, 400);
  const n = C(t);
  if (n === "not-found" || !((e = n.key) != null && e.length))
    return r.json(
      {
        error: `provider / key not found for provider ${t}. Make sure to load correct env variables.`
      },
      404
    );
  console.log("Proxying request to", l);
  const s = new Request(l, r.req.raw);
  return s.headers.set("Authorization", `Bearer ${n.key}`), T(s);
});
const u = w("localhost.pem");
A(
  {
    fetch: c.fetch,
    createServer: u ? q : void 0,
    serverOptions: {
      key: u ? h("localhost-key.pem") : void 0,
      cert: u ? h("localhost.pem") : void 0
    },
    port: Number(process.env.PORT) || 3e3
  },
  (r) => {
    console.log(
      `Server is running on ${r.address}${r.port}, http2: ${u}`
    );
  }
);
export {
  T as proxyFetch
};
//# sourceMappingURL=blocknote-xl-ai-server.js.map
