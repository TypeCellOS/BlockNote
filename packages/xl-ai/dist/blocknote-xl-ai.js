var Qt = Object.defineProperty;
var er = (t, e, n) => e in t ? Qt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var T = (t, e, n) => er(t, typeof e != "symbol" ? e + "" : e, n);
import $, { createContext as tr, useContext as rr, useState as te, useCallback as re, useMemo as Oe, useEffect as pt } from "react";
import { useBlockNoteEditor as oe, useBlockNoteContext as nr, useComponentsContext as ft, useSuggestionMenuKeyboardHandler as ir, useUIElementPositioning as or } from "@blocknote/react";
import { jsonSchema as ar, streamObject as sr, generateObject as lr, generateText as cr } from "ai";
import { defaultProps as ur, filterSuggestionItems as pr, mergeCSSClasses as fr, getBlockInfoFromSelection as dr, EventEmitter as mr } from "@blocknote/core";
import * as hr from "diff";
import nt from "remark-parse";
import { unified as Ae } from "unified";
import { SequenceMatcher as gr } from "@ewoudenberg/difflib";
import yr from "remark-stringify";
import { offset as br, flip as vr, size as _r, autoUpdate as kr } from "@floating-ui/react";
import { PluginKey as dt, Plugin as mt } from "prosemirror-state";
import { Decoration as wr, DecorationSet as xr } from "prosemirror-view";
const Ir = (t, e) => async (n, i) => {
  const o = new Request(n, i), a = new Request(
    `${t}?provider=${encodeURIComponent(
      e
    )}&url=${encodeURIComponent(o.url)}`,
    {
      headers: o.headers,
      // if we just pass request.body, it's a readablestream which is not visible in chrome inspector,
      // so use init?.body instead if it's available to make debugging easier
      body: (i == null ? void 0 : i.body) || o.body,
      method: o.method,
      duplex: "half"
    }
  );
  return await fetch(a);
};
function Qn(t) {
  return {
    /**
     * Get settings for AI SDK providers. Pass the returned objects when creating the AI SDK provider, e.g.:
     *
     * createOpenAI({
     *   ...client.getProviderSettings("openai"),
     * })("gpt-4o-2024-08-06", {});
     *
     * Explanation: we override the `fetch` and `apiKey` parameters of the AI SDK provider to instead
     * use the BlockNote AI server to proxy requests to the provider.
     *
     * Note: the `apiKey` is the API key for the @blocknote/xl-ai-server AI server, not the model provider.
     * The correct API key for the model provider will be added by the BlockNote AI server.
     */
    getProviderSettings: (e) => ({
      apiKey: t.apiKey,
      fetch: Ir(t.baseURL, e)
    })
  };
}
var Se = { exports: {} }, Q = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var it;
function Cr() {
  if (it) return Q;
  it = 1;
  var t = $, e = Symbol.for("react.element"), n = Symbol.for("react.fragment"), i = Object.prototype.hasOwnProperty, o = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, a = { key: !0, ref: !0, __self: !0, __source: !0 };
  function s(u, l, d) {
    var f, A = {}, h = null, w = null;
    d !== void 0 && (h = "" + d), l.key !== void 0 && (h = "" + l.key), l.ref !== void 0 && (w = l.ref);
    for (f in l) i.call(l, f) && !a.hasOwnProperty(f) && (A[f] = l[f]);
    if (u && u.defaultProps) for (f in l = u.defaultProps, l) A[f] === void 0 && (A[f] = l[f]);
    return { $$typeof: e, type: u, key: h, ref: w, props: A, _owner: o.current };
  }
  return Q.Fragment = n, Q.jsx = s, Q.jsxs = s, Q;
}
var ee = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var ot;
function Ar() {
  return ot || (ot = 1, process.env.NODE_ENV !== "production" && function() {
    var t = $, e = Symbol.for("react.element"), n = Symbol.for("react.portal"), i = Symbol.for("react.fragment"), o = Symbol.for("react.strict_mode"), a = Symbol.for("react.profiler"), s = Symbol.for("react.provider"), u = Symbol.for("react.context"), l = Symbol.for("react.forward_ref"), d = Symbol.for("react.suspense"), f = Symbol.for("react.suspense_list"), A = Symbol.for("react.memo"), h = Symbol.for("react.lazy"), w = Symbol.for("react.offscreen"), C = Symbol.iterator, g = "@@iterator";
    function m(r) {
      if (r === null || typeof r != "object")
        return null;
      var c = C && r[C] || r[g];
      return typeof c == "function" ? c : null;
    }
    var k = t.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function E(r) {
      {
        for (var c = arguments.length, p = new Array(c > 1 ? c - 1 : 0), y = 1; y < c; y++)
          p[y - 1] = arguments[y];
        G("error", r, p);
      }
    }
    function G(r, c, p) {
      {
        var y = k.ReactDebugCurrentFrame, _ = y.getStackAddendum();
        _ !== "" && (c += "%s", p = p.concat([_]));
        var x = p.map(function(v) {
          return String(v);
        });
        x.unshift("Warning: " + c), Function.prototype.apply.call(console[r], console, x);
      }
    }
    var Y = !1, W = !1, J = !1, q = !1, R = !1, P;
    P = Symbol.for("react.module.reference");
    function M(r) {
      return !!(typeof r == "string" || typeof r == "function" || r === i || r === a || R || r === o || r === d || r === f || q || r === w || Y || W || J || typeof r == "object" && r !== null && (r.$$typeof === h || r.$$typeof === A || r.$$typeof === s || r.$$typeof === u || r.$$typeof === l || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      r.$$typeof === P || r.getModuleId !== void 0));
    }
    function N(r, c, p) {
      var y = r.displayName;
      if (y)
        return y;
      var _ = c.displayName || c.name || "";
      return _ !== "" ? p + "(" + _ + ")" : p;
    }
    function Te(r) {
      return r.displayName || "Context";
    }
    function D(r) {
      if (r == null)
        return null;
      if (typeof r.tag == "number" && E("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof r == "function")
        return r.displayName || r.name || null;
      if (typeof r == "string")
        return r;
      switch (r) {
        case i:
          return "Fragment";
        case n:
          return "Portal";
        case a:
          return "Profiler";
        case o:
          return "StrictMode";
        case d:
          return "Suspense";
        case f:
          return "SuspenseList";
      }
      if (typeof r == "object")
        switch (r.$$typeof) {
          case u:
            var c = r;
            return Te(c) + ".Consumer";
          case s:
            var p = r;
            return Te(p._context) + ".Provider";
          case l:
            return N(r, r.render, "ForwardRef");
          case A:
            var y = r.displayName || null;
            return y !== null ? y : D(r.type) || "Memo";
          case h: {
            var _ = r, x = _._payload, v = _._init;
            try {
              return D(v(x));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var z = Object.assign, K = 0, je, Me, De, Ue, Ne, $e, ze;
    function Fe() {
    }
    Fe.__reactDisabledLog = !0;
    function At() {
      {
        if (K === 0) {
          je = console.log, Me = console.info, De = console.warn, Ue = console.error, Ne = console.group, $e = console.groupCollapsed, ze = console.groupEnd;
          var r = {
            configurable: !0,
            enumerable: !0,
            value: Fe,
            writable: !0
          };
          Object.defineProperties(console, {
            info: r,
            log: r,
            warn: r,
            error: r,
            group: r,
            groupCollapsed: r,
            groupEnd: r
          });
        }
        K++;
      }
    }
    function St() {
      {
        if (K--, K === 0) {
          var r = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: z({}, r, {
              value: je
            }),
            info: z({}, r, {
              value: Me
            }),
            warn: z({}, r, {
              value: De
            }),
            error: z({}, r, {
              value: Ue
            }),
            group: z({}, r, {
              value: Ne
            }),
            groupCollapsed: z({}, r, {
              value: $e
            }),
            groupEnd: z({}, r, {
              value: ze
            })
          });
        }
        K < 0 && E("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var ge = k.ReactCurrentDispatcher, ye;
    function se(r, c, p) {
      {
        if (ye === void 0)
          try {
            throw Error();
          } catch (_) {
            var y = _.stack.trim().match(/\n( *(at )?)/);
            ye = y && y[1] || "";
          }
        return `
` + ye + r;
      }
    }
    var be = !1, le;
    {
      var Et = typeof WeakMap == "function" ? WeakMap : Map;
      le = new Et();
    }
    function Ge(r, c) {
      if (!r || be)
        return "";
      {
        var p = le.get(r);
        if (p !== void 0)
          return p;
      }
      var y;
      be = !0;
      var _ = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var x;
      x = ge.current, ge.current = null, At();
      try {
        if (c) {
          var v = function() {
            throw Error();
          };
          if (Object.defineProperty(v.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(v, []);
            } catch (L) {
              y = L;
            }
            Reflect.construct(r, [], v);
          } else {
            try {
              v.call();
            } catch (L) {
              y = L;
            }
            r.call(v.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (L) {
            y = L;
          }
          r();
        }
      } catch (L) {
        if (L && y && typeof L.stack == "string") {
          for (var b = L.stack.split(`
`), B = y.stack.split(`
`), S = b.length - 1, O = B.length - 1; S >= 1 && O >= 0 && b[S] !== B[O]; )
            O--;
          for (; S >= 1 && O >= 0; S--, O--)
            if (b[S] !== B[O]) {
              if (S !== 1 || O !== 1)
                do
                  if (S--, O--, O < 0 || b[S] !== B[O]) {
                    var j = `
` + b[S].replace(" at new ", " at ");
                    return r.displayName && j.includes("<anonymous>") && (j = j.replace("<anonymous>", r.displayName)), typeof r == "function" && le.set(r, j), j;
                  }
                while (S >= 1 && O >= 0);
              break;
            }
        }
      } finally {
        be = !1, ge.current = x, St(), Error.prepareStackTrace = _;
      }
      var V = r ? r.displayName || r.name : "", F = V ? se(V) : "";
      return typeof r == "function" && le.set(r, F), F;
    }
    function Ot(r, c, p) {
      return Ge(r, !1);
    }
    function Rt(r) {
      var c = r.prototype;
      return !!(c && c.isReactComponent);
    }
    function ce(r, c, p) {
      if (r == null)
        return "";
      if (typeof r == "function")
        return Ge(r, Rt(r));
      if (typeof r == "string")
        return se(r);
      switch (r) {
        case d:
          return se("Suspense");
        case f:
          return se("SuspenseList");
      }
      if (typeof r == "object")
        switch (r.$$typeof) {
          case l:
            return Ot(r.render);
          case A:
            return ce(r.type, c, p);
          case h: {
            var y = r, _ = y._payload, x = y._init;
            try {
              return ce(x(_), c, p);
            } catch {
            }
          }
        }
      return "";
    }
    var Z = Object.prototype.hasOwnProperty, We = {}, qe = k.ReactDebugCurrentFrame;
    function ue(r) {
      if (r) {
        var c = r._owner, p = ce(r.type, r._source, c ? c.type : null);
        qe.setExtraStackFrame(p);
      } else
        qe.setExtraStackFrame(null);
    }
    function Pt(r, c, p, y, _) {
      {
        var x = Function.call.bind(Z);
        for (var v in r)
          if (x(r, v)) {
            var b = void 0;
            try {
              if (typeof r[v] != "function") {
                var B = Error((y || "React class") + ": " + p + " type `" + v + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof r[v] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw B.name = "Invariant Violation", B;
              }
              b = r[v](c, v, y, p, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (S) {
              b = S;
            }
            b && !(b instanceof Error) && (ue(_), E("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", y || "React class", p, v, typeof b), ue(null)), b instanceof Error && !(b.message in We) && (We[b.message] = !0, ue(_), E("Failed %s type: %s", p, b.message), ue(null));
          }
      }
    }
    var Bt = Array.isArray;
    function ve(r) {
      return Bt(r);
    }
    function Lt(r) {
      {
        var c = typeof Symbol == "function" && Symbol.toStringTag, p = c && r[Symbol.toStringTag] || r.constructor.name || "Object";
        return p;
      }
    }
    function Tt(r) {
      try {
        return He(r), !1;
      } catch {
        return !0;
      }
    }
    function He(r) {
      return "" + r;
    }
    function Ve(r) {
      if (Tt(r))
        return E("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", Lt(r)), He(r);
    }
    var X = k.ReactCurrentOwner, jt = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, Ye, Je, _e;
    _e = {};
    function Mt(r) {
      if (Z.call(r, "ref")) {
        var c = Object.getOwnPropertyDescriptor(r, "ref").get;
        if (c && c.isReactWarning)
          return !1;
      }
      return r.ref !== void 0;
    }
    function Dt(r) {
      if (Z.call(r, "key")) {
        var c = Object.getOwnPropertyDescriptor(r, "key").get;
        if (c && c.isReactWarning)
          return !1;
      }
      return r.key !== void 0;
    }
    function Ut(r, c) {
      if (typeof r.ref == "string" && X.current && c && X.current.stateNode !== c) {
        var p = D(X.current.type);
        _e[p] || (E('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', D(X.current.type), r.ref), _e[p] = !0);
      }
    }
    function Nt(r, c) {
      {
        var p = function() {
          Ye || (Ye = !0, E("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", c));
        };
        p.isReactWarning = !0, Object.defineProperty(r, "key", {
          get: p,
          configurable: !0
        });
      }
    }
    function $t(r, c) {
      {
        var p = function() {
          Je || (Je = !0, E("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", c));
        };
        p.isReactWarning = !0, Object.defineProperty(r, "ref", {
          get: p,
          configurable: !0
        });
      }
    }
    var zt = function(r, c, p, y, _, x, v) {
      var b = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: e,
        // Built-in properties that belong on the element
        type: r,
        key: c,
        ref: p,
        props: v,
        // Record the component responsible for creating this element.
        _owner: x
      };
      return b._store = {}, Object.defineProperty(b._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(b, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: y
      }), Object.defineProperty(b, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: _
      }), Object.freeze && (Object.freeze(b.props), Object.freeze(b)), b;
    };
    function Ft(r, c, p, y, _) {
      {
        var x, v = {}, b = null, B = null;
        p !== void 0 && (Ve(p), b = "" + p), Dt(c) && (Ve(c.key), b = "" + c.key), Mt(c) && (B = c.ref, Ut(c, _));
        for (x in c)
          Z.call(c, x) && !jt.hasOwnProperty(x) && (v[x] = c[x]);
        if (r && r.defaultProps) {
          var S = r.defaultProps;
          for (x in S)
            v[x] === void 0 && (v[x] = S[x]);
        }
        if (b || B) {
          var O = typeof r == "function" ? r.displayName || r.name || "Unknown" : r;
          b && Nt(v, O), B && $t(v, O);
        }
        return zt(r, b, B, _, y, X.current, v);
      }
    }
    var ke = k.ReactCurrentOwner, Ke = k.ReactDebugCurrentFrame;
    function H(r) {
      if (r) {
        var c = r._owner, p = ce(r.type, r._source, c ? c.type : null);
        Ke.setExtraStackFrame(p);
      } else
        Ke.setExtraStackFrame(null);
    }
    var we;
    we = !1;
    function xe(r) {
      return typeof r == "object" && r !== null && r.$$typeof === e;
    }
    function Ze() {
      {
        if (ke.current) {
          var r = D(ke.current.type);
          if (r)
            return `

Check the render method of \`` + r + "`.";
        }
        return "";
      }
    }
    function Gt(r) {
      return "";
    }
    var Xe = {};
    function Wt(r) {
      {
        var c = Ze();
        if (!c) {
          var p = typeof r == "string" ? r : r.displayName || r.name;
          p && (c = `

Check the top-level render call using <` + p + ">.");
        }
        return c;
      }
    }
    function Qe(r, c) {
      {
        if (!r._store || r._store.validated || r.key != null)
          return;
        r._store.validated = !0;
        var p = Wt(c);
        if (Xe[p])
          return;
        Xe[p] = !0;
        var y = "";
        r && r._owner && r._owner !== ke.current && (y = " It was passed a child from " + D(r._owner.type) + "."), H(r), E('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', p, y), H(null);
      }
    }
    function et(r, c) {
      {
        if (typeof r != "object")
          return;
        if (ve(r))
          for (var p = 0; p < r.length; p++) {
            var y = r[p];
            xe(y) && Qe(y, c);
          }
        else if (xe(r))
          r._store && (r._store.validated = !0);
        else if (r) {
          var _ = m(r);
          if (typeof _ == "function" && _ !== r.entries)
            for (var x = _.call(r), v; !(v = x.next()).done; )
              xe(v.value) && Qe(v.value, c);
        }
      }
    }
    function qt(r) {
      {
        var c = r.type;
        if (c == null || typeof c == "string")
          return;
        var p;
        if (typeof c == "function")
          p = c.propTypes;
        else if (typeof c == "object" && (c.$$typeof === l || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        c.$$typeof === A))
          p = c.propTypes;
        else
          return;
        if (p) {
          var y = D(c);
          Pt(p, r.props, "prop", y, r);
        } else if (c.PropTypes !== void 0 && !we) {
          we = !0;
          var _ = D(c);
          E("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _ || "Unknown");
        }
        typeof c.getDefaultProps == "function" && !c.getDefaultProps.isReactClassApproved && E("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function Ht(r) {
      {
        for (var c = Object.keys(r.props), p = 0; p < c.length; p++) {
          var y = c[p];
          if (y !== "children" && y !== "key") {
            H(r), E("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", y), H(null);
            break;
          }
        }
        r.ref !== null && (H(r), E("Invalid attribute `ref` supplied to `React.Fragment`."), H(null));
      }
    }
    var tt = {};
    function rt(r, c, p, y, _, x) {
      {
        var v = M(r);
        if (!v) {
          var b = "";
          (r === void 0 || typeof r == "object" && r !== null && Object.keys(r).length === 0) && (b += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var B = Gt();
          B ? b += B : b += Ze();
          var S;
          r === null ? S = "null" : ve(r) ? S = "array" : r !== void 0 && r.$$typeof === e ? (S = "<" + (D(r.type) || "Unknown") + " />", b = " Did you accidentally export a JSX literal instead of a component?") : S = typeof r, E("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", S, b);
        }
        var O = Ft(r, c, p, _, x);
        if (O == null)
          return O;
        if (v) {
          var j = c.children;
          if (j !== void 0)
            if (y)
              if (ve(j)) {
                for (var V = 0; V < j.length; V++)
                  et(j[V], r);
                Object.freeze && Object.freeze(j);
              } else
                E("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              et(j, r);
        }
        if (Z.call(c, "key")) {
          var F = D(r), L = Object.keys(c).filter(function(Xt) {
            return Xt !== "key";
          }), Ie = L.length > 0 ? "{key: someKey, " + L.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!tt[F + Ie]) {
            var Zt = L.length > 0 ? "{" + L.join(": ..., ") + ": ...}" : "{}";
            E(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, Ie, F, Zt, F), tt[F + Ie] = !0;
          }
        }
        return r === i ? Ht(O) : qt(O), O;
      }
    }
    function Vt(r, c, p) {
      return rt(r, c, p, !0);
    }
    function Yt(r, c, p) {
      return rt(r, c, p, !1);
    }
    var Jt = Yt, Kt = Vt;
    ee.Fragment = i, ee.jsx = Jt, ee.jsxs = Kt;
  }()), ee;
}
process.env.NODE_ENV === "production" ? Se.exports = Cr() : Se.exports = Ar();
var I = Se.exports;
function Re(t, e, n, i, o = {
  idsSuffixed: !1
}) {
  const a = n.find((s) => s.schema.name === t.type);
  return !a || !a.validate(t, e, o) ? (console.log("INVALID OPERATION", t), i) : a.apply(t, e, i, o);
}
async function Sr(t, e, n) {
  let i = 0, o;
  for await (const a of e) {
    const s = a.operations || [];
    let u = !0;
    for (const l of s.slice(i))
      o = Re(
        l,
        t,
        n,
        u ? o : void 0,
        { idsSuffixed: !0 }
      ), u = !1;
    i = s.length - 1;
  }
}
function Er(t, e) {
  const n = e.schema.inlineContentSchema[t.type];
  return !(!n || n === "text" && !("text" in t));
}
function ht(t, e, n) {
  const i = t.type || n, o = e.schema.blockSchema[i];
  if (!o)
    return !1;
  if (t.children, o.content === "none") {
    if (t.content)
      return !1;
  } else {
    if (!t.content)
      return !0;
    if (!Array.isArray(t.content))
      return !1;
    if (o.content === "table")
      return !0;
    if (!t.content.every((a) => Er(a, e)))
      return !1;
  }
  return !0;
}
const gt = {
  name: "add",
  description: "Insert new blocks",
  parameters: {
    referenceId: {
      type: "string",
      description: ""
    },
    position: {
      type: "string",
      enum: ["before", "after"],
      description: "Whether new block(s) should be inserterd before or after `referenceId`"
    },
    blocks: {
      items: {
        $ref: "#/$defs/block"
        // type: "object",
        // properties: {},
      },
      type: "array"
    }
  },
  required: ["referenceId", "position", "blocks"]
};
function Or(t, e, n, i) {
  let o = t.referenceId;
  i.idsSuffixed && (o = o.slice(0, -1));
  const a = n || [], s = t.blocks.slice(0, a.length);
  for (let l = 0; l < s.length; l++)
    e.updateBlock(a[l], s[l]);
  const u = t.blocks.slice(a.length);
  if (u.length > 0) {
    if (s.length === 0)
      return [...e.insertBlocks(u, o, t.position).map((f) => f.id)];
    const l = e.insertBlocks(
      u,
      a[a.length - 1],
      "after"
    );
    return {
      operationContext: [...a, ...l.map((d) => d.id)],
      lastAffectedBlockId: l[l.length - 1]
    };
  }
  return {
    operationContext: a,
    lastAffectedBlockId: a.length > 0 ? a[a.length - 1] : void 0
  };
}
function Rr(t, e, n) {
  if (t.type !== gt.name || t.position !== "before" && t.position !== "after")
    return !1;
  let i = t.referenceId;
  if (n.idsSuffixed) {
    if (!(i != null && i.endsWith("$")))
      return !1;
    i = i.slice(0, -1);
  }
  return !e.getBlock(i) || !t.blocks || t.blocks.length === 0 ? !1 : t.blocks.every(
    (a) => ht(a, e)
  );
}
const ne = {
  schema: gt,
  apply: Or,
  validate: Rr
}, yt = {
  name: "delete",
  description: "Delete a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to delete"
    }
  },
  required: ["id"]
};
function Pr(t, e, n, i) {
  let o = t.id;
  i.idsSuffixed && (o = o.slice(0, -1)), e.removeBlocks([o]);
}
function Br(t, e, n) {
  if (t.type !== yt.name)
    return !1;
  let i = t.id;
  if (n.idsSuffixed) {
    if (!(i != null && i.endsWith("$")))
      return !1;
    i = i.slice(0, -1);
  }
  return !!e.getBlock(i);
}
const bt = {
  schema: yt,
  apply: Pr,
  validate: Br
}, vt = {
  name: "update",
  description: "Update a block",
  parameters: {
    id: {
      type: "string",
      description: "id of block to update"
    },
    block: {
      $ref: "#/$defs/block"
      // type: "object",
      // properties: {},
    }
  },
  required: ["id", "block"]
};
function Lr(t, e, n, i) {
  let o = t.id;
  i.idsSuffixed && (o = o.slice(0, -1)), e.updateBlock(o, t.block);
}
function Tr(t, e, n) {
  if (t.type !== vt.name)
    return !1;
  let i = t.id;
  if (n.idsSuffixed) {
    if (!(i != null && i.endsWith("$")))
      return !1;
    i = i.slice(0, -1);
  }
  if (!t.block)
    return !1;
  const o = e.getBlock(i);
  return o ? ht(t.block, e, o.type) : (console.error("BLOCK NOT FOUND", i), !1);
}
const ie = {
  schema: vt,
  apply: Lr,
  validate: Tr
};
function Pe(t) {
  return t.map((e) => ({
    ...e,
    id: `${e.id}$`,
    children: Pe(e.children)
  }));
}
function jr(t) {
  if (!t.editor.getSelection())
    throw new Error("No selection");
  return [
    {
      role: "system",
      content: `You're manipulating a text document. Make sure to follow the json schema provided. 
            The user selected everything between [$! and !$], including blocks in between.`
    },
    {
      role: "system",
      content: JSON.stringify(Pe(t.document))
    },
    {
      role: "system",
      content: "Make sure to ONLY affect the selected text and blocks (split words if necessary), and don't include the markers in the response."
    },
    {
      role: "user",
      content: t.userPrompt
    }
  ];
}
function Mr(t) {
  return [
    {
      role: "system",
      content: "You're manipulating a text document. Make sure to follow the json schema provided. This is the document:"
    },
    {
      role: "system",
      content: JSON.stringify(Pe(t.document))
    },
    {
      role: "system",
      content: `This would be an example block: 
` + JSON.stringify({
        type: "paragraph",
        props: {},
        content: [
          {
            type: "text",
            text: "Bold text",
            styles: {
              bold: !0
            }
          },
          {
            type: "text",
            text: " and italic text",
            styles: {
              italic: !0
            }
          }
        ]
      })
    },
    {
      role: "user",
      content: t.userPrompt
    }
  ];
}
function Dr(t) {
  return {
    type: "object",
    description: t.schema.description,
    properties: {
      type: {
        type: "string",
        enum: [t.schema.name]
      },
      ...t.schema.parameters
    },
    required: ["type", ...t.schema.required],
    additionalProperties: !1
  };
}
function Ur(t) {
  return {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          anyOf: t.map((e) => Dr(e))
        }
      }
    },
    additionalProperties: !1,
    required: ["operations"]
  };
}
function Nr(t) {
  const e = {}, n = {};
  return t.forEach((o) => {
    const { type: a, ...s } = o.properties, u = JSON.stringify(s);
    e[u] ? e[u].push(a.enum[0]) : (e[u] = [a.enum[0]], n[u] = o);
  }), Object.keys(
    e
  ).map((o) => {
    const a = n[o];
    return {
      ...a,
      properties: {
        ...a.properties,
        type: {
          type: "string",
          enum: e[o]
        }
      }
    };
  });
}
function $r(t) {
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(t).map(([e, n]) => [
        e,
        {
          type: n.propSchema
        }
      ])
    ),
    additionalProperties: !1
  };
}
function zr() {
  return {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["text"]
      },
      text: {
        type: "string"
      },
      styles: {
        $ref: "#/$defs/styles"
      }
    },
    additionalProperties: !1,
    required: ["type", "text"]
  };
}
function _t(t) {
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(t).filter(([e, n]) => n.default !== void 0).map(([e, n]) => [
        e,
        {
          type: typeof n.default,
          enum: n.values
        }
      ])
    ),
    additionalProperties: !1
  };
}
function Fr(t) {
  return {
    type: "array",
    items: {
      anyOf: Object.entries(t).map(([e, n]) => n === "text" ? {
        $ref: "#/$defs/styledtext"
      } : n === "link" ? {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["link"]
          },
          content: {
            type: "array",
            items: {
              $ref: "#/$defs/styledtext"
            }
          },
          href: {
            type: "string"
          }
        },
        additionalProperties: !1,
        required: ["type", "href", "content"]
      } : {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [n.type]
          },
          content: n.content === "styled" ? {
            type: "array",
            items: {
              $ref: "#/$defs/styledtext"
            }
          } : void 0,
          props: {
            type: "object",
            properties: _t(n.propSchema),
            additionalProperties: !1
          }
        },
        additionalProperties: !1,
        required: ["type", ...n.content === "styled" ? ["content"] : []]
      })
    }
  };
}
function Gr(t) {
  return {
    anyOf: Nr(
      Object.entries(t).map(([e, n]) => ({
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [n.type]
          },
          content: n.content === "inline" ? { $ref: "#/$defs/inlinecontent" } : n.content === "table" ? { type: "object", properties: {} } : void 0,
          // filter out default props (TODO: make option)
          props: _t(n.propSchema)
          // Object.fromEntries(
          //   Object.entries(val.propSchema).filter(
          //     (key) => typeof (defaultProps as any)[key[0]] === "undefined"
          //   )
          // )
          // ),
        },
        additionalProperties: !1,
        required: ["type"]
      }))
    )
  };
}
function Wr(t) {
  return t = qr(t).removeFileBlocks().removeDefaultProps().get(), {
    $defs: {
      styles: $r(t.styleSchema),
      styledtext: zr(),
      inlinecontent: Fr(
        t.inlineContentSchema
      ),
      block: Gr(t.blockSchema)
    }
  };
}
function qr(t) {
  const e = JSON.parse(
    JSON.stringify({
      blockSchema: t.blockSchema,
      inlineContentSchema: t.inlineContentSchema,
      styleSchema: t.styleSchema
    })
  );
  return {
    removeFileBlocks() {
      return e.blockSchema = Object.fromEntries(
        Object.entries(e.blockSchema).filter(
          ([n, i]) => !i.isFileBlock
        )
      ), this;
    },
    removeDefaultProps() {
      return e.blockSchema = Object.fromEntries(
        Object.entries(e.blockSchema).map(([n, i]) => [
          n,
          {
            ...i,
            propSchema: Object.fromEntries(
              Object.entries(i.propSchema).filter(
                (o) => typeof ur[o[0]] > "u"
              )
            )
          }
        ])
      ), this;
    },
    get() {
      return e;
    }
  };
}
async function Hr(t, e) {
  const { prompt: n, useSelection: i, ...o } = e;
  let a;
  "messages" in e && e.messages ? a = e.messages : i ? a = jr({
    editor: t,
    userPrompt: e.prompt,
    document: t.getDocumentWithSelectionMarkers()
  }) : a = Mr({
    editor: t,
    userPrompt: e.prompt,
    document: t.document
  });
  const s = {
    functions: [ie, ne, bt],
    stream: !0,
    messages: a,
    ...o
  }, u = ar({
    ...Ur(s.functions),
    $defs: Wr(t.schema).$defs
  });
  if (s.stream) {
    const d = sr({
      model: s.model,
      mode: "tool",
      schema: u,
      messages: s.messages,
      ...s._streamObjectOptions
    });
    return await Sr(
      t,
      d.partialObjectStream,
      s.functions
    ), d;
  }
  const l = await lr({
    model: s.model,
    mode: "tool",
    schema: u,
    messages: s.messages,
    ...s._generateObjectOptions
  });
  if (!l.object.operations)
    throw new Error("No operations returned");
  for (const d of l.object.operations)
    await Re(d, t, s.functions, void 0, {
      idsSuffixed: !0
      // TODO: not needed for this, but would need to refactor promptbuilding
    });
  return l;
}
function pe(t, e) {
  const n = t.findIndex((i) => !e(i));
  return n === -1 ? t.splice(0, t.length) : t.splice(0, n);
}
function at(t) {
  const e = [];
  for (const n of t)
    n.type === "list" ? e.push(...n.children) : e.push(n);
  return e;
}
function Ee(t, e, n) {
  const i = t.replace(e, n);
  return i === t ? i : Ee(i, e, n);
}
async function Vr(t, e) {
  t = Ee(
    t,
    /\n\n\n\n/g,
    `

[EMPTY-LINE]

`
  ), e = Ee(
    e,
    /\n\n\n\n/g,
    `

[EMPTY-LINE]

`
  );
  const n = Ae().use(nt).parse(t), i = Ae().use(nt).parse(e), o = hr.diffChars(t, e), a = [];
  let s = 0, u = 0;
  const l = [...at(n.children)], d = [...at(i.children)], f = /* @__PURE__ */ new Map();
  for (const h of o) {
    let w = s, C = u;
    if (h.added ? C = u + h.value.length : h.removed ? w = s + h.value.length : (w = s + h.value.length, C = u + h.value.length), !h.added) {
      for (const g of l)
        if (g.position.start.offset < w && g.position.end.offset > s)
          f.set(g, [...f.get(g) || [], h]);
        else if (g.position.start.offset > w)
          break;
    }
    if (!h.removed) {
      for (const g of d)
        if (g.position.start.offset < C && g.position.end.offset > u)
          f.set(g, [...f.get(g) || [], h]);
        else if (g.position.start.offset > C)
          break;
    }
    s = w, u = C;
  }
  for (const h of o) {
    if (h.added) {
      const g = pe(
        d,
        (m) => f.get(m).some((k) => k === h) && f.get(m).length === 1
        // the only diff on a block is this "add", so add the block
      );
      for (const m of g)
        a.push({ type: "add", newBlock: m });
      continue;
    }
    if (h.removed) {
      const g = pe(
        l,
        (m) => f.get(m).some((k) => k === h) && f.get(m).length === 1
        // the only diff on a block is this "remove", so remove the block
      );
      for (const m of g)
        a.push({ type: "remove", oldBlock: m });
      continue;
    }
    const w = pe(
      d,
      (g) => f.get(g).some((m) => m === h)
    ), C = pe(
      l,
      (g) => f.get(g).some((m) => h === m)
    );
    for (; w.length || C.length; ) {
      const g = w.shift(), m = C.shift();
      if (!g && !m)
        throw new Error("No matching blocks found");
      g ? m ? f.get(m).every((k) => !k.added && !k.removed) && f.get(g).every((k) => !k.added && !k.removed) ? a.push({ type: "unchanged", newBlock: g, oldBlock: m }) : a.push({ type: "changed", newBlock: g, oldBlock: m }) : a.push({ type: "add", newBlock: g }) : a.push({ type: "remove", oldBlock: m });
    }
  }
  function A(h) {
    var w, C;
    return ((w = h.oldBlock) == null ? void 0 : w.type) === "paragraph" && h.oldBlock.children.length === 1 && h.oldBlock.children[0].type === "text" && h.oldBlock.children[0].value === "[EMPTY-LINE]" && (h.oldBlock.children[0].value = ""), ((C = h.newBlock) == null ? void 0 : C.type) === "paragraph" && h.newBlock.children.length === 1 && h.newBlock.children[0].type === "text" && h.newBlock.children[0].value === "[EMPTY-LINE]" && (h.newBlock.children[0].value = ""), h;
  }
  for (const h of a)
    A(h);
  return a;
}
const fe = function(t) {
  const e = typeof t;
  return t == null ? "null" : e === "object" && t.constructor === Array ? "array" : e === "object" && t instanceof Date ? "date" : e;
}, de = function(t, e) {
  const n = typeof t;
  if (Array.isArray(t))
    return t.map((i) => de(i, e));
  if (n === "object") {
    for (const i in t)
      t[i] = de(t[i], e);
    return t;
  } else return n === "number" && Number.isFinite(t) && !Number.isInteger(t) ? +t.toFixed(e) : t;
};
class Yr {
  constructor(e) {
    this.options = e, e.outputKeys = e.outputKeys || [], e.excludeKeys = e.excludeKeys || [];
  }
  isScalar(e) {
    return typeof e != "object" || e === null;
  }
  objectDiff(e, n) {
    let i = {}, o = 0, a = !0;
    for (const [s, u] of Object.entries(e))
      if (!this.options.outputNewOnly) {
        const l = "__deleted";
        !(s in n) && !this.options.excludeKeys.includes(s) && (i[`${s}${l}`] = u, o -= 30, a = !1);
      }
    for (const [s, u] of Object.entries(n)) {
      const l = this.options.outputNewOnly ? "" : "__added";
      !(s in e) && !this.options.excludeKeys.includes(s) && (i[`${s}${l}`] = u, o -= 30, a = !1);
    }
    for (const [s, u] of Object.entries(e))
      if (s in n) {
        if (this.options.excludeKeys.includes(s))
          continue;
        o += 20;
        const l = n[s], d = this.diff(u, l);
        d.equal ? (this.options.full || this.options.outputKeys.includes(s)) && (i[s] = u) : (i[s] = d.result, a = !1), o += Math.min(20, Math.max(-10, d.score / 5));
      }
    return a ? (o = 100 * Math.max(Object.keys(e).length, 0.5), this.options.full || (i = void 0)) : o = Math.max(0, o), { score: o, result: i, equal: a };
  }
  findMatchingObject(e, n, i) {
    let o = null;
    for (const [a, { item: s, index: u }] of Object.entries(
      i
    ))
      if (a !== "__next") {
        const l = Math.abs(u - n);
        if (fe(e) === fe(s)) {
          const { score: d } = this.diff(e, s);
          (!o || d > o.score || d === o.score && l < o.indexDistance) && (o = { score: d, key: a, indexDistance: l });
        }
      }
    return o;
  }
  scalarize(e, n, i) {
    const o = [];
    if (i) {
      const s = {};
      for (let u = 0; u < e.length; u++) {
        const l = e[u];
        if (this.isScalar(l))
          continue;
        const d = this.findMatchingObject(l, u, i);
        d && (!s[d.key] || d.score > s[d.key].score) && (s[d.key] = { score: d.score, index: u });
      }
      for (const [u, l] of Object.entries(s))
        o[l.index] = u;
    }
    const a = [];
    for (let s = 0; s < e.length; s++) {
      const u = e[s];
      if (this.isScalar(u))
        a.push(u);
      else {
        const l = o[s] || "__$!SCALAR" + n.__next++;
        n[l] = { item: u, index: s }, a.push(l);
      }
    }
    return a;
  }
  isScalarized(e, n) {
    return typeof e == "string" && e in n;
  }
  descalarize(e, n) {
    return this.isScalarized(e, n) ? n[e].item : e;
  }
  arrayDiff(e, n) {
    const i = { __next: 1 }, o = this.scalarize(e, i), a = { __next: i.__next }, s = this.scalarize(n, a, i);
    this.options.sort && (o.sort(), s.sort());
    const u = new gr(null, o, s).getOpcodes();
    let l = [], d = 0, f = !0;
    for (const [A, h, w, C, g] of u) {
      let m, k, E, G, Y, W, J, q;
      switch (A === "equal" || this.options.keysOnly && A === "replace" || (f = !1), A) {
        case "equal":
          for (m = h, G = w, E = h <= G; E ? m < G : m > G; E ? m++ : m--) {
            const R = o[m];
            if (this.isScalarized(R, i)) {
              if (!this.isScalarized(R, a))
                throw new Error(
                  `internal bug: isScalarized(item, originals1) != isScalarized(item, originals2) for item ${JSON.stringify(
                    R
                  )}`
                );
              const P = this.descalarize(R, i), M = this.descalarize(R, a), N = this.diff(P, M);
              N.equal ? this.options.full || this.options.keepUnchangedValues ? l.push([" ", P]) : l.push([" "]) : (l.push(["~", N.result]), f = !1);
            } else
              this.options.full || this.options.keepUnchangedValues ? l.push([" ", R]) : l.push([" "]);
            d += 10;
          }
          break;
        case "delete":
          for (m = h, W = w, Y = h <= W; Y ? m < W : m > W; Y ? m++ : m--)
            l.push(["-", this.descalarize(o[m], i)]), d -= 5;
          break;
        case "insert":
          for (k = C, q = g, J = C <= q; J ? k < q : k > q; J ? k++ : k--)
            l.push(["+", this.descalarize(s[k], a)]), d -= 5;
          break;
        case "replace":
          if (this.options.keysOnly) {
            let R, P;
            for (m = h, P = w, R = h <= P; R ? m < P : m > P; R ? m++ : m--) {
              const M = this.diff(
                this.descalarize(o[m], i),
                this.descalarize(s[m - h + C], a)
              );
              M.equal ? l.push([" "]) : (l.push(["~", M.result]), f = !1);
            }
          } else {
            let R, P, M, N;
            for (m = h, P = w, R = h <= P; R ? m < P : m > P; R ? m++ : m--)
              l.push(["-", this.descalarize(o[m], i)]), d -= 5;
            for (k = C, N = g, M = C <= N; M ? k < N : k > N; M ? k++ : k--)
              l.push(["+", this.descalarize(s[k], a)]), d -= 5;
          }
          break;
      }
    }
    return f || u.length === 0 ? (this.options.full ? l = e : l = void 0, d = 100) : d = Math.max(0, d), { score: d, result: l, equal: f };
  }
  diff(e, n) {
    const i = fe(e), o = fe(n);
    if (i === o)
      switch (i) {
        case "object":
          return this.objectDiff(e, n);
        case "array":
          return this.arrayDiff(e, n);
      }
    let a = 100, s = e, u;
    return this.options.keysOnly ? (u = !0, s = void 0) : (i === "date" && o === "date" ? u = e.getTime() === n.getTime() : u = e === n, u ? this.options.full || (s = void 0) : (a = 0, this.options.outputNewOnly ? s = n : s = { __old: e, __new: n })), { score: a, result: s, equal: u };
  }
}
function Jr(t, e, n = {}) {
  return n.precision !== void 0 && (t = de(t, n.precision), e = de(e, n.precision)), new Yr(n).diff(t, e).result;
}
async function Kr(t, e, n, i) {
  if (n === i)
    throw new Error("Markdown is unchanged");
  const o = await t.tryParseMarkdownToBlocks(
    n
  );
  if (o.length !== 1)
    throw new Error("Old markdown is not a single block");
  const a = o[0], s = await t.tryParseMarkdownToBlocks(
    i
  );
  if (s.length !== 1)
    throw new Error("New markdown is not a single block");
  const u = s[0], l = Jr(a, u);
  if (Array.isArray(l) || typeof l != "object")
    throw new Error("json diff is not a single change");
  const d = {};
  if (l.props) {
    d.props = {};
    for (const f in l.props)
      f.endsWith("__added") ? d.props[f.replace("__added", "")] = l.props[f] : f.endsWith("__deleted") ? d.props[f.replace("__deleted", "")] = void 0 : d.props[f] = l.props[f].__new;
  }
  return l.content && (d.content = u.content), l.type && (d.type = u.type), d;
}
function Ce(t) {
  return Ae().use(yr).stringify(t);
}
function kt(t) {
  return t.flatMap((e) => [e, ...kt(e.children)]);
}
async function Zr(t, e, n) {
  const i = [];
  if (e = kt(e), n.filter((s) => s.type !== "add").length !== e.length)
    throw new Error(
      "Number of nodes in markdown diff does not match number of blocks"
    );
  let o, a = 0;
  for (const s of n)
    if (s.type === "add") {
      const u = await t.tryParseMarkdownToBlocks(
        Ce(s.newBlock)
      );
      if (u.length !== 1)
        throw new Error("Expected single block to be added");
      const l = u[0];
      if (i.length > 0 && i[i.length - 1].type === "add")
        i[i.length - 1].blocks.push(l);
      else {
        const d = a < e.length ? {
          position: "before",
          referenceId: e[a].id
        } : {
          position: "after",
          referenceId: o
        };
        i.push({
          type: "add",
          ...d,
          blocks: [l]
        });
      }
    } else if (s.type === "remove")
      i.push({
        type: "delete",
        id: e[a].id
      }), a++;
    else if (s.type === "unchanged")
      o = e[a].id, a++;
    else if (s.type === "changed") {
      o = e[a].id;
      const u = await Kr(
        t,
        e[a],
        Ce(s.oldBlock),
        Ce(s.newBlock)
      );
      i.push({
        type: "update",
        id: e[a].id,
        block: u
      }), a++;
    }
  return i;
}
function Xr(t) {
  return [
    {
      role: "system",
      content: "You're manipulating a markdown document. Send me the new markdown of the entire updated document. Don't include any other text, comments or wrapping marks. Next message is the existing document in markdown:"
    },
    {
      role: "user",
      content: t.markdown
    },
    {
      role: "user",
      content: t.userPrompt
    }
  ];
}
function Qr(t) {
  return [
    {
      role: "system",
      content: "You're manipulating a markdown document. The user selected everything between [$! and !$], including blocks in between. Don't include any other text, comments or wrapping marks. Next message is the existing document in markdown:"
    },
    {
      role: "user",
      content: t.markdown
    },
    {
      role: "system",
      content: "Return the ENTIRE markdown document (including parts outside the selection), but make sure to ONLY change the selected text (text between [$! and !$]), keep the rest of the document unchanged. DO NOT include the markers in the response."
    },
    {
      role: "user",
      content: t.userPrompt
    }
  ];
}
function en(t, e) {
  let n = 0, i = t.length;
  for (; n < i && e(t[n]); )
    n++;
  for (; i > n && e(t[i - 1]); )
    i--;
  return t.slice(n, i);
}
async function tn(t, e) {
  let n;
  const i = await t.blocksToMarkdownLossy();
  if ("messages" in e && e.messages)
    n = e.messages;
  else if (e.useSelection) {
    const f = t.getDocumentWithSelectionMarkers(), A = await t.blocksToMarkdownLossy(f);
    n = Qr({
      editor: t,
      markdown: A,
      userPrompt: e.prompt
    });
  } else
    n = Xr({
      editor: t,
      markdown: i,
      userPrompt: e.prompt
    });
  const o = {
    messages: n,
    ...e
    // TODO
  }, a = await cr({
    model: o.model,
    messages: o.messages,
    ...e._generateTextOptions
  }), s = en(t.document, (f) => f.type === "paragraph" && Array.isArray(f.content) && f.content.length === 0), u = a.text.trim(), l = await Vr(i, u), d = await Zr(
    t,
    s,
    l
  );
  for (const f of d)
    await Re(
      f,
      t,
      [ie, ne, bt],
      void 0,
      { idsSuffixed: !1 }
    );
}
const st = {
  json: {
    call: Hr
  },
  markdown: {
    call: tn
  }
}, wt = tr(void 0);
function Be() {
  const t = rr(wt);
  if (!t)
    throw new Error(
      "useBlockNoteAIContext must be used within a BlockNoteAIContextProvider"
    );
  return t;
}
function ei(t) {
  const e = oe(), { children: n, ...i } = t, [o, a] = te(
    void 0
  ), [s, u] = te(e.document), { model: l, dataFormat: d, stream: f } = i, [A, h] = te("initial"), w = re(
    async (C) => {
      u(e.document), h("generating");
      let g;
      try {
        return d === "json" ? g = await st.json.call(e, {
          model: l,
          stream: f,
          ...C
        }) : (C.functions && console.warn(
          "functions are not supported for markdown, ignoring them"
        ), g = await st.markdown.call(e, { model: l, ...C })), h((m) => m === "generating" ? "done" : m), g;
      } catch (m) {
        h("initial"), u(void 0), console.error(m);
      }
    },
    [l, d, f, e]
  );
  return /* @__PURE__ */ I.jsx(
    wt.Provider,
    {
      value: {
        ...i,
        callLLM: w,
        aiMenuBlockID: o,
        setAiMenuBlockID: a,
        prevDocument: s,
        setPrevDocument: u,
        aiResponseStatus: A,
        setAIResponseStatus: h
      },
      children: t.children
    }
  );
}
function ae(t) {
  if (!t.dictionary.ai)
    throw new Error("AI dictionary not found");
  return t.dictionary.ai;
}
function xt() {
  const t = nr();
  return ae(t.editor);
}
var It = {
  color: void 0,
  size: void 0,
  className: void 0,
  style: void 0,
  attr: void 0
}, lt = $.createContext && /* @__PURE__ */ $.createContext(It), rn = ["attr", "size", "title"];
function nn(t, e) {
  if (t == null) return {};
  var n = on(t, e), i, o;
  if (Object.getOwnPropertySymbols) {
    var a = Object.getOwnPropertySymbols(t);
    for (o = 0; o < a.length; o++)
      i = a[o], !(e.indexOf(i) >= 0) && Object.prototype.propertyIsEnumerable.call(t, i) && (n[i] = t[i]);
  }
  return n;
}
function on(t, e) {
  if (t == null) return {};
  var n = {};
  for (var i in t)
    if (Object.prototype.hasOwnProperty.call(t, i)) {
      if (e.indexOf(i) >= 0) continue;
      n[i] = t[i];
    }
  return n;
}
function me() {
  return me = Object.assign ? Object.assign.bind() : function(t) {
    for (var e = 1; e < arguments.length; e++) {
      var n = arguments[e];
      for (var i in n)
        Object.prototype.hasOwnProperty.call(n, i) && (t[i] = n[i]);
    }
    return t;
  }, me.apply(this, arguments);
}
function ct(t, e) {
  var n = Object.keys(t);
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(t);
    e && (i = i.filter(function(o) {
      return Object.getOwnPropertyDescriptor(t, o).enumerable;
    })), n.push.apply(n, i);
  }
  return n;
}
function he(t) {
  for (var e = 1; e < arguments.length; e++) {
    var n = arguments[e] != null ? arguments[e] : {};
    e % 2 ? ct(Object(n), !0).forEach(function(i) {
      an(t, i, n[i]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(n)) : ct(Object(n)).forEach(function(i) {
      Object.defineProperty(t, i, Object.getOwnPropertyDescriptor(n, i));
    });
  }
  return t;
}
function an(t, e, n) {
  return e = sn(e), e in t ? Object.defineProperty(t, e, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : t[e] = n, t;
}
function sn(t) {
  var e = ln(t, "string");
  return typeof e == "symbol" ? e : e + "";
}
function ln(t, e) {
  if (typeof t != "object" || !t) return t;
  var n = t[Symbol.toPrimitive];
  if (n !== void 0) {
    var i = n.call(t, e || "default");
    if (typeof i != "object") return i;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (e === "string" ? String : Number)(t);
}
function Ct(t) {
  return t && t.map((e, n) => /* @__PURE__ */ $.createElement(e.tag, he({
    key: n
  }, e.attr), Ct(e.child)));
}
function U(t) {
  return (e) => /* @__PURE__ */ $.createElement(cn, me({
    attr: he({}, t.attr)
  }, e), Ct(t.child));
}
function cn(t) {
  var e = (n) => {
    var {
      attr: i,
      size: o,
      title: a
    } = t, s = nn(t, rn), u = o || n.size || "1em", l;
    return n.className && (l = n.className), t.className && (l = (l ? l + " " : "") + t.className), /* @__PURE__ */ $.createElement("svg", me({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, n.attr, i, s, {
      className: l,
      style: he(he({
        color: t.color || n.color
      }, n.style), t.style),
      height: u,
      width: u,
      xmlns: "http://www.w3.org/2000/svg"
    }), a && /* @__PURE__ */ $.createElement("title", null, a), t.children);
  };
  return lt !== void 0 ? /* @__PURE__ */ $.createElement(lt.Consumer, null, (n) => e(n)) : e(It);
}
function un(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8 7V11L2 6L8 1V5H13C17.4183 5 21 8.58172 21 13C21 17.4183 17.4183 21 13 21H4V19H13C16.3137 19 19 16.3137 19 13C19 9.68629 16.3137 7 13 7H8Z" }, child: [] }] })(t);
}
function ut(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M17.8492 11.6983L17.1421 10.9912L7.24264 20.8907H3V16.648L14.3137 5.33432L19.9706 10.9912C20.3611 11.3817 20.3611 12.0149 19.9706 12.4054L12.8995 19.4765L11.4853 18.0622L17.8492 11.6983ZM15.7279 9.57696L14.3137 8.16274L5 17.4765V18.8907H6.41421L15.7279 9.57696ZM18.5563 2.50589L21.3848 5.33432C21.7753 5.72484 21.7753 6.35801 21.3848 6.74853L19.9706 8.16274L15.7279 3.9201L17.1421 2.50589C17.5327 2.11537 18.1658 2.11537 18.5563 2.50589Z" }, child: [] }] })(t);
}
function pn(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M15.1986 9.94447C14.7649 9.5337 14.4859 8.98613 14.4085 8.39384L14.0056 5.31138L11.275 6.79724C10.7503 7.08274 10.1433 7.17888 9.55608 7.06948L6.49998 6.50015L7.06931 9.55625C7.17871 10.1435 7.08257 10.7505 6.79707 11.2751L5.31121 14.0057L8.39367 14.4086C8.98596 14.4861 9.53353 14.7651 9.94431 15.1987L12.0821 17.4557L13.4178 14.6486C13.6745 14.1092 14.109 13.6747 14.6484 13.418L17.4555 12.0823L15.1986 9.94447ZM15.2238 15.5079L13.0111 20.1581C12.8687 20.4573 12.5107 20.5844 12.2115 20.442C12.1448 20.4103 12.0845 20.3665 12.0337 20.3129L8.49229 16.5741C8.39749 16.474 8.27113 16.4096 8.13445 16.3918L3.02816 15.7243C2.69958 15.6814 2.46804 15.3802 2.51099 15.0516C2.52056 14.9784 2.54359 14.9075 2.5789 14.8426L5.04031 10.3192C5.1062 10.1981 5.12839 10.058 5.10314 9.92253L4.16 4.85991C4.09931 4.53414 4.3142 4.22086 4.63997 4.16017C4.7126 4.14664 4.78711 4.14664 4.85974 4.16017L9.92237 5.10331C10.0579 5.12855 10.198 5.10637 10.319 5.04048L14.8424 2.57907C15.1335 2.42068 15.4979 2.52825 15.6562 2.81931C15.6916 2.88421 15.7146 2.95507 15.7241 3.02833L16.3916 8.13462C16.4095 8.2713 16.4739 8.39766 16.5739 8.49245L20.3127 12.0338C20.5533 12.2617 20.5636 12.6415 20.3357 12.8821C20.2849 12.9357 20.2246 12.9795 20.1579 13.0112L15.5078 15.224C15.3833 15.2832 15.283 15.3835 15.2238 15.5079ZM16.0206 17.435L17.4348 16.0208L21.6775 20.2634L20.2633 21.6776L16.0206 17.435Z" }, child: [] }] })(t);
}
function fn(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8.00008 6V9H5.00008V6H8.00008ZM3.00008 4V11H10.0001V4H3.00008ZM13.0001 4H21.0001V6H13.0001V4ZM13.0001 11H21.0001V13H13.0001V11ZM13.0001 18H21.0001V20H13.0001V18ZM10.7072 16.2071L9.29297 14.7929L6.00008 18.0858L4.20718 16.2929L2.79297 17.7071L6.00008 20.9142L10.7072 16.2071Z" }, child: [] }] })(t);
}
function dn(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M15 18H16.5C17.8807 18 19 16.8807 19 15.5C19 14.1193 17.8807 13 16.5 13H3V11H16.5C18.9853 11 21 13.0147 21 15.5C21 17.9853 18.9853 20 16.5 20H15V22L11 19L15 16V18ZM3 4H21V6H3V4ZM9 18V20H3V18H9Z" }, child: [] }] })(t);
}
function mn(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M13 6V21H11V6H5V4H19V6H13Z" }, child: [] }] })(t);
}
function hn(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M6.23509 6.45329C4.85101 7.89148 4 9.84636 4 12C4 16.4183 7.58172 20 12 20C13.0808 20 14.1116 19.7857 15.0521 19.3972C15.1671 18.6467 14.9148 17.9266 14.8116 17.6746C14.582 17.115 13.8241 16.1582 12.5589 14.8308C12.2212 14.4758 12.2429 14.2035 12.3636 13.3943L12.3775 13.3029C12.4595 12.7486 12.5971 12.4209 14.4622 12.1248C15.4097 11.9746 15.6589 12.3533 16.0043 12.8777C16.0425 12.9358 16.0807 12.9928 16.1198 13.0499C16.4479 13.5297 16.691 13.6394 17.0582 13.8064C17.2227 13.881 17.428 13.9751 17.7031 14.1314C18.3551 14.504 18.3551 14.9247 18.3551 15.8472V15.9518C18.3551 16.3434 18.3168 16.6872 18.2566 16.9859C19.3478 15.6185 20 13.8854 20 12C20 8.70089 18.003 5.8682 15.1519 4.64482C14.5987 5.01813 13.8398 5.54726 13.575 5.91C13.4396 6.09538 13.2482 7.04166 12.6257 7.11976C12.4626 7.14023 12.2438 7.12589 12.012 7.11097C11.3905 7.07058 10.5402 7.01606 10.268 7.75495C10.0952 8.2232 10.0648 9.49445 10.6239 10.1543C10.7134 10.2597 10.7307 10.4547 10.6699 10.6735C10.59 10.9608 10.4286 11.1356 10.3783 11.1717C10.2819 11.1163 10.0896 10.8931 9.95938 10.7412C9.64554 10.3765 9.25405 9.92233 8.74797 9.78176C8.56395 9.73083 8.36166 9.68867 8.16548 9.64736C7.6164 9.53227 6.99443 9.40134 6.84992 9.09302C6.74442 8.8672 6.74488 8.55621 6.74529 8.22764C6.74529 7.8112 6.74529 7.34029 6.54129 6.88256C6.46246 6.70541 6.35689 6.56446 6.23509 6.45329ZM12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22Z" }, child: [] }] })(t);
}
function gn(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" }, child: [] }] })(t);
}
function yn(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M9.9997 15.1709L19.1921 5.97852L20.6063 7.39273L9.9997 17.9993L3.63574 11.6354L5.04996 10.2212L9.9997 15.1709Z" }, child: [] }] })(t);
}
function Le(t) {
  return U({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M17.0007 1.20825 18.3195 3.68108 20.7923 4.99992 18.3195 6.31876 17.0007 8.79159 15.6818 6.31876 13.209 4.99992 15.6818 3.68108 17.0007 1.20825ZM8.00065 4.33325 10.6673 9.33325 15.6673 11.9999 10.6673 14.6666 8.00065 19.6666 5.33398 14.6666.333984 11.9999 5.33398 9.33325 8.00065 4.33325ZM19.6673 16.3333 18.0007 13.2083 16.334 16.3333 13.209 17.9999 16.334 19.6666 18.0007 22.7916 19.6673 19.6666 22.7923 17.9999 19.6673 16.3333Z" }, child: [] }] })(t);
}
const bn = (t) => {
  const e = ft(), { onManualPromptSubmit: n, promptText: i, onPromptTextChange: o } = t, [a, s] = te(""), u = i || a, l = re(
    async (g) => {
      g.key === "Enter" && n(u);
    },
    [u, n]
  ), d = re(
    (g) => {
      const m = g.currentTarget.value;
      o && o(m), i === void 0 && s(m);
    },
    [o, s, i]
  ), f = Oe(() => pr(t.items, u), [u, t.items]), { selectedIndex: A, setSelectedIndex: h, handler: w } = ir(f, (g) => g.onItemClick()), C = re(
    (g) => {
      g.key === "Enter" ? f.length > 0 ? w(g) : l(g) : w(g);
    },
    [l, w, f.length]
  );
  return pt(() => {
    h(0);
  }, [u, h]), /* @__PURE__ */ I.jsxs("div", { className: "bn-combobox", children: [
    /* @__PURE__ */ I.jsx(e.Generic.Form.Root, { children: /* @__PURE__ */ I.jsx(
      e.Generic.Form.TextInput,
      {
        className: "bn-combobox-input",
        name: "ai-prompt",
        variant: "large",
        icon: /* @__PURE__ */ I.jsx(Le, {}),
        value: u || "",
        autoFocus: !0,
        placeholder: t.placeholder,
        disabled: t.disabled,
        onKeyDown: C,
        onChange: d,
        autoComplete: "off"
      },
      "input-" + t.disabled
    ) }),
    /* @__PURE__ */ I.jsx(
      e.SuggestionMenu.Root,
      {
        className: "bn-combobox-items",
        id: "ai-suggestion-menu",
        children: f.map((g, m) => /* @__PURE__ */ I.jsx(
          e.SuggestionMenu.Item,
          {
            className: fr(
              "bn-suggestion-menu-item",
              g.size === "small" ? "bn-suggestion-menu-item-small" : ""
            ),
            id: g.key,
            isSelected: m === A,
            onClick: g.onItemClick,
            item: g
          },
          g.key
        ))
      }
    )
  ] });
};
function vn(t, e) {
  const n = ae(t);
  return [
    {
      key: "continue_writing",
      title: n.ai_menu.continue_writing.title,
      aliases: n.ai_menu.continue_writing.aliases,
      icon: /* @__PURE__ */ I.jsx(ut, { size: 18 }),
      onItemClick: async () => {
        await e.callLLM({
          prompt: "Continue writing",
          // By default, LLM will be able to add / update / delete blocks. For "continue writing", we only want to allow adding new blocks.
          functions: [ne]
        });
      },
      size: "small"
    },
    {
      key: "summarize",
      title: n.ai_menu.summarize.title,
      aliases: n.ai_menu.summarize.aliases,
      icon: /* @__PURE__ */ I.jsx(dn, { size: 18 }),
      onItemClick: async () => {
        await e.callLLM({
          prompt: "Summarize",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          functions: [ne]
        });
      },
      size: "small"
    },
    {
      key: "action_items",
      title: n.ai_menu.add_action_items.title,
      aliases: n.ai_menu.add_action_items.aliases,
      icon: /* @__PURE__ */ I.jsx(fn, { size: 18 }),
      onItemClick: async () => {
        await e.callLLM({
          prompt: "Add action items",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          functions: [ne]
        });
      },
      size: "small"
    },
    {
      key: "write_anything",
      title: n.ai_menu.write_anything.title,
      aliases: n.ai_menu.write_anything.aliases,
      icon: /* @__PURE__ */ I.jsx(ut, { size: 18 }),
      onItemClick: (i) => {
        i(n.ai_menu.write_anything.prompt_placeholder);
      },
      size: "small"
    }
  ];
}
function _n(t, e) {
  const n = ae(t);
  return [
    {
      key: "improve_writing",
      title: n.ai_menu.improve_writing.title,
      aliases: n.ai_menu.improve_writing.aliases,
      icon: /* @__PURE__ */ I.jsx(mn, { size: 18 }),
      onItemClick: async () => {
        await e.callLLM({
          useSelection: !0,
          prompt: "Improve writing",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          functions: [ie]
        });
      },
      size: "small"
    },
    {
      key: "fix_spelling",
      title: n.ai_menu.fix_spelling.title,
      aliases: n.ai_menu.fix_spelling.aliases,
      icon: /* @__PURE__ */ I.jsx(yn, { size: 18 }),
      onItemClick: async () => {
        await e.callLLM({
          useSelection: !0,
          prompt: "Fix spelling",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          functions: [ie]
        });
      },
      size: "small"
    },
    {
      key: "translate",
      title: n.ai_menu.translate.title,
      aliases: n.ai_menu.translate.aliases,
      icon: /* @__PURE__ */ I.jsx(hn, { size: 18 }),
      onItemClick: (i) => {
        i(n.ai_menu.translate.prompt_placeholder);
      },
      size: "small"
    },
    {
      key: "simplify",
      title: n.ai_menu.simplify.title,
      aliases: n.ai_menu.simplify.aliases,
      icon: /* @__PURE__ */ I.jsx(pn, { size: 18 }),
      onItemClick: async () => {
        await e.callLLM({
          useSelection: !0,
          prompt: "Simplify",
          // By default, LLM will be able to add / update / delete blocks. For "summarize", we only want to allow adding new blocks.
          functions: [ie]
        });
      },
      size: "small"
    }
  ];
}
function kn(t, e) {
  const n = ae(t);
  return [
    {
      key: "accept",
      title: n.ai_menu.accept.title,
      aliases: n.ai_menu.accept.aliases,
      icon: /* @__PURE__ */ I.jsx(gn, { size: 18 }),
      onItemClick: (i) => {
        e.setAiMenuBlockID(void 0), e.setPrevDocument(void 0), e.setAIResponseStatus("initial");
      },
      size: "small"
    },
    // TODO: retry UX
    // {
    //   key: "retry",
    //   title: dict.ai_menu.retry.title,
    //   aliases: dict.ai_menu.retry.aliases,
    //   icon: <RiLoopLeftFill size={18} />,
    //   onItemClick: () => {
    //     console.log("RETRY");
    //   },
    //   size: "small",
    // },
    {
      key: "revert",
      title: n.ai_menu.revert.title,
      aliases: n.ai_menu.revert.aliases,
      icon: /* @__PURE__ */ I.jsx(un, { size: 18 }),
      onItemClick: () => {
        t.replaceBlocks(t.document, e.prevDocument), e.setAiMenuBlockID(void 0), e.setPrevDocument(void 0), e.setAIResponseStatus("initial");
      },
      size: "small"
    }
  ];
}
const wn = (t) => {
  const e = oe(), [n, i] = te(""), o = xt(), a = Be(), { aiResponseStatus: s } = a, { items: u } = t, l = Oe(() => {
    let f = [];
    return u ? f = u(e, a, s) : s === "initial" ? f = e.getSelection() ? _n(e, a) : vn(e, a) : a.aiResponseStatus === "done" && (f = kn(e, a)), f.map((A) => ({
      ...A,
      onItemClick: () => {
        A.onItemClick(i);
      }
    }));
  }, [u, s, e, a]), d = re(
    async (f) => {
      await a.callLLM({
        prompt: f,
        useSelection: e.getSelection() !== void 0
      });
    },
    [a, e]
  );
  return pt(() => {
    s === "done" && i("");
  }, [s]), /* @__PURE__ */ I.jsx(
    bn,
    {
      onManualPromptSubmit: t.onManualPromptSubmit || d,
      items: l,
      promptText: n,
      onPromptTextChange: i,
      placeholder: s === "generating" ? "Generating..." : o.formatting_toolbar.ai.input_placeholder,
      disabled: s === "generating"
    }
  );
}, xn = (t) => {
  const e = document.querySelector(
    `[data-id="${t.blockID}"]`
  ), n = Oe(() => e ? {
    getBoundingClientRect: () => e.getBoundingClientRect(),
    contextElement: e
  } : null, [e]), { isMounted: i, ref: o, style: a, getFloatingProps: s } = or(
    !!e,
    n,
    3e3,
    {
      // canDismiss: false,
      placement: "bottom",
      middleware: [
        br(10),
        vr(),
        _r({
          apply({ rects: u, elements: l }) {
            Object.assign(l.floating.style, {
              width: `${u.reference.width}px`
            });
          }
        })
      ],
      onOpenChange: t.onOpenChange,
      whileElementsMounted: kr
    }
  );
  return i ? /* @__PURE__ */ I.jsx(
    "div",
    {
      ref: o,
      style: {
        ...a
        // top: state.blockIsEmpty ? -state.referencePos.height - 3 : style.top,
      },
      ...s(),
      children: t.children
    }
  ) : null;
};
function ti(t) {
  if (!oe())
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider"
    );
  return /* @__PURE__ */ I.jsx(I.Fragment, { children: t.aiMenu !== !1 && /* @__PURE__ */ I.jsx(In, {}) });
}
const In = () => {
  const t = oe(), e = Be();
  return /* @__PURE__ */ I.jsx(
    xn,
    {
      blockID: e.aiMenuBlockID,
      onOpenChange: (n) => {
        !n && e.aiMenuBlockID && (e.setAiMenuBlockID(void 0), e.setAIResponseStatus("initial"), e.setPrevDocument(void 0), t.focus());
      },
      children: /* @__PURE__ */ I.jsx(wn, {})
    }
  );
}, ri = () => {
  const t = xt(), e = ft(), n = Be(), i = oe(), o = () => {
    i.formattingToolbar.closeMenu();
    const a = i.getTextCursorPosition().block;
    n.setAiMenuBlockID(a.id);
  };
  return i.isEditable ? /* @__PURE__ */ I.jsx(
    e.Toolbar.Button,
    {
      className: "bn-button",
      label: t.formatting_toolbar.ai.tooltip,
      mainTooltip: t.formatting_toolbar.ai.tooltip,
      icon: /* @__PURE__ */ I.jsx(Le, {}),
      onClick: o
    }
  ) : null;
}, Cn = {
  AI: Le
};
function ni(t, e) {
  return [
    {
      key: "ai",
      onItemClick: () => {
        const i = t.getTextCursorPosition();
        i.block.content && Array.isArray(i.block.content) && // isarray check not ideal
        i.block.content.length === 0 && i.prevBlock ? e.setAiMenuBlockID(i.prevBlock.id) : e.setAiMenuBlockID(i.block.id);
      },
      ...ae(t).slash_menu.ai,
      icon: /* @__PURE__ */ I.jsx(Cn.AI, {})
    }
  ];
}
class An {
  constructor(e, n) {
    T(this, "state");
    T(this, "emitUpdate");
    T(this, "oldBlockInfo");
    T(this, "domElement");
    T(this, "blurHandler", (e) => {
      var i;
      const n = this.pmView.dom.parentElement;
      // An element is clicked.
      e && e.relatedTarget && // Element is inside the editor.
      (n === e.relatedTarget || n.contains(e.relatedTarget) || e.relatedTarget.matches(
        ".bn-container, .bn-container *"
      )) || (i = this.state) != null && i.show && (this.state.show = !1, this.emitUpdate());
    });
    // For dragging the whole editor.
    T(this, "dragHandler", () => {
      var e;
      (e = this.state) != null && e.show && (this.state.show = !1, this.emitUpdate());
    });
    T(this, "scrollHandler", () => {
      var e;
      (e = this.state) != null && e.show && (this.state.referencePos = this.domElement.getBoundingClientRect(), this.emitUpdate());
    });
    T(this, "closeMenu", () => {
      var e;
      (e = this.state) != null && e.show && (this.state.show = !1, this.emitUpdate());
    });
    this.pmView = e, this.emitUpdate = () => {
      if (!this.state)
        throw new Error("Attempting to update uninitialized AI toolbar");
      n(this.state);
    }, e.dom.addEventListener("dragstart", this.dragHandler), e.dom.addEventListener("dragover", this.dragHandler), e.dom.addEventListener("blur", this.blurHandler), e.root.addEventListener("scroll", this.scrollHandler, !0);
  }
  update(e) {
    var i, o;
    const n = dr(e.state);
    if (n.blockNoteType !== "ai" && ((i = this.oldBlockInfo) == null ? void 0 : i.blockNoteType) !== "ai") {
      this.oldBlockInfo = n;
      return;
    }
    if (this.oldBlockInfo = n, n.blockNoteType === "ai" && n.bnBlock.node.attrs.prompt !== "" && e.state.selection.$from.sameParent(e.state.selection.$to)) {
      this.domElement = e.domAtPos(n.bnBlock.beforePos).node.firstChild, this.state = {
        prompt: n.bnBlock.node.attrs.prompt,
        show: !0,
        referencePos: this.domElement.getBoundingClientRect()
      }, this.emitUpdate();
      return;
    }
    (o = this.state) != null && o.show && (this.state.show = !1, this.emitUpdate());
  }
  destroy() {
    this.pmView.dom.removeEventListener("dragstart", this.dragHandler), this.pmView.dom.removeEventListener("dragover", this.dragHandler), this.pmView.dom.removeEventListener("blur", this.blurHandler), this.pmView.root.removeEventListener("scroll", this.scrollHandler, !0);
  }
}
const Sn = new dt("AIBlockToolbarPlugin");
class ii extends mr {
  constructor() {
    super();
    T(this, "view");
    T(this, "plugin");
    T(this, "closeMenu", () => this.view.closeMenu());
    this.plugin = new mt({
      key: Sn,
      view: (n) => (this.view = new An(n, (i) => {
        this.emit("update", i);
      }), this.view)
    });
  }
  get shown() {
    var n, i;
    return ((i = (n = this.view) == null ? void 0 : n.state) == null ? void 0 : i.show) || !1;
  }
  onUpdate(n) {
    return this.on("update", n);
  }
}
const En = new dt("blocknote-ai-show-selection");
class oi {
  constructor() {
    T(this, "plugin");
    this.plugin = new mt({
      key: En,
      props: {
        decorations: (e) => {
          const { doc: n, selection: i } = e, o = wr.inline(i.from, i.to, {
            "data-ai-show-selection": "true"
          });
          return xr.create(n, [o]);
        }
      }
    });
  }
}
const On = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Rn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    // custom_prompt: {
    //   title: "Custom Prompt",
    //   subtext: "Use your query as an AI prompt",
    //   aliases: [
    //     "", // TODO: add comment
    //     "custom prompt",
    //   ],
    // },
    continue_writing: {
      title: "Continue Writing",
      aliases: void 0
    },
    summarize: {
      title: "Summarize",
      aliases: void 0
    },
    add_action_items: {
      title: "Add Action Items",
      aliases: void 0
    },
    write_anything: {
      title: "Write Anything…",
      aliases: void 0,
      prompt_placeholder: "Write about "
    },
    make_longer: {
      title: "Make Longer",
      aliases: void 0
    },
    make_shorter: {
      title: "Make Shorter",
      aliases: void 0
    },
    rewrite: {
      title: "Rewrite",
      aliases: void 0
    },
    simplify: {
      title: "Simplify",
      aliases: void 0
    },
    translate: {
      title: "Translate…",
      aliases: void 0,
      prompt_placeholder: "Translate into "
    },
    fix_spelling: {
      title: "Fix Spelling",
      aliases: void 0
    },
    improve_writing: {
      title: "Improve Writing",
      aliases: void 0
    },
    accept: { title: "Accept", aliases: void 0 },
    retry: { title: "Retry", aliases: void 0 },
    revert: { title: "Revert", aliases: void 0 }
  },
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Pn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    // custom_prompt: {
    //   title: "Custom Prompt",
    //   subtext: "Use your query as an AI prompt",
    //   aliases: undefined,
    // },
    make_longer: {
      title: "Make Longer",
      aliases: void 0
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Bn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Ln = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Tn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, jn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Mn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Dn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Un = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, Nn = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, $n = {
  formatting_toolbar: {
    ai: {
      tooltip: "Generate content",
      input_placeholder: "Enter a prompt"
    }
  },
  slash_menu: {
    ai_block: {
      title: "AI Block",
      subtext: "Block with AI generated content",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    },
    ai: {
      title: "Ask AI",
      subtext: "Continue writing with AI",
      aliases: ["ai", "artificial intelligence", "generate"],
      group: "AI"
    }
  },
  placeholders: {
    ai: "Enter a prompt"
  },
  ai_menu: {
    custom_prompt: {
      title: "Custom Prompt",
      subtext: "Use your query as an AI prompt",
      aliases: ["", "custom prompt"]
    },
    make_longer: {
      title: "Make Longer",
      aliases: ["make longer"]
    }
  },
  // TODO
  ai_block_toolbar: {
    show_prompt: "Generated by AI",
    show_prompt_datetime_tooltip: "Generated:",
    update: "Update",
    updating: "Updating…"
  },
  ai_inline_toolbar: {
    accept: "Accept",
    retry: "Retry",
    updating: "Updating…",
    revert: "Revert"
  }
}, ai = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ar: On,
  en: Rn,
  fr: Pn,
  is: Bn,
  ja: Ln,
  ko: Tn,
  nl: jn,
  pl: Mn,
  pt: Dn,
  ru: Un,
  vi: Nn,
  zh: $n
}, Symbol.toStringTag, { value: "Module" }));
export {
  ii as AIBlockToolbarProsemirrorPlugin,
  An as AIBlockToolbarView,
  oi as AIShowSelectionPlugin,
  ri as AIToolbarButton,
  wt as BlockNoteAIContext,
  ei as BlockNoteAIContextProvider,
  ti as BlockNoteAIUI,
  Sn as aiBlockToolbarPluginKey,
  Qn as createBlockNoteAIClient,
  ae as getAIDictionary,
  ni as getAISlashMenuItems,
  ai as locales,
  Be as useBlockNoteAIContext
};
//# sourceMappingURL=blocknote-xl-ai.js.map
