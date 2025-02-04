import { jsx as i, jsxs as S } from "react/jsx-runtime";
import { assertEmpty as d, mergeCSSClasses as E, isSafari as M, COLORS_DEFAULT as J, COLORS_DARK_MODE_DEFAULT as Q } from "@blocknote/core";
import { elementOverflow as j, useBlockNoteContext as X, usePrefersColorScheme as Y, ComponentsContext as ee, BlockNoteViewRaw as te } from "@blocknote/react";
import { TextInput as z, Menu as b, CheckIcon as B, Group as p, Tabs as w, LoadingOverlay as ne, Button as x, FileInput as re, Popover as oe, PopoverTarget as se, PopoverDropdown as ie, ActionIcon as _, Loader as $, Stack as O, Text as N, Badge as ae, Tooltip as le, MantineProvider as ce } from "@mantine/core";
import y, { forwardRef as g, createContext as ue, useState as de, useRef as C, useCallback as F, useContext as me, useEffect as V } from "react";
import { mergeRefs as T, useFocusWithin as ge, useFocusTrap as fe } from "@mantine/hooks";
const A = (e, n, t = !1) => {
  const r = [];
  function o(s, l = "--bn") {
    for (const a in s) {
      const c = a.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase(), u = `${l}-${c}`;
      typeof s[a] != "object" ? (typeof s[a] == "number" && (s[a] = `${s[a]}px`), t ? n.style.removeProperty(u) : n.style.setProperty(u, s[a].toString())) : o(s[a], u);
    }
  }
  return o(e), r;
}, D = (e, n) => A(e, n), be = {
  colors: {
    editor: {
      text: void 0,
      background: void 0
    },
    menu: {
      text: void 0,
      background: void 0
    },
    tooltip: {
      text: void 0,
      background: void 0
    },
    hovered: {
      text: void 0,
      background: void 0
    },
    selected: {
      text: void 0,
      background: void 0
    },
    disabled: {
      text: void 0,
      background: void 0
    },
    shadow: void 0,
    border: void 0,
    sideMenu: void 0,
    highlights: {
      gray: {
        text: void 0,
        background: void 0
      },
      brown: {
        text: void 0,
        background: void 0
      },
      red: {
        text: void 0,
        background: void 0
      },
      orange: {
        text: void 0,
        background: void 0
      },
      yellow: {
        text: void 0,
        background: void 0
      },
      green: {
        text: void 0,
        background: void 0
      },
      blue: {
        text: void 0,
        background: void 0
      },
      purple: {
        text: void 0,
        background: void 0
      },
      pink: {
        text: void 0,
        background: void 0
      }
    }
  },
  borderRadius: void 0,
  fontFamily: void 0
}, pe = (e) => A(be, e, !0), ve = g((e, n) => {
  const {
    className: t,
    name: r,
    label: o,
    variant: s,
    icon: l,
    value: a,
    autoFocus: c,
    placeholder: u,
    disabled: f,
    onKeyDown: v,
    onChange: h,
    onSubmit: W,
    autoComplete: q,
    ...Z
  } = e;
  return d(Z), /* @__PURE__ */ i(
    z,
    {
      size: "xs",
      className: E(
        t || "",
        s === "large" ? "bn-mt-input-large" : ""
      ),
      ref: n,
      name: r,
      label: o,
      leftSection: l,
      value: a,
      autoFocus: c,
      "data-autofocus": c ? "true" : void 0,
      placeholder: u,
      disabled: f,
      onKeyDown: v,
      onChange: h,
      onSubmit: W,
      autoComplete: q
    }
  );
});
var G = {
  color: void 0,
  size: void 0,
  className: void 0,
  style: void 0,
  attr: void 0
}, I = y.createContext && /* @__PURE__ */ y.createContext(G), he = ["attr", "size", "title"];
function ye(e, n) {
  if (e == null) return {};
  var t = Se(e, n), r, o;
  if (Object.getOwnPropertySymbols) {
    var s = Object.getOwnPropertySymbols(e);
    for (o = 0; o < s.length; o++)
      r = s[o], !(n.indexOf(r) >= 0) && Object.prototype.propertyIsEnumerable.call(e, r) && (t[r] = e[r]);
  }
  return t;
}
function Se(e, n) {
  if (e == null) return {};
  var t = {};
  for (var r in e)
    if (Object.prototype.hasOwnProperty.call(e, r)) {
      if (n.indexOf(r) >= 0) continue;
      t[r] = e[r];
    }
  return t;
}
function k() {
  return k = Object.assign ? Object.assign.bind() : function(e) {
    for (var n = 1; n < arguments.length; n++) {
      var t = arguments[n];
      for (var r in t)
        Object.prototype.hasOwnProperty.call(t, r) && (e[r] = t[r]);
    }
    return e;
  }, k.apply(this, arguments);
}
function R(e, n) {
  var t = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    n && (r = r.filter(function(o) {
      return Object.getOwnPropertyDescriptor(e, o).enumerable;
    })), t.push.apply(t, r);
  }
  return t;
}
function P(e) {
  for (var n = 1; n < arguments.length; n++) {
    var t = arguments[n] != null ? arguments[n] : {};
    n % 2 ? R(Object(t), !0).forEach(function(r) {
      xe(e, r, t[r]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : R(Object(t)).forEach(function(r) {
      Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r));
    });
  }
  return e;
}
function xe(e, n, t) {
  return n = we(n), n in e ? Object.defineProperty(e, n, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[n] = t, e;
}
function we(e) {
  var n = Ne(e, "string");
  return typeof n == "symbol" ? n : n + "";
}
function Ne(e, n) {
  if (typeof e != "object" || !e) return e;
  var t = e[Symbol.toPrimitive];
  if (t !== void 0) {
    var r = t.call(e, n || "default");
    if (typeof r != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (n === "string" ? String : Number)(e);
}
function H(e) {
  return e && e.map((n, t) => /* @__PURE__ */ y.createElement(n.tag, P({
    key: t
  }, n.attr), H(n.child)));
}
function K(e) {
  return (n) => /* @__PURE__ */ y.createElement(Ce, k({
    attr: P({}, e.attr)
  }, n), H(e.child));
}
function Ce(e) {
  var n = (t) => {
    var {
      attr: r,
      size: o,
      title: s
    } = e, l = ye(e, he), a = o || t.size || "1em", c;
    return t.className && (c = t.className), e.className && (c = (c ? c + " " : "") + e.className), /* @__PURE__ */ y.createElement("svg", k({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, t.attr, r, l, {
      className: c,
      style: P(P({
        color: e.color || t.color
      }, t.style), e.style),
      height: a,
      width: a,
      xmlns: "http://www.w3.org/2000/svg"
    }), s && /* @__PURE__ */ y.createElement("title", null, s), e.children);
  };
  return I !== void 0 ? /* @__PURE__ */ y.createElement(I.Consumer, null, (t) => n(t)) : n(G);
}
function ke(e) {
  return K({ tag: "svg", attr: { viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" }, child: [{ tag: "path", attr: { fillRule: "evenodd", d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z", clipRule: "evenodd" }, child: [] }] })(e);
}
function Pe(e) {
  return K({ tag: "svg", attr: { viewBox: "0 0 20 20", fill: "currentColor", "aria-hidden": "true" }, child: [{ tag: "path", attr: { fillRule: "evenodd", d: "M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z", clipRule: "evenodd" }, child: [] }] })(e);
}
const U = ue(void 0), Te = g((e, n) => {
  const {
    children: t,
    onOpenChange: r,
    position: o,
    sub: s,
    // not used
    ...l
  } = e;
  d(l);
  const [a, c] = de(!1), u = C(null), f = C(), v = F(() => {
    f.current && clearTimeout(f.current), f.current = setTimeout(() => {
      c(!1);
    }, 250);
  }, []), h = F(() => {
    f.current && clearTimeout(f.current), c(!0);
  }, []);
  return /* @__PURE__ */ i(
    U.Provider,
    {
      value: {
        onMenuMouseOver: h,
        onMenuMouseLeave: v
      },
      children: /* @__PURE__ */ i(
        b.Item,
        {
          className: "bn-menu-item bn-mt-sub-menu-item",
          ref: T(n, u),
          onMouseOver: h,
          onMouseLeave: v,
          children: /* @__PURE__ */ i(
            b,
            {
              portalProps: {
                target: u.current ? u.current.parentElement : void 0
              },
              middlewares: { flip: !0, shift: !0, inline: !1, size: !0 },
              trigger: "hover",
              opened: a,
              onClose: () => r == null ? void 0 : r(!1),
              onOpen: () => r == null ? void 0 : r(!0),
              position: o,
              children: t
            }
          )
        }
      )
    }
  );
}), Me = (e) => {
  const { children: n, onOpenChange: t, position: r, sub: o, ...s } = e;
  return d(s), o ? /* @__PURE__ */ i(Te, { ...e }) : /* @__PURE__ */ i(
    b,
    {
      withinPortal: !1,
      middlewares: { flip: !0, shift: !0, inline: !1, size: !0 },
      onClose: () => t == null ? void 0 : t(!1),
      onOpen: () => t == null ? void 0 : t(!0),
      position: r,
      children: n
    }
  );
}, Fe = g((e, n) => {
  const { className: t, children: r, icon: o, checked: s, subTrigger: l, onClick: a, ...c } = e;
  return d(c, !1), l ? /* @__PURE__ */ S(
    "div",
    {
      onClick: (u) => {
        u.preventDefault(), u.stopPropagation();
      },
      ref: n,
      ...c,
      children: [
        r,
        /* @__PURE__ */ i(Pe, { size: 15 })
      ]
    }
  ) : /* @__PURE__ */ i(
    b.Item,
    {
      className: t,
      ref: n,
      leftSection: o,
      rightSection: s ? /* @__PURE__ */ i(B, { size: 10 }) : s === !1 ? /* @__PURE__ */ i("div", { className: "bn-tick-space" }) : null,
      onClick: a,
      ...c,
      children: r
    }
  );
}), Oe = (e) => {
  const {
    children: n,
    sub: t,
    // unused
    ...r
  } = e;
  return d(r), /* @__PURE__ */ i(b.Target, { children: n });
}, De = g((e, n) => {
  const {
    className: t,
    children: r,
    sub: o,
    //unused
    ...s
  } = e;
  d(s);
  const l = me(U);
  return /* @__PURE__ */ i(
    b.Dropdown,
    {
      className: t,
      ref: n,
      onMouseOver: l == null ? void 0 : l.onMenuMouseOver,
      onMouseLeave: l == null ? void 0 : l.onMenuMouseLeave,
      children: r
    }
  );
}), Ie = g((e, n) => {
  const { className: t, ...r } = e;
  return d(r), /* @__PURE__ */ i(b.Divider, { className: t, ref: n });
}), Re = g((e, n) => {
  const { className: t, children: r, ...o } = e;
  return d(o), /* @__PURE__ */ i(b.Label, { className: t, ref: n, children: r });
}), Le = g((e, n) => {
  const {
    className: t,
    tabs: r,
    defaultOpenTab: o,
    openTab: s,
    setOpenTab: l,
    loading: a,
    ...c
  } = e;
  return d(c), /* @__PURE__ */ i(p, { className: t, ref: n, children: /* @__PURE__ */ S(
    w,
    {
      value: s,
      defaultValue: o,
      onChange: l,
      children: [
        a && /* @__PURE__ */ i(ne, { visible: a }),
        /* @__PURE__ */ i(w.List, { children: r.map((u) => /* @__PURE__ */ i(
          w.Tab,
          {
            "data-test": `${u.name.toLowerCase()}-tab`,
            value: u.name,
            children: u.name
          },
          u.name
        )) }),
        r.map((u) => /* @__PURE__ */ i(w.Panel, { value: u.name, children: u.tabPanel }, u.name))
      ]
    }
  ) });
}), Ee = g((e, n) => {
  const { className: t, children: r, onClick: o, label: s, ...l } = e;
  return d(l), /* @__PURE__ */ i(
    x,
    {
      size: "xs",
      "aria-label": s,
      className: t,
      ref: n,
      onClick: o,
      ...l,
      children: r
    }
  );
}), je = g((e, n) => {
  const { className: t, accept: r, value: o, placeholder: s, onChange: l, ...a } = e;
  return d(a), /* @__PURE__ */ i(
    re,
    {
      size: "xs",
      className: t,
      ref: n,
      accept: r,
      value: o,
      placeholder: s,
      onChange: l,
      ...a
    }
  );
}), ze = g((e, n) => {
  const { className: t, children: r, ...o } = e;
  return d(o), /* @__PURE__ */ i("div", { className: t, ref: n, children: r });
}), Be = g((e, n) => {
  const { className: t, value: r, placeholder: o, onKeyDown: s, onChange: l, ...a } = e;
  return d(a), /* @__PURE__ */ i(
    z,
    {
      size: "xs",
      "data-test": "embed-input",
      className: t,
      ref: n,
      value: r,
      placeholder: o,
      onKeyDown: s,
      onChange: l
    }
  );
}), _e = (e) => {
  const { children: n, opened: t, position: r, ...o } = e;
  return d(o), /* @__PURE__ */ i(oe, { withinPortal: !1, opened: t, position: r, children: n });
}, $e = (e) => {
  const { children: n, ...t } = e;
  return d(t), /* @__PURE__ */ i(se, { children: n });
}, Ve = g((e, n) => {
  const {
    className: t,
    children: r,
    variant: o,
    // unused
    ...s
  } = e;
  return d(s), /* @__PURE__ */ i(ie, { className: t, ref: n, children: r });
}), Ae = g((e, n) => {
  const { className: t, children: r, ...o } = e;
  return d(o, !1), /* @__PURE__ */ i(
    p,
    {
      align: "center",
      gap: 0,
      className: t,
      ref: n,
      ...o,
      children: r
    }
  );
}), Ge = g((e, n) => {
  const {
    className: t,
    children: r,
    icon: o,
    onClick: s,
    onDragEnd: l,
    onDragStart: a,
    draggable: c,
    label: u,
    ...f
  } = e;
  return d(f, !1), o ? /* @__PURE__ */ i(
    _,
    {
      size: 24,
      className: t,
      ref: n,
      onClick: s,
      onDragEnd: l,
      onDragStart: a,
      draggable: c,
      "aria-label": u,
      ...f,
      children: o
    }
  ) : /* @__PURE__ */ i(
    x,
    {
      className: t,
      ref: n,
      onClick: s,
      onDragEnd: l,
      onDragStart: a,
      draggable: c,
      "aria-label": u,
      ...f,
      children: r
    }
  );
}), He = g((e, n) => {
  const { className: t, children: r, id: o, columns: s, ...l } = e;
  return d(l), /* @__PURE__ */ i(
    "div",
    {
      className: t,
      style: { gridTemplateColumns: `repeat(${s}, 1fr)` },
      ref: n,
      id: o,
      role: "grid",
      children: r
    }
  );
}), Ke = g((e, n) => {
  const { className: t, children: r, columns: o, ...s } = e;
  return d(s), /* @__PURE__ */ i(
    p,
    {
      className: t,
      style: { gridColumn: `1 / ${o + 1}` },
      ref: n,
      children: /* @__PURE__ */ i(p, { className: "bn-mt-suggestion-menu-item-title", children: r })
    }
  );
}), Ue = g((e, n) => {
  const { className: t, isSelected: r, onClick: o, item: s, id: l, ...a } = e;
  d(a);
  const c = C(null);
  return V(() => {
    if (!c.current || !r)
      return;
    const u = j(
      c.current,
      document.querySelector(".bn-grid-suggestion-menu")
    );
    u === "top" ? c.current.scrollIntoView(!0) : u === "bottom" && c.current.scrollIntoView(!1);
  }, [r]), /* @__PURE__ */ i(
    "div",
    {
      className: t,
      ref: T(n, c),
      id: l,
      role: "option",
      onClick: o,
      "aria-selected": r || void 0,
      children: s.icon
    }
  );
}), We = g((e, n) => {
  const {
    className: t,
    children: r,
    // unused, using "dots" instead
    columns: o,
    ...s
  } = e;
  return d(s), /* @__PURE__ */ i(
    $,
    {
      className: t,
      style: { gridColumn: `1 / ${o + 1}` },
      type: "dots",
      ref: n
    }
  );
}), qe = g((e, n) => {
  const { className: t, children: r, id: o, ...s } = e;
  return d(s), /* @__PURE__ */ i(
    O,
    {
      gap: 0,
      className: t,
      ref: n,
      id: o,
      role: "listbox",
      children: r
    }
  );
}), Ze = g((e, n) => {
  const { className: t, children: r, ...o } = e;
  return d(o), /* @__PURE__ */ i(p, { className: t, ref: n, children: /* @__PURE__ */ i(p, { className: "bn-mt-suggestion-menu-item-title", children: r }) });
}), Je = g((e, n) => {
  const { className: t, isSelected: r, onClick: o, item: s, id: l, ...a } = e;
  d(a);
  const c = C(null);
  return V(() => {
    if (!c.current || !r)
      return;
    const u = j(
      c.current,
      document.querySelector(".bn-suggestion-menu, #ai-suggestion-menu")
      // TODO
    );
    u === "top" ? c.current.scrollIntoView(!0) : u === "bottom" && c.current.scrollIntoView(!1);
  }, [r]), /* @__PURE__ */ S(
    p,
    {
      gap: 0,
      className: t,
      ref: T(n, c),
      id: l,
      role: "option",
      onMouseDown: (u) => u.preventDefault(),
      onClick: o,
      "aria-selected": r || void 0,
      children: [
        s.icon && /* @__PURE__ */ i(
          p,
          {
            className: "bn-mt-suggestion-menu-item-section",
            "data-position": "left",
            children: s.icon
          }
        ),
        /* @__PURE__ */ S(O, { gap: 0, className: "bn-mt-suggestion-menu-item-body", children: [
          /* @__PURE__ */ i(N, { className: "bn-mt-suggestion-menu-item-title", children: s.title }),
          /* @__PURE__ */ i(N, { className: "bn-mt-suggestion-menu-item-subtitle", children: s.subtext })
        ] }),
        s.badge && /* @__PURE__ */ i(
          p,
          {
            "data-position": "right",
            className: "bn-mt-suggestion-menu-item-section",
            children: /* @__PURE__ */ i(ae, { size: "xs", children: s.badge })
          }
        )
      ]
    }
  );
}), Qe = g((e, n) => {
  const { className: t, children: r, ...o } = e;
  return d(o), /* @__PURE__ */ i(p, { className: t, ref: n, children: r });
}), Xe = g((e, n) => {
  const {
    className: t,
    children: r,
    // unused, using "dots" instead
    ...o
  } = e;
  return d(o), /* @__PURE__ */ i($, { className: t, type: "dots", ref: n });
}), Ye = g((e, n) => {
  const { children: t, className: r, onMouseDown: o, onClick: s, ...l } = e;
  return d(l, !1), /* @__PURE__ */ i(
    x,
    {
      className: r,
      ref: n,
      onMouseDown: o,
      onClick: s,
      ...l,
      children: t
    }
  );
}), et = g((e, n) => {
  const {
    className: t,
    children: r,
    draggable: o,
    onDragStart: s,
    onDragEnd: l,
    style: a,
    label: c,
    ...u
  } = e;
  return d(u, !1), /* @__PURE__ */ i(
    x,
    {
      className: t,
      ref: n,
      "aria-label": c,
      draggable: o,
      onDragStart: s,
      onDragEnd: l,
      style: a,
      ...u,
      children: r
    }
  );
}), tt = g(
  (e, n) => {
    const { className: t, children: r, onMouseEnter: o, onMouseLeave: s, ...l } = e;
    d(l);
    const { ref: a, focused: c } = ge(), u = fe(c), f = T(n, a, u);
    return /* @__PURE__ */ i(
      p,
      {
        className: t,
        ref: f,
        role: "toolbar",
        onMouseEnter: o,
        onMouseLeave: s,
        children: r
      }
    );
  }
), nt = (e) => /* @__PURE__ */ S(O, { gap: 0, className: "bn-tooltip", children: [
  /* @__PURE__ */ i(N, { size: "sm", children: e.mainTooltip }),
  e.secondaryTooltip && /* @__PURE__ */ i(N, { size: "xs", children: e.secondaryTooltip })
] }), rt = g(
  (e, n) => {
    const {
      className: t,
      children: r,
      mainTooltip: o,
      secondaryTooltip: s,
      icon: l,
      isSelected: a,
      isDisabled: c,
      onClick: u,
      label: f,
      ...v
    } = e;
    return d(v, !1), /* @__PURE__ */ i(
      le,
      {
        withinPortal: !1,
        label: o && /* @__PURE__ */ i(
          nt,
          {
            mainTooltip: o,
            secondaryTooltip: s
          }
        ),
        children: r ? /* @__PURE__ */ i(
          x,
          {
            "aria-label": f,
            className: t,
            onMouseDown: (h) => {
              M() && h.currentTarget.focus();
            },
            onClick: u,
            leftSection: l,
            "aria-pressed": a,
            "data-selected": a || void 0,
            "data-test": o && o.slice(0, 1).toLowerCase() + o.replace(/\s+/g, "").slice(1),
            size: "xs",
            disabled: c || !1,
            ref: n,
            ...v,
            children: r
          }
        ) : /* @__PURE__ */ i(
          _,
          {
            className: t,
            "aria-label": f,
            onMouseDown: (h) => {
              M() && h.currentTarget.focus();
            },
            onClick: u,
            "aria-pressed": a,
            "data-selected": a || void 0,
            "data-test": o && o.slice(0, 1).toLowerCase() + o.replace(/\s+/g, "").slice(1),
            size: 30,
            disabled: c || !1,
            ref: n,
            ...v,
            children: l
          }
        )
      }
    );
  }
), ot = g((e, n) => {
  const { className: t, items: r, isDisabled: o, ...s } = e;
  d(s);
  const l = r.filter((a) => a.isSelected)[0];
  return l ? /* @__PURE__ */ S(
    b,
    {
      withinPortal: !1,
      transitionProps: {
        exitDuration: 0
      },
      disabled: o,
      middlewares: { flip: !0, shift: !0, inline: !1, size: !0 },
      children: [
        /* @__PURE__ */ i(b.Target, { children: /* @__PURE__ */ i(
          x,
          {
            onMouseDown: (a) => {
              M() && a.currentTarget.focus();
            },
            leftSection: l.icon,
            rightSection: /* @__PURE__ */ i(ke, {}),
            size: "xs",
            variant: "subtle",
            disabled: o,
            children: l.text
          }
        ) }),
        /* @__PURE__ */ i(b.Dropdown, { className: t, ref: n, children: r.map((a) => /* @__PURE__ */ i(
          b.Item,
          {
            onClick: a.onClick,
            leftSection: a.icon,
            rightSection: a.isSelected ? /* @__PURE__ */ i(B, { size: 10, className: "bn-tick-icon" }) : (
              // Ensures space for tick even if item isn't currently selected.
              /* @__PURE__ */ i("div", { className: "bn-tick-space" })
            ),
            disabled: a.isDisabled,
            children: a.text
          },
          a.text
        )) })
      ]
    }
  ) : null;
}), m = [
  "#FFFFFF",
  "#EFEFEF",
  "#CFCFCF",
  "#AFAFAF",
  "#7F7F7F",
  "#3F3F3F",
  "#1F1F1F",
  "#161616",
  "#0F0F0F",
  "#000000"
], L = {
  colors: {
    editor: {
      text: m[5],
      background: m[0]
    },
    menu: {
      text: m[5],
      background: m[0]
    },
    tooltip: {
      text: m[5],
      background: m[1]
    },
    hovered: {
      text: m[5],
      background: m[1]
    },
    selected: {
      text: m[0],
      background: m[5]
    },
    disabled: {
      text: m[3],
      background: m[1]
    },
    shadow: m[2],
    border: m[1],
    sideMenu: m[2],
    highlights: J
  },
  borderRadius: 6,
  fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Open Sans", "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
}, gt = {
  colors: {
    editor: {
      text: m[2],
      background: m[6]
    },
    menu: {
      text: m[2],
      background: m[6]
    },
    tooltip: {
      text: m[2],
      background: m[7]
    },
    hovered: {
      text: m[2],
      background: m[7]
    },
    selected: {
      text: m[2],
      background: m[8]
    },
    disabled: {
      text: m[5],
      background: m[7]
    },
    shadow: m[8],
    border: m[7],
    sideMenu: m[4],
    highlights: Q
  },
  borderRadius: L.borderRadius,
  fontFamily: L.fontFamily
}, st = {
  Toolbar: {
    Root: tt,
    Button: rt,
    Select: ot
  },
  FilePanel: {
    Root: Le,
    Button: Ee,
    FileInput: je,
    TabPanel: ze,
    TextInput: Be
  },
  GridSuggestionMenu: {
    Root: He,
    Item: Ue,
    EmptyItem: Ke,
    Loader: We
  },
  SideMenu: {
    Root: Ae,
    Button: Ge
  },
  SuggestionMenu: {
    Root: qe,
    Item: Je,
    EmptyItem: Ze,
    Label: Qe,
    Loader: Xe
  },
  TableHandle: {
    Root: et,
    ExtendButton: Ye
  },
  Generic: {
    Form: {
      Root: (e) => /* @__PURE__ */ i("div", { children: e.children }),
      TextInput: ve
    },
    Menu: {
      Root: Me,
      Trigger: Oe,
      Dropdown: De,
      Divider: Ie,
      Label: Re,
      Item: Fe
    },
    Popover: {
      Root: _e,
      Trigger: $e,
      Content: Ve
    }
  }
}, it = {
  // Removes button press effect
  activeClassName: ""
}, ft = (e) => {
  const { className: n, theme: t, ...r } = e, o = X(), s = Y(), l = (o == null ? void 0 : o.colorSchemePreference) || s, a = F(
    (c) => {
      if (c && (pe(c), typeof t == "object")) {
        if ("light" in t && "dark" in t) {
          D(
            t[l === "dark" ? "dark" : "light"],
            c
          );
          return;
        }
        D(t, c);
        return;
      }
    },
    [l, t]
  );
  return /* @__PURE__ */ i(ee.Provider, { value: st, children: /* @__PURE__ */ i(
    ce,
    {
      theme: it,
      cssVariablesSelector: ".bn-mantine",
      getRootElement: () => {
      },
      children: /* @__PURE__ */ i(
        te,
        {
          className: E("bn-mantine", n || ""),
          theme: typeof t == "object" ? void 0 : t,
          ...r,
          ref: a
        }
      )
    }
  ) });
};
export {
  ft as BlockNoteView,
  D as applyBlockNoteCSSVariablesFromTheme,
  st as components,
  gt as darkDefaultTheme,
  m as defaultColorScheme,
  L as lightDefaultTheme,
  pe as removeBlockNoteCSSVariables
};
//# sourceMappingURL=blocknote-mantine.js.map
