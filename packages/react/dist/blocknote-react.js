import R, { createContext as Oe, useContext as Ze, useEffect as y, useMemo as H, useState as f, useCallback as k, useRef as I, forwardRef as bt, useImperativeHandle as Ct } from "react";
import { jsxs as M, jsx as l, Fragment as B } from "react/jsx-runtime";
import { useFloating as se, useTransitionStyles as de, useDismiss as pt, useInteractions as kt, offset as O, flip as F, shift as De, size as ue, FloatingPortal as vt } from "@floating-ui/react";
import { filenameFromURL as ve, formatKeyboardShortcut as ee, VALID_LINK_PROTOCOLS as wt, DEFAULT_LINK_PROTOCOL as Ht, checkBlockIsFileBlock as U, checkBlockIsFileBlockWithPlaceholder as z, checkBlockIsFileBlockWithPreview as Mt, checkBlockHasDefaultProp as le, checkBlockTypeHasDefaultProp as A, getDefaultEmojiPickerItems as yt, mergeCSSClasses as W, getDefaultSlashMenuItems as St, filterSuggestionItems as Vt, EMPTY_CELL_WIDTH as xt, EMPTY_CELL_HEIGHT as Lt, inheritedProps as Bt, camelToDataKebab as Ae, createStronglyTypedTiptapNode as Fe, propsToAttributes as Ue, getParseRules as Tt, wrapInBlockStructure as _t, getBlockFromPos as Et, applyNonSelectableBlockFix as Rt, createInternalBlockSpec as Pt, audioParse as Nt, audioBlockConfig as It, fileParse as Ot, fileBlockConfig as Zt, imageParse as Dt, imageBlockConfig as At, getPageBreakSlashMenuItems as Ft, videoParse as Ut, videoBlockConfig as zt, BlockNoteEditor as Wt, addInlineContentKeyboardShortcuts as Gt, getInlineContentParseRules as jt, nodeToCustomInlineContent as we, addInlineContentAttributes as $t, inlineContentToNodes as qt, createInternalInlineContentSpec as Kt, stylePropsToAttributes as Xt, getStyleParseRules as Yt, addStyleAttributes as Jt, createInternalStyleSpec as Qt } from "@blocknote/core";
import en, { createPortal as ge, flushSync as ze } from "react-dom";
import { NodeViewWrapper as We, ReactNodeViewRenderer as Ge, useReactNodeView as je, Mark as tn } from "@tiptap/react";
const $e = Oe(void 0);
function E(e) {
  return Ze($e);
}
function v(e) {
  const t = E();
  if (!(t != null && t.editor))
    throw new Error(
      "useBlockNoteEditor was called outside of a BlockNoteContext provider or BlockNoteView component"
    );
  return t.editor;
}
function nn(e) {
  return e.getBoundingClientRect !== void 0;
}
function Z(e, t, n, o) {
  const { refs: r, update: i, context: c, floatingStyles: s } = se({
    open: e,
    ...o
  }), { isMounted: d, styles: a } = de(c), u = pt(c, { enabled: o == null ? void 0 : o.canDismiss }), { getReferenceProps: g, getFloatingProps: m } = kt([u]);
  return y(() => {
    i();
  }, [t, i]), y(() => {
    t !== null && (t instanceof HTMLElement || nn(t) ? r.setReference(t) : r.setReference({
      getBoundingClientRect: () => t
    }));
  }, [t, r]), H(() => ({
    isMounted: d,
    ref: r.setFloating,
    style: {
      display: "flex",
      ...a,
      ...s,
      zIndex: n
    },
    getFloatingProps: m,
    getReferenceProps: g
  }), [
    s,
    d,
    r.setFloating,
    a,
    n,
    m,
    g
  ]);
}
function P(e) {
  const [t, n] = f();
  return y(() => e((o) => {
    n({ ...o });
  }), [e]), t;
}
const on = Oe(
  void 0
);
function p() {
  return Ze(on);
}
function V() {
  return E().editor.dictionary;
}
const rn = (e) => {
  const t = p(), n = V(), { block: o } = e, r = v(), [i, c] = f(""), s = k(
    (u) => {
      c(u.currentTarget.value);
    },
    []
  ), d = k(
    (u) => {
      u.key === "Enter" && (u.preventDefault(), r.updateBlock(o, {
        props: {
          name: ve(i),
          url: i
        }
      }));
    },
    [r, o, i]
  ), a = k(() => {
    r.updateBlock(o, {
      props: {
        name: ve(i),
        url: i
      }
    });
  }, [r, o, i]);
  return /* @__PURE__ */ M(t.FilePanel.TabPanel, { className: "bn-tab-panel", children: [
    /* @__PURE__ */ l(
      t.FilePanel.TextInput,
      {
        className: "bn-text-input",
        placeholder: n.file_panel.embed.url_placeholder,
        value: i,
        onChange: s,
        onKeyDown: d,
        "data-test": "embed-input"
      }
    ),
    /* @__PURE__ */ l(
      t.FilePanel.Button,
      {
        className: "bn-button",
        onClick: a,
        "data-test": "embed-input-button",
        children: n.file_panel.embed.embed_button[o.type] || n.file_panel.embed.embed_button.file
      }
    )
  ] });
}, ln = (e) => {
  var g;
  const t = p(), n = V(), { block: o, setLoading: r } = e, i = v(), [c, s] = f(!1);
  y(() => {
    c && setTimeout(() => {
      s(!1);
    }, 3e3);
  }, [c]);
  const d = k(
    (m) => {
      if (m === null)
        return;
      async function h(b) {
        if (r(!0), i.uploadFile !== void 0)
          try {
            let S = await i.uploadFile(b);
            typeof S == "string" && (S = {
              props: {
                name: b.name,
                url: S
              }
            }), i.updateBlock(o, S);
          } catch {
            s(!0);
          } finally {
            r(!1);
          }
      }
      h(m);
    },
    [o, i, r]
  ), a = i.schema.blockSchema[o.type], u = a.isFileBlock && ((g = a.fileBlockAccept) != null && g.length) ? a.fileBlockAccept.join(",") : "*/*";
  return /* @__PURE__ */ M(t.FilePanel.TabPanel, { className: "bn-tab-panel", children: [
    /* @__PURE__ */ l(
      t.FilePanel.FileInput,
      {
        className: "bn-file-input",
        "data-test": "upload-input",
        accept: u,
        placeholder: n.file_panel.upload.file_placeholder[o.type] || n.file_panel.upload.file_placeholder.file,
        value: null,
        onChange: d
      }
    ),
    c && /* @__PURE__ */ l("div", { className: "bn-error-text", children: n.file_panel.upload.upload_error })
  ] });
}, qe = (e) => {
  const t = p(), n = V(), o = v(), [r, i] = f(!1), c = e.tabs ?? [
    ...o.uploadFile !== void 0 ? [
      {
        name: n.file_panel.upload.title,
        tabPanel: /* @__PURE__ */ l(ln, { block: e.block, setLoading: i })
      }
    ] : [],
    {
      name: n.file_panel.embed.title,
      tabPanel: /* @__PURE__ */ l(rn, { block: e.block })
    }
  ], [s, d] = f(
    e.defaultOpenTab || c[0].name
  );
  return /* @__PURE__ */ l(
    t.FilePanel.Root,
    {
      className: "bn-panel",
      defaultOpenTab: s,
      openTab: s,
      setOpenTab: d,
      tabs: c,
      loading: r
    }
  );
}, cn = (e) => {
  const t = v();
  if (!t.filePanel)
    throw new Error(
      "FileToolbarController can only be used when BlockNote editor schema contains file block"
    );
  const n = P(
    t.filePanel.onUpdate.bind(t.filePanel)
  ), { isMounted: o, ref: r, style: i, getFloatingProps: c } = Z(
    (n == null ? void 0 : n.show) || !1,
    (n == null ? void 0 : n.referencePos) || null,
    5e3,
    {
      placement: "bottom",
      middleware: [O(10), F()],
      onOpenChange: (g) => {
        g || (t.filePanel.closeMenu(), t.focus());
      },
      ...e.floatingOptions
    }
  );
  if (!o || !n)
    return null;
  const { show: s, referencePos: d, ...a } = n, u = e.filePanel || qe;
  return /* @__PURE__ */ l("div", { ref: r, style: i, ...c(), children: /* @__PURE__ */ l(u, { ...a }) });
};
function me(e, t) {
  const n = E();
  t || (t = n == null ? void 0 : n.editor), y(() => {
    if (!t)
      throw new Error(
        "'editor' is required, either from BlockNoteContext or as a function argument"
      );
    return t.onChange(e);
  }, [e, t]);
}
function he(e, t) {
  const n = E();
  t || (t = n == null ? void 0 : n.editor), y(() => {
    if (!t)
      throw new Error(
        "'editor' is required, either from BlockNoteContext or as a function argument"
      );
    return t.onSelectionChange(e);
  }, [e, t]);
}
function N(e, t) {
  me(e, t), he(e, t);
}
function an(e) {
  return (t) => {
    e.forEach((n) => {
      typeof n == "function" ? n(t) : n != null && (n.current = t);
    });
  };
}
var Ke = {
  color: void 0,
  size: void 0,
  className: void 0,
  style: void 0,
  attr: void 0
}, He = R.createContext && /* @__PURE__ */ R.createContext(Ke), sn = ["attr", "size", "title"];
function dn(e, t) {
  if (e == null) return {};
  var n = un(e, t), o, r;
  if (Object.getOwnPropertySymbols) {
    var i = Object.getOwnPropertySymbols(e);
    for (r = 0; r < i.length; r++)
      o = i[r], !(t.indexOf(o) >= 0) && Object.prototype.propertyIsEnumerable.call(e, o) && (n[o] = e[o]);
  }
  return n;
}
function un(e, t) {
  if (e == null) return {};
  var n = {};
  for (var o in e)
    if (Object.prototype.hasOwnProperty.call(e, o)) {
      if (t.indexOf(o) >= 0) continue;
      n[o] = e[o];
    }
  return n;
}
function Y() {
  return Y = Object.assign ? Object.assign.bind() : function(e) {
    for (var t = 1; t < arguments.length; t++) {
      var n = arguments[t];
      for (var o in n)
        Object.prototype.hasOwnProperty.call(n, o) && (e[o] = n[o]);
    }
    return e;
  }, Y.apply(this, arguments);
}
function Me(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var o = Object.getOwnPropertySymbols(e);
    t && (o = o.filter(function(r) {
      return Object.getOwnPropertyDescriptor(e, r).enumerable;
    })), n.push.apply(n, o);
  }
  return n;
}
function J(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = arguments[t] != null ? arguments[t] : {};
    t % 2 ? Me(Object(n), !0).forEach(function(o) {
      gn(e, o, n[o]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n)) : Me(Object(n)).forEach(function(o) {
      Object.defineProperty(e, o, Object.getOwnPropertyDescriptor(n, o));
    });
  }
  return e;
}
function gn(e, t, n) {
  return t = mn(t), t in e ? Object.defineProperty(e, t, { value: n, enumerable: !0, configurable: !0, writable: !0 }) : e[t] = n, e;
}
function mn(e) {
  var t = hn(e, "string");
  return typeof t == "symbol" ? t : t + "";
}
function hn(e, t) {
  if (typeof e != "object" || !e) return e;
  var n = e[Symbol.toPrimitive];
  if (n !== void 0) {
    var o = n.call(e, t || "default");
    if (typeof o != "object") return o;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function Xe(e) {
  return e && e.map((t, n) => /* @__PURE__ */ R.createElement(t.tag, J({
    key: n
  }, t.attr), Xe(t.child)));
}
function C(e) {
  return (t) => /* @__PURE__ */ R.createElement(fn, Y({
    attr: J({}, e.attr)
  }, t), Xe(e.child));
}
function fn(e) {
  var t = (n) => {
    var {
      attr: o,
      size: r,
      title: i
    } = e, c = dn(e, sn), s = r || n.size || "1em", d;
    return n.className && (d = n.className), e.className && (d = (d ? d + " " : "") + e.className), /* @__PURE__ */ R.createElement("svg", Y({
      stroke: "currentColor",
      fill: "currentColor",
      strokeWidth: "0"
    }, n.attr, o, c, {
      className: d,
      style: J(J({
        color: e.color || n.color
      }, n.style), e.style),
      height: s,
      width: s,
      xmlns: "http://www.w3.org/2000/svg"
    }), i && /* @__PURE__ */ R.createElement("title", null, i), e.children);
  };
  return He !== void 0 ? /* @__PURE__ */ R.createElement(He.Consumer, null, (n) => t(n)) : t(Ke);
}
function bn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M23 12L15.9289 19.0711L14.5147 17.6569L20.1716 12L14.5147 6.34317L15.9289 4.92896L23 12ZM3.82843 12L9.48528 17.6569L8.07107 19.0711L1 12L8.07107 4.92896L9.48528 6.34317L3.82843 12Z" }, child: [] }] })(e);
}
function fe(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 8L9.00319 2H19.9978C20.5513 2 21 2.45531 21 2.9918V21.0082C21 21.556 20.5551 22 20.0066 22H3.9934C3.44476 22 3 21.5501 3 20.9932V8ZM10 4V9H5V20H19V4H10Z" }, child: [] }] })(e);
}
function Cn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 4H21V6H3V4ZM5 19H19V21H5V19ZM3 14H21V16H3V14ZM5 9H19V11H5V9Z" }, child: [] }] })(e);
}
function pn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 4H21V6H3V4ZM3 19H21V21H3V19ZM3 14H21V16H3V14ZM3 9H21V11H3V9Z" }, child: [] }] })(e);
}
function kn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 4H21V6H3V4ZM3 19H17V21H3V19ZM3 14H21V16H3V14ZM3 9H17V11H3V9Z" }, child: [] }] })(e);
}
function vn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 4H21V6H3V4ZM7 19H21V21H7V19ZM3 14H21V16H3V14ZM7 9H21V11H7V9Z" }, child: [] }] })(e);
}
function wn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8 11H12.5C13.8807 11 15 9.88071 15 8.5C15 7.11929 13.8807 6 12.5 6H8V11ZM18 15.5C18 17.9853 15.9853 20 13.5 20H6V4H12.5C14.9853 4 17 6.01472 17 8.5C17 9.70431 16.5269 10.7981 15.7564 11.6058C17.0979 12.3847 18 13.837 18 15.5ZM8 13V18H13.5C14.8807 18 16 16.8807 16 15.5C16 14.1193 14.8807 13 13.5 13H8Z" }, child: [] }] })(e);
}
function Hn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3.41436 5.99995L5.70726 3.70706L4.29304 2.29285L0.585938 5.99995L4.29304 9.70706L5.70726 8.29285L3.41436 5.99995ZM9.58594 5.99995L7.29304 3.70706L8.70726 2.29285L12.4144 5.99995L8.70726 9.70706L7.29304 8.29285L9.58594 5.99995ZM14.0002 2.99995H21.0002C21.5524 2.99995 22.0002 3.44767 22.0002 3.99995V20C22.0002 20.5522 21.5524 21 21.0002 21H3.00015C2.44787 21 2.00015 20.5522 2.00015 20V12H4.00015V19H20.0002V4.99995H14.0002V2.99995Z" }, child: [] }] })(e);
}
function ye(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M5.55397 22H3.3999L10.9999 3H12.9999L20.5999 22H18.4458L16.0458 16H7.95397L5.55397 22ZM8.75397 14H15.2458L11.9999 5.88517L8.75397 14Z" }, child: [] }] })(e);
}
function Ye(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M13 20H11V13H4V20H2V4H4V11H11V4H13V20ZM21.0005 8V20H19.0005L19 10.204L17 10.74V8.67L19.5005 8H21.0005Z" }, child: [] }] })(e);
}
function Je(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M4 4V11H11V4H13V20H11V13H4V20H2V4H4ZM18.5 8C20.5711 8 22.25 9.67893 22.25 11.75C22.25 12.6074 21.9623 13.3976 21.4781 14.0292L21.3302 14.2102L18.0343 18H22V20H15L14.9993 18.444L19.8207 12.8981C20.0881 12.5908 20.25 12.1893 20.25 11.75C20.25 10.7835 19.4665 10 18.5 10C17.5818 10 16.8288 10.7071 16.7558 11.6065L16.75 11.75H14.75C14.75 9.67893 16.4289 8 18.5 8Z" }, child: [] }] })(e);
}
function Qe(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M22 8L21.9984 10L19.4934 12.883C21.0823 13.3184 22.25 14.7728 22.25 16.5C22.25 18.5711 20.5711 20.25 18.5 20.25C16.674 20.25 15.1528 18.9449 14.8184 17.2166L16.7821 16.8352C16.9384 17.6413 17.6481 18.25 18.5 18.25C19.4665 18.25 20.25 17.4665 20.25 16.5C20.25 15.5335 19.4665 14.75 18.5 14.75C18.214 14.75 17.944 14.8186 17.7056 14.9403L16.3992 13.3932L19.3484 10H15V8H22ZM4 4V11H11V4H13V20H11V13H4V20H2V4H4Z" }, child: [] }] })(e);
}
function Mn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 4H21V6H3V4ZM3 19H21V21H3V19ZM11 14H21V16H11V14ZM11 9H21V11H11V9ZM3 12.5L7 9V16L3 12.5Z" }, child: [] }] })(e);
}
function yn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 4H21V6H3V4ZM3 19H21V21H3V19ZM11 14H21V16H11V14ZM11 9H21V11H11V9ZM7 12.5L3 16V9L7 12.5Z" }, child: [] }] })(e);
}
function Se(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8 5H11V19H8V21H16V19H13V5H16V3H8V5ZM2 7C1.44772 7 1 7.44772 1 8V16C1 16.5523 1.44772 17 2 17H8V15H3V9H8V7H2ZM16 9H21V15H16V17H22C22.5523 17 23 16.5523 23 16V8C23 7.44772 22.5523 7 22 7H16V9Z" }, child: [] }] })(e);
}
function Sn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M15 20H7V18H9.92661L12.0425 6H9V4H17V6H14.0734L11.9575 18H15V20Z" }, child: [] }] })(e);
}
function Vn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M17 17H22V19H19V22H17V17ZM7 7H2V5H5V2H7V7ZM18.364 15.5355L16.9497 14.1213L18.364 12.7071C20.3166 10.7545 20.3166 7.58866 18.364 5.63604C16.4113 3.68342 13.2455 3.68342 11.2929 5.63604L9.87868 7.05025L8.46447 5.63604L9.87868 4.22183C12.6123 1.48816 17.0445 1.48816 19.7782 4.22183C22.5118 6.9555 22.5118 11.3877 19.7782 14.1213L18.364 15.5355ZM15.5355 18.364L14.1213 19.7782C11.3877 22.5118 6.9555 22.5118 4.22183 19.7782C1.48816 17.0445 1.48816 12.6123 4.22183 9.87868L5.63604 8.46447L7.05025 9.87868L5.63604 11.2929C3.68342 13.2455 3.68342 16.4113 5.63604 18.364C7.58866 20.3166 10.7545 20.3166 12.7071 18.364L14.1213 16.9497L15.5355 18.364ZM14.8284 7.75736L16.2426 9.17157L9.17157 16.2426L7.75736 14.8284L14.8284 7.75736Z" }, child: [] }] })(e);
}
function et(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M18.3638 15.5355L16.9496 14.1213L18.3638 12.7071C20.3164 10.7545 20.3164 7.58866 18.3638 5.63604C16.4112 3.68341 13.2453 3.68341 11.2927 5.63604L9.87849 7.05025L8.46428 5.63604L9.87849 4.22182C12.6122 1.48815 17.0443 1.48815 19.778 4.22182C22.5117 6.95549 22.5117 11.3876 19.778 14.1213L18.3638 15.5355ZM15.5353 18.364L14.1211 19.7782C11.3875 22.5118 6.95531 22.5118 4.22164 19.7782C1.48797 17.0445 1.48797 12.6123 4.22164 9.87868L5.63585 8.46446L7.05007 9.87868L5.63585 11.2929C3.68323 13.2455 3.68323 16.4113 5.63585 18.364C7.58847 20.3166 10.7543 20.3166 12.7069 18.364L14.1211 16.9497L15.5353 18.364ZM14.8282 7.75736L16.2425 9.17157L9.17139 16.2426L7.75717 14.8284L14.8282 7.75736Z" }, child: [] }] })(e);
}
function tt(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8.00008 6V9H5.00008V6H8.00008ZM3.00008 4V11H10.0001V4H3.00008ZM13.0001 4H21.0001V6H13.0001V4ZM13.0001 11H21.0001V13H13.0001V11ZM13.0001 18H21.0001V20H13.0001V18ZM10.7072 16.2071L9.29297 14.7929L6.00008 18.0858L4.20718 16.2929L2.79297 17.7071L6.00008 20.9142L10.7072 16.2071Z" }, child: [] }] })(e);
}
function nt(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8 4H21V6H8V4ZM5 3V6H6V7H3V6H4V4H3V3H5ZM3 14V11.5H5V11H3V10H6V12.5H4V13H6V14H3ZM5 19.5H3V18.5H5V18H3V17H6V21H3V20H5V19.5ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z" }, child: [] }] })(e);
}
function ot(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8 4H21V6H8V4ZM4.5 6.5C3.67157 6.5 3 5.82843 3 5C3 4.17157 3.67157 3.5 4.5 3.5C5.32843 3.5 6 4.17157 6 5C6 5.82843 5.32843 6.5 4.5 6.5ZM4.5 13.5C3.67157 13.5 3 12.8284 3 12C3 11.1716 3.67157 10.5 4.5 10.5C5.32843 10.5 6 11.1716 6 12C6 12.8284 5.32843 13.5 4.5 13.5ZM4.5 20.4C3.67157 20.4 3 19.7284 3 18.9C3 18.0716 3.67157 17.4 4.5 17.4C5.32843 17.4 6 18.0716 6 18.9C6 19.7284 5.32843 20.4 4.5 20.4ZM8 11H21V13H8V11ZM8 18H21V20H8V18Z" }, child: [] }] })(e);
}
function xn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M17.1538 14C17.3846 14.5161 17.5 15.0893 17.5 15.7196C17.5 17.0625 16.9762 18.1116 15.9286 18.867C14.8809 19.6223 13.4335 20 11.5862 20C9.94674 20 8.32335 19.6185 6.71592 18.8555V16.6009C8.23538 17.4783 9.7908 17.917 11.3822 17.917C13.9333 17.917 15.2128 17.1846 15.2208 15.7196C15.2208 15.0939 15.0049 14.5598 14.5731 14.1173C14.5339 14.0772 14.4939 14.0381 14.4531 14H3V12H21V14H17.1538ZM13.076 11H7.62908C7.4566 10.8433 7.29616 10.6692 7.14776 10.4778C6.71592 9.92084 6.5 9.24559 6.5 8.45207C6.5 7.21602 6.96583 6.165 7.89749 5.299C8.82916 4.43299 10.2706 4 12.2219 4C13.6934 4 15.1009 4.32808 16.4444 4.98426V7.13591C15.2448 6.44921 13.9293 6.10587 12.4978 6.10587C10.0187 6.10587 8.77917 6.88793 8.77917 8.45207C8.77917 8.87172 8.99709 9.23796 9.43293 9.55079C9.86878 9.86362 10.4066 10.1135 11.0463 10.3004C11.6665 10.4816 12.3431 10.7148 13.076 11H13.076Z" }, child: [] }] })(e);
}
function Ln(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M13 10V14H19V10H13ZM11 10H5V14H11V10ZM13 19H19V16H13V19ZM11 19V16H5V19H11ZM13 5V8H19V5H13ZM11 5H5V8H11V5ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3Z" }, child: [] }] })(e);
}
function be(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M13 6V21H11V6H5V4H19V6H13Z" }, child: [] }] })(e);
}
function Bn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M8 3V12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12V3H18V12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12V3H8ZM4 20H20V22H4V20Z" }, child: [] }] })(e);
}
function Tn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 5V19H16V5H8ZM4 5V7H6V5H4ZM18 5V7H20V5H18ZM4 9V11H6V9H4ZM18 9V11H20V9H18ZM4 13V15H6V13H4ZM18 13V15H20V13H18ZM4 17V19H6V17H4ZM18 17V19H20V17H18Z" }, child: [] }] })(e);
}
function rt(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M5 11.1005L7 9.1005L12.5 14.6005L16 11.1005L19 14.1005V5H5V11.1005ZM4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10Z" }, child: [] }] })(e);
}
function _n(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M21 15V18H24V20H21V23H19V20H16V18H19V15H21ZM21.0082 3C21.556 3 22 3.44495 22 3.9934L22.0007 13.3417C21.3749 13.1204 20.7015 13 20 13V5H4L4.001 19L13.2929 9.70715C13.6528 9.34604 14.22 9.31823 14.6123 9.62322L14.7065 9.70772L18.2521 13.2586C15.791 14.0069 14 16.2943 14 19C14 19.7015 14.1204 20.3749 14.3417 21.0007L2.9918 21C2.44405 21 2 20.5551 2 20.0066V3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082ZM8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7Z" }, child: [] }] })(e);
}
function En(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M20 3C20.5523 3 21 3.44772 21 4V5.757L19 7.757V5H5V13.1L9 9.1005L13.328 13.429L12.0012 14.7562L11.995 18.995L16.2414 19.0012L17.571 17.671L18.8995 19H19V16.242L21 14.242V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3H20ZM21.7782 7.80761L23.1924 9.22183L15.4142 17L13.9979 16.9979L14 15.5858L21.7782 7.80761ZM15.5 7C16.3284 7 17 7.67157 17 8.5C17 9.32843 16.3284 10 15.5 10C14.6716 10 14 9.32843 14 8.5C14 7.67157 14.6716 7 15.5 7Z" }, child: [] }] })(e);
}
function Rn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M3 3.9934C3 3.44476 3.44495 3 3.9934 3H20.0066C20.5552 3 21 3.44495 21 3.9934V20.0066C21 20.5552 20.5551 21 20.0066 21H3.9934C3.44476 21 3 20.5551 3 20.0066V3.9934ZM10.6219 8.41459C10.5562 8.37078 10.479 8.34741 10.4 8.34741C10.1791 8.34741 10 8.52649 10 8.74741V15.2526C10 15.3316 10.0234 15.4088 10.0672 15.4745C10.1897 15.6583 10.4381 15.708 10.6219 15.5854L15.5008 12.3328C15.5447 12.3035 15.5824 12.2658 15.6117 12.2219C15.7343 12.0381 15.6846 11.7897 15.5008 11.6672L10.6219 8.41459Z" }, child: [] }] })(e);
}
function lt(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M2 16.0001H5.88889L11.1834 20.3319C11.2727 20.405 11.3846 20.4449 11.5 20.4449C11.7761 20.4449 12 20.2211 12 19.9449V4.05519C12 3.93977 11.9601 3.8279 11.887 3.73857C11.7121 3.52485 11.3971 3.49335 11.1834 3.66821L5.88889 8.00007H2C1.44772 8.00007 1 8.44778 1 9.00007V15.0001C1 15.5524 1.44772 16.0001 2 16.0001ZM23 12C23 15.292 21.5539 18.2463 19.2622 20.2622L17.8445 18.8444C19.7758 17.1937 21 14.7398 21 12C21 9.26016 19.7758 6.80629 17.8445 5.15557L19.2622 3.73779C21.5539 5.75368 23 8.70795 23 12ZM18 12C18 10.0883 17.106 8.38548 15.7133 7.28673L14.2842 8.71584C15.3213 9.43855 16 10.64 16 12C16 13.36 15.3213 14.5614 14.2842 15.2841L15.7133 16.7132C17.106 15.6145 18 13.9116 18 12Z" }, child: [] }] })(e);
}
function Pn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M11 11V5H13V11H19V13H13V19H11V13H5V11H11Z" }, child: [] }] })(e);
}
function Nn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V8H2V6H7V3C7 2.44772 7.44772 2 8 2H16C16.5523 2 17 2.44772 17 3V6ZM18 8H6V20H18V8ZM9 4V6H15V4H9Z" }, child: [] }] })(e);
}
function In(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M4 19H20V12H22V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V12H4V19ZM14 9H19L12 16L5 9H10V3H14V9Z" }, child: [] }] })(e);
}
function On(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M10 6V8H5V19H16V14H18V20C18 20.5523 17.5523 21 17 21H4C3.44772 21 3 20.5523 3 20V7C3 6.44772 3.44772 6 4 6H10ZM21 3V12L17.206 8.207L11.2071 14.2071L9.79289 12.7929L15.792 6.793L12 3H21Z" }, child: [] }] })(e);
}
function Zn(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "currentColor" }, child: [{ tag: "path", attr: { d: "M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM8 13C8 15.2091 9.79086 17 12 17C14.2091 17 16 15.2091 16 13H8ZM8 11C8.82843 11 9.5 10.3284 9.5 9.5C9.5 8.67157 8.82843 8 8 8C7.17157 8 6.5 8.67157 6.5 9.5C6.5 10.3284 7.17157 11 8 11ZM16 11C16.8284 11 17.5 10.3284 17.5 9.5C17.5 8.67157 16.8284 8 16 8C15.1716 8 14.5 8.67157 14.5 9.5C14.5 10.3284 15.1716 11 16 11Z" }, child: [] }] })(e);
}
function T(e) {
  const t = E();
  if (e || (e = t == null ? void 0 : t.editor), !e)
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument"
    );
  const n = e, [o, r] = f(() => {
    var i;
    return ((i = n.getSelection()) == null ? void 0 : i.blocks) || [n.getTextCursorPosition().block];
  });
  return N(
    () => {
      var i;
      return r(
        ((i = n.getSelection()) == null ? void 0 : i.blocks) || [n.getTextCursorPosition().block]
      );
    },
    n
  ), o;
}
const Dn = {
  bold: wn,
  italic: Sn,
  underline: Bn,
  strike: xn,
  code: bn
};
function An(e, t) {
  return e in t.schema.styleSchema && t.schema.styleSchema[e].type === e && t.schema.styleSchema[e].propSchema === "boolean";
}
const K = (e) => {
  const t = V(), n = p(), o = v(), r = An(
    e.basicTextStyle,
    o
  ), i = T(o), [c, s] = f(
    e.basicTextStyle in o.getActiveStyles()
  );
  N(() => {
    r && s(e.basicTextStyle in o.getActiveStyles());
  }, o);
  const d = (g) => {
    if (o.focus(), !!r) {
      if (o.schema.styleSchema[g].propSchema !== "boolean")
        throw new Error("can only toggle boolean styles");
      o.toggleStyles({ [g]: !0 });
    }
  };
  if (!H(() => r ? !!i.find((g) => g.content !== void 0) : !1, [r, i]) || !o.isEditable)
    return null;
  const u = Dn[e.basicTextStyle];
  return /* @__PURE__ */ l(
    n.Toolbar.Button,
    {
      className: "bn-button",
      "data-test": e.basicTextStyle,
      onClick: () => d(e.basicTextStyle),
      isSelected: c,
      label: t.formatting_toolbar[e.basicTextStyle].tooltip,
      mainTooltip: t.formatting_toolbar[e.basicTextStyle].tooltip,
      secondaryTooltip: ee(
        t.formatting_toolbar[e.basicTextStyle].secondary_tooltip,
        t.generic.ctrl_shortcut
      ),
      icon: /* @__PURE__ */ l(u, {})
    }
  );
}, ie = (e) => {
  const t = e.textColor || "default", n = e.backgroundColor || "default", o = e.size || 16, r = H(
    () => ({
      pointerEvents: "none",
      fontSize: (o * 0.75).toString() + "px",
      height: o.toString() + "px",
      lineHeight: o.toString() + "px",
      textAlign: "center",
      width: o.toString() + "px"
    }),
    [o]
  );
  return /* @__PURE__ */ l(
    "div",
    {
      className: "bn-color-icon",
      "data-background-color": n,
      "data-text-color": t,
      style: r,
      children: "A"
    }
  );
}, Ve = [
  "default",
  "gray",
  "brown",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink"
], it = (e) => {
  const t = p(), n = V();
  return /* @__PURE__ */ M(B, { children: [
    /* @__PURE__ */ l(() => e.text ? /* @__PURE__ */ M(B, { children: [
      /* @__PURE__ */ l(t.Generic.Menu.Label, { children: n.color_picker.text_title }),
      Ve.map((i) => /* @__PURE__ */ l(
        t.Generic.Menu.Item,
        {
          onClick: () => {
            e.onClick && e.onClick(), e.text.setColor(i);
          },
          "data-test": "text-color-" + i,
          icon: /* @__PURE__ */ l(ie, { textColor: i, size: e.iconSize }),
          checked: e.text.color === i,
          children: n.color_picker.colors[i]
        },
        "text-color-" + i
      ))
    ] }) : null, {}),
    /* @__PURE__ */ l(() => e.background ? /* @__PURE__ */ M(B, { children: [
      /* @__PURE__ */ l(t.Generic.Menu.Label, { children: n.color_picker.background_title }),
      Ve.map((i) => /* @__PURE__ */ l(
        t.Generic.Menu.Item,
        {
          onClick: () => {
            e.onClick && e.onClick(), e.background.setColor(i);
          },
          "data-test": "background-color-" + i,
          icon: /* @__PURE__ */ l(ie, { backgroundColor: i, size: e.iconSize }),
          checked: e.background.color === i,
          children: n.color_picker.colors[i]
        },
        "background-color-" + i
      ))
    ] }) : null, {})
  ] });
};
function xe(e, t) {
  return `${e}Color` in t.schema.styleSchema && t.schema.styleSchema[`${e}Color`].type === `${e}Color` && t.schema.styleSchema[`${e}Color`].propSchema === "string";
}
const Fn = () => {
  const e = p(), t = V(), n = v(), o = xe("text", n), r = xe("background", n), i = T(n), [c, s] = f(
    o && n.getActiveStyles().textColor || "default"
  ), [d, a] = f(
    r && n.getActiveStyles().backgroundColor || "default"
  );
  N(() => {
    o && s(n.getActiveStyles().textColor || "default"), r && a(
      n.getActiveStyles().backgroundColor || "default"
    );
  }, n);
  const u = k(
    (h) => {
      if (!o)
        throw Error(
          "Tried to set text color, but style does not exist in editor schema."
        );
      h === "default" ? n.removeStyles({ textColor: h }) : n.addStyles({ textColor: h }), setTimeout(() => {
        n.focus();
      });
    },
    [n, o]
  ), g = k(
    (h) => {
      if (!r)
        throw Error(
          "Tried to set background color, but style does not exist in editor schema."
        );
      h === "default" ? n.removeStyles({ backgroundColor: h }) : n.addStyles({ backgroundColor: h }), setTimeout(() => {
        n.focus();
      });
    },
    [r, n]
  );
  return !H(() => {
    if (!o && !r)
      return !1;
    for (const h of i)
      if (h.content !== void 0)
        return !0;
    return !1;
  }, [r, i, o]) || !n.isEditable ? null : /* @__PURE__ */ M(e.Generic.Menu.Root, { children: [
    /* @__PURE__ */ l(e.Generic.Menu.Trigger, { children: /* @__PURE__ */ l(
      e.Toolbar.Button,
      {
        className: "bn-button",
        "data-test": "colors",
        label: t.formatting_toolbar.colors.tooltip,
        mainTooltip: t.formatting_toolbar.colors.tooltip,
        icon: /* @__PURE__ */ l(
          ie,
          {
            textColor: c,
            backgroundColor: d,
            size: 20
          }
        )
      }
    ) }),
    /* @__PURE__ */ l(
      e.Generic.Menu.Dropdown,
      {
        className: "bn-menu-dropdown bn-color-picker-dropdown",
        children: /* @__PURE__ */ l(
          it,
          {
            text: o ? {
              color: c,
              setColor: u
            } : void 0,
            background: r ? {
              color: d,
              setColor: g
            } : void 0
          }
        )
      }
    )
  ] });
}, Le = (e) => {
  for (const t of wt)
    if (e.startsWith(t))
      return e;
  return `${Ht}://${e}`;
}, ct = (e) => {
  const t = p(), n = V(), { url: o, text: r, editLink: i } = e, [c, s] = f(o), [d, a] = f(r);
  y(() => {
    s(o), a(r);
  }, [r, o]);
  const u = k(
    (b) => {
      b.key === "Enter" && (b.preventDefault(), i(Le(c), d));
    },
    [i, c, d]
  ), g = k(
    (b) => s(b.currentTarget.value),
    []
  ), m = k(
    (b) => a(b.currentTarget.value),
    []
  ), h = k(
    () => i(Le(c), d),
    [i, c, d]
  );
  return /* @__PURE__ */ M(t.Generic.Form.Root, { children: [
    /* @__PURE__ */ l(
      t.Generic.Form.TextInput,
      {
        className: "bn-text-input",
        name: "url",
        icon: /* @__PURE__ */ l(et, {}),
        autoFocus: !0,
        placeholder: n.link_toolbar.form.url_placeholder,
        value: c,
        onKeyDown: u,
        onChange: g,
        onSubmit: h
      }
    ),
    /* @__PURE__ */ l(
      t.Generic.Form.TextInput,
      {
        className: "bn-text-input",
        name: "title",
        icon: /* @__PURE__ */ l(be, {}),
        placeholder: n.link_toolbar.form.title_placeholder,
        value: d,
        onKeyDown: u,
        onChange: m,
        onSubmit: h
      }
    )
  ] });
};
function Un(e) {
  return "link" in e.schema.inlineContentSchema && e.schema.inlineContentSchema.link === "link";
}
const zn = () => {
  var h;
  const e = v(), t = p(), n = V(), o = Un(e), r = T(e), [i, c] = f(!1), [s, d] = f(e.getSelectedLinkUrl() || ""), [a, u] = f(e.getSelectedText());
  N(() => {
    c(!1), u(e.getSelectedText() || ""), d(e.getSelectedLinkUrl() || "");
  }, e), y(() => {
    var S;
    const b = (w) => {
      (w.ctrlKey || w.metaKey) && w.key === "k" && (c(!0), w.preventDefault());
    };
    return (S = e.prosemirrorView) == null || S.dom.addEventListener("keydown", b), () => {
      var w;
      (w = e.prosemirrorView) == null || w.dom.removeEventListener("keydown", b);
    };
  }, [(h = e.prosemirrorView) == null ? void 0 : h.dom]);
  const g = k(
    (b, S) => {
      e.createLink(b, S), e.focus();
    },
    [e]
  );
  return !H(() => {
    if (!o)
      return !1;
    for (const b of r)
      if (b.content === void 0)
        return !1;
    return !0;
  }, [o, r]) || !("link" in e.schema.inlineContentSchema) || !e.isEditable ? null : /* @__PURE__ */ M(t.Generic.Popover.Root, { opened: i, children: [
    /* @__PURE__ */ l(t.Generic.Popover.Trigger, { children: /* @__PURE__ */ l(
      t.Toolbar.Button,
      {
        className: "bn-button",
        "data-test": "createLink",
        label: n.formatting_toolbar.link.tooltip,
        mainTooltip: n.formatting_toolbar.link.tooltip,
        secondaryTooltip: ee(
          n.formatting_toolbar.link.secondary_tooltip,
          n.generic.ctrl_shortcut
        ),
        icon: /* @__PURE__ */ l(et, {}),
        onClick: () => c(!0)
      }
    ) }),
    /* @__PURE__ */ l(
      t.Generic.Popover.Content,
      {
        className: "bn-popover-content bn-form-popover",
        variant: "form-popover",
        children: /* @__PURE__ */ l(ct, { url: s, text: a, editLink: g })
      }
    )
  ] });
}, Wn = () => {
  const e = V(), t = p(), n = v(), [o, r] = f(), i = T(n), c = H(() => {
    if (i.length !== 1)
      return;
    const a = i[0];
    if (U(a, n))
      return r(a.props.caption), a;
  }, [n, i]), s = k(
    (a) => {
      c && a.key === "Enter" && (a.preventDefault(), n.updateBlock(c, {
        props: {
          caption: o
          // TODO
        }
      }));
    },
    [o, n, c]
  ), d = k(
    (a) => r(a.currentTarget.value),
    []
  );
  return !c || z(c, n) || !n.isEditable ? null : /* @__PURE__ */ M(t.Generic.Popover.Root, { children: [
    /* @__PURE__ */ l(t.Generic.Popover.Trigger, { children: /* @__PURE__ */ l(
      t.Toolbar.Button,
      {
        className: "bn-button",
        label: e.formatting_toolbar.file_caption.tooltip,
        mainTooltip: e.formatting_toolbar.file_caption.tooltip,
        icon: /* @__PURE__ */ l(Se, {}),
        isSelected: c.props.caption !== ""
      }
    ) }),
    /* @__PURE__ */ l(
      t.Generic.Popover.Content,
      {
        className: "bn-popover-content bn-form-popover",
        variant: "form-popover",
        children: /* @__PURE__ */ l(t.Generic.Form.Root, { children: /* @__PURE__ */ l(
          t.Generic.Form.TextInput,
          {
            name: "file-caption",
            icon: /* @__PURE__ */ l(Se, {}),
            value: o || "",
            autoFocus: !0,
            placeholder: e.formatting_toolbar.file_caption.input_placeholder,
            onKeyDown: s,
            onChange: d
          }
        ) })
      }
    )
  ] });
}, Gn = () => {
  const e = V(), t = p(), n = v(), o = T(n), r = H(() => {
    if (o.length !== 1)
      return;
    const c = o[0];
    if (U(c, n))
      return c;
  }, [n, o]), i = k(() => {
    n.focus(), n.removeBlocks([r]);
  }, [n, r]);
  return !r || z(r, n) || !n.isEditable ? null : /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      label: e.formatting_toolbar.file_delete.tooltip[r.type] || e.formatting_toolbar.file_delete.tooltip.file,
      mainTooltip: e.formatting_toolbar.file_delete.tooltip[r.type] || e.formatting_toolbar.file_delete.tooltip.file,
      icon: /* @__PURE__ */ l(Nn, {}),
      onClick: i
    }
  );
}, jn = () => {
  const e = V(), t = p(), n = v(), [o, r] = f(), i = T(n), c = H(() => {
    if (i.length !== 1)
      return;
    const a = i[0];
    if (U(a, n))
      return r(a.props.name), a;
  }, [n, i]), s = k(
    (a) => {
      c && a.key === "Enter" && (a.preventDefault(), n.updateBlock(c, {
        props: {
          name: o
          // TODO
        }
      }));
    },
    [o, n, c]
  ), d = k(
    (a) => r(a.currentTarget.value),
    []
  );
  return !c || z(c, n) || !n.isEditable ? null : /* @__PURE__ */ M(t.Generic.Popover.Root, { children: [
    /* @__PURE__ */ l(t.Generic.Popover.Trigger, { children: /* @__PURE__ */ l(
      t.Toolbar.Button,
      {
        className: "bn-button",
        label: e.formatting_toolbar.file_rename.tooltip[c.type] || e.formatting_toolbar.file_rename.tooltip.file,
        mainTooltip: e.formatting_toolbar.file_rename.tooltip[c.type] || e.formatting_toolbar.file_rename.tooltip.file,
        icon: /* @__PURE__ */ l(ye, {})
      }
    ) }),
    /* @__PURE__ */ l(
      t.Generic.Popover.Content,
      {
        className: "bn-popover-content bn-form-popover",
        variant: "form-popover",
        children: /* @__PURE__ */ l(t.Generic.Form.Root, { children: /* @__PURE__ */ l(
          t.Generic.Form.TextInput,
          {
            name: "file-name",
            icon: /* @__PURE__ */ l(ye, {}),
            value: o || "",
            autoFocus: !0,
            placeholder: e.formatting_toolbar.file_rename.input_placeholder[c.type] || e.formatting_toolbar.file_rename.input_placeholder.file,
            onKeyDown: s,
            onChange: d
          }
        ) })
      }
    )
  ] });
}, $n = () => {
  const e = V(), t = p(), n = v(), o = T(n), [r, i] = f(!1);
  y(() => {
    i(!1);
  }, [o]);
  const c = o.length === 1 ? o[0] : void 0;
  return c === void 0 || !U(c, n) || !n.isEditable ? null : /* @__PURE__ */ M(t.Generic.Popover.Root, { opened: r, position: "bottom", children: [
    /* @__PURE__ */ l(t.Generic.Popover.Trigger, { children: /* @__PURE__ */ l(
      t.Toolbar.Button,
      {
        className: "bn-button",
        onClick: () => i(!r),
        isSelected: r,
        mainTooltip: e.formatting_toolbar.file_replace.tooltip[c.type] || e.formatting_toolbar.file_replace.tooltip.file,
        label: e.formatting_toolbar.file_replace.tooltip[c.type] || e.formatting_toolbar.file_replace.tooltip.file,
        icon: /* @__PURE__ */ l(En, {})
      }
    ) }),
    /* @__PURE__ */ l(
      t.Generic.Popover.Content,
      {
        className: "bn-popover-content bn-panel-popover",
        variant: "panel-popover",
        children: /* @__PURE__ */ l(qe, { block: c })
      }
    )
  ] });
}, qn = () => {
  const e = V(), t = p(), n = v(), o = T(n), [r, i] = f(
    () => n.canNestBlock()
  );
  N(() => {
    i(n.canNestBlock());
  }, n);
  const c = k(() => {
    n.focus(), n.nestBlock();
  }, [n]);
  return !H(() => !o.find(
    (d) => n.schema.blockSchema[d.type].content !== "inline"
  ), [n.schema.blockSchema, o]) || !n.isEditable ? null : /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      "data-test": "nestBlock",
      onClick: c,
      isDisabled: !r,
      label: e.formatting_toolbar.nest.tooltip,
      mainTooltip: e.formatting_toolbar.nest.tooltip,
      secondaryTooltip: ee(
        e.formatting_toolbar.nest.secondary_tooltip,
        e.generic.ctrl_shortcut
      ),
      icon: /* @__PURE__ */ l(yn, {})
    }
  );
}, Kn = () => {
  const e = V(), t = p(), n = v(), o = T(n), [r, i] = f(
    () => n.canUnnestBlock()
  );
  N(() => {
    i(n.canUnnestBlock());
  }, n);
  const c = k(() => {
    n.focus(), n.unnestBlock();
  }, [n]);
  return !H(() => !o.find(
    (d) => n.schema.blockSchema[d.type].content !== "inline"
  ), [n.schema.blockSchema, o]) || !n.isEditable ? null : /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      "data-test": "unnestBlock",
      onClick: c,
      isDisabled: !r,
      label: e.formatting_toolbar.unnest.tooltip,
      mainTooltip: e.formatting_toolbar.unnest.tooltip,
      secondaryTooltip: ee(
        e.formatting_toolbar.unnest.secondary_tooltip,
        e.generic.ctrl_shortcut
      ),
      icon: /* @__PURE__ */ l(Mn, {})
    }
  );
}, Xn = (e) => [
  {
    name: e.slash_menu.paragraph.title,
    type: "paragraph",
    icon: be,
    isSelected: (t) => t.type === "paragraph"
  },
  {
    name: e.slash_menu.heading.title,
    type: "heading",
    props: { level: 1 },
    icon: Ye,
    isSelected: (t) => t.type === "heading" && "level" in t.props && t.props.level === 1
  },
  {
    name: e.slash_menu.heading_2.title,
    type: "heading",
    props: { level: 2 },
    icon: Je,
    isSelected: (t) => t.type === "heading" && "level" in t.props && t.props.level === 2
  },
  {
    name: e.slash_menu.heading_3.title,
    type: "heading",
    props: { level: 3 },
    icon: Qe,
    isSelected: (t) => t.type === "heading" && "level" in t.props && t.props.level === 3
  },
  {
    name: e.slash_menu.bullet_list.title,
    type: "bulletListItem",
    icon: ot,
    isSelected: (t) => t.type === "bulletListItem"
  },
  {
    name: e.slash_menu.numbered_list.title,
    type: "numberedListItem",
    icon: nt,
    isSelected: (t) => t.type === "numberedListItem"
  },
  {
    name: e.slash_menu.check_list.title,
    type: "checkListItem",
    icon: tt,
    isSelected: (t) => t.type === "checkListItem"
  }
], Yn = (e) => {
  const t = p(), n = V(), o = v(), r = T(o), [i, c] = f(o.getTextCursorPosition().block), s = H(() => (e.items || Xn(n)).filter((u) => {
    const g = u.type in o.schema.blockSchema, m = u.isSelected(i), h = u.showWhileSelected === void 0 || u.showWhileSelected, b = u.showWhileNotSelected === void 0 || u.showWhileNotSelected;
    return g && (m ? h : b);
  }), [e.items, n, o.schema.blockSchema, i]), d = H(
    () => s.find((u) => u.type === i.type) !== void 0,
    [i.type, s]
  ), a = H(() => {
    const u = (g) => {
      o.focus();
      for (const m of r)
        o.updateBlock(m, {
          type: g.type,
          props: g.props
        });
    };
    return s.map((g) => {
      const m = g.icon;
      return {
        text: g.name,
        icon: /* @__PURE__ */ l(m, { size: 16 }),
        onClick: () => u(g),
        isSelected: g.isSelected(i)
      };
    });
  }, [i, s, o, r]);
  return N(() => {
    c(o.getTextCursorPosition().block);
  }, o), !d || !o.isEditable ? null : /* @__PURE__ */ l(t.Toolbar.Select, { className: "bn-select", items: a });
};
function ce(e, t) {
  try {
    const n = new URL(e, t);
    if (n.protocol !== "javascript:")
      return n.href;
  } catch {
  }
  return "#";
}
const Jn = () => {
  const e = V(), t = p(), n = v(), o = T(n), r = H(() => {
    if (o.length !== 1)
      return;
    const c = o[0];
    if (U(c, n))
      return c;
  }, [n, o]), i = k(() => {
    r && r.props.url && (n.focus(), n.resolveFileUrl ? n.resolveFileUrl(r.props.url).then(
      (c) => window.open(ce(c, window.location.href))
    ) : window.open(ce(r.props.url, window.location.href)));
  }, [n, r]);
  return !r || z(r, n) ? null : /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      label: e.formatting_toolbar.file_download.tooltip[r.type] || e.formatting_toolbar.file_download.tooltip.file,
      mainTooltip: e.formatting_toolbar.file_download.tooltip[r.type] || e.formatting_toolbar.file_download.tooltip.file,
      icon: /* @__PURE__ */ l(In, {}),
      onClick: i
    }
  );
}, Qn = () => {
  const e = V(), t = p(), n = v(), o = T(n), r = H(() => {
    if (o.length !== 1)
      return;
    const c = o[0];
    if (Mt(c, n))
      return c;
  }, [n, o]), i = k(() => {
    r && n.updateBlock(r, {
      props: {
        showPreview: !r.props.showPreview
        // TODO
      }
    });
  }, [n, r]);
  return !r || z(r, n) || !n.isEditable ? null : /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      label: "Toggle preview",
      mainTooltip: e.formatting_toolbar.file_preview_toggle.tooltip,
      icon: /* @__PURE__ */ l(_n, {}),
      isSelected: r.props.showPreview,
      onClick: i
    }
  );
}, eo = {
  left: kn,
  center: Cn,
  right: vn,
  justify: pn
}, oe = (e) => {
  const t = p(), n = V(), o = v(), r = T(o), i = H(() => {
    const a = r[0];
    if (le("textAlignment", a, o))
      return a.props.textAlignment;
  }, [o, r]), c = k(
    (a) => {
      o.focus();
      for (const u of r)
        A("textAlignment", u.type, o) && o.updateBlock(u, {
          props: { textAlignment: a }
        });
    },
    [o, r]
  );
  if (!H(() => !!r.find((a) => "textAlignment" in a.props), [r]) || !o.isEditable)
    return null;
  const d = eo[e.textAlignment];
  return /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      "data-test": `alignText${e.textAlignment.slice(0, 1).toUpperCase() + e.textAlignment.slice(1)}`,
      onClick: () => c(e.textAlignment),
      isSelected: i === e.textAlignment,
      label: n.formatting_toolbar[`align_${e.textAlignment}`].tooltip,
      mainTooltip: n.formatting_toolbar[`align_${e.textAlignment}`].tooltip,
      icon: /* @__PURE__ */ l(d, {})
    }
  );
}, to = (e) => [
  /* @__PURE__ */ l(Yn, { items: e }, "blockTypeSelect"),
  /* @__PURE__ */ l(Wn, {}, "fileCaptionButton"),
  /* @__PURE__ */ l($n, {}, "replaceFileButton"),
  /* @__PURE__ */ l(jn, {}, "fileRenameButton"),
  /* @__PURE__ */ l(Gn, {}, "fileDeleteButton"),
  /* @__PURE__ */ l(Jn, {}, "fileDownloadButton"),
  /* @__PURE__ */ l(Qn, {}, "filePreviewButton"),
  /* @__PURE__ */ l(K, { basicTextStyle: "bold" }, "boldStyleButton"),
  /* @__PURE__ */ l(K, { basicTextStyle: "italic" }, "italicStyleButton"),
  /* @__PURE__ */ l(
    K,
    {
      basicTextStyle: "underline"
    },
    "underlineStyleButton"
  ),
  /* @__PURE__ */ l(K, { basicTextStyle: "strike" }, "strikeStyleButton"),
  /* @__PURE__ */ l(oe, { textAlignment: "left" }, "textAlignLeftButton"),
  /* @__PURE__ */ l(oe, { textAlignment: "center" }, "textAlignCenterButton"),
  /* @__PURE__ */ l(oe, { textAlignment: "right" }, "textAlignRightButton"),
  /* @__PURE__ */ l(Fn, {}, "colorStyleButton"),
  /* @__PURE__ */ l(qn, {}, "nestBlockButton"),
  /* @__PURE__ */ l(Kn, {}, "unnestBlockButton"),
  /* @__PURE__ */ l(zn, {}, "createLinkButton")
], at = (e) => {
  const t = p();
  return /* @__PURE__ */ l(t.Toolbar.Root, { className: "bn-toolbar bn-formatting-toolbar", children: e.children || to(e.blockTypeSelectItems) });
}, Be = (e) => {
  switch (e) {
    case "left":
      return "top-start";
    case "center":
      return "top";
    case "right":
      return "top-end";
    default:
      return "top-start";
  }
}, no = (e) => {
  const t = I(null), n = v(), [o, r] = f(
    () => {
      const m = n.getTextCursorPosition().block;
      return "textAlignment" in m.props ? Be(
        m.props.textAlignment
      ) : "top-start";
    }
  );
  N(() => {
    const m = n.getTextCursorPosition().block;
    "textAlignment" in m.props ? r(
      Be(
        m.props.textAlignment
      )
    ) : r("top-start");
  }, n);
  const i = P(
    n.formattingToolbar.onUpdate.bind(n.formattingToolbar)
  ), { isMounted: c, ref: s, style: d, getFloatingProps: a } = Z(
    (i == null ? void 0 : i.show) || !1,
    (i == null ? void 0 : i.referencePos) || null,
    3e3,
    {
      placement: o,
      middleware: [O(10), De(), F()],
      onOpenChange: (m, h) => {
        m || (n.formattingToolbar.closeMenu(), n.focus());
      },
      ...e.floatingOptions
    }
  ), u = H(() => an([t, s]), [t, s]);
  if (!c || !i)
    return null;
  if (!i.show && t.current)
    return /* @__PURE__ */ l(
      "div",
      {
        ref: u,
        style: d,
        dangerouslySetInnerHTML: { __html: t.current.innerHTML }
      }
    );
  const g = e.formattingToolbar || at;
  return /* @__PURE__ */ l("div", { ref: u, style: d, ...a(), children: /* @__PURE__ */ l(g, {}) });
}, oo = (e) => {
  const t = p(), n = V();
  return /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      label: n.link_toolbar.delete.tooltip,
      mainTooltip: n.link_toolbar.delete.tooltip,
      isSelected: !1,
      onClick: e.deleteLink,
      icon: /* @__PURE__ */ l(Vn, {})
    }
  );
}, ro = (e) => {
  const t = p(), n = V();
  return /* @__PURE__ */ M(t.Generic.Popover.Root, { children: [
    /* @__PURE__ */ l(t.Generic.Popover.Trigger, { children: /* @__PURE__ */ l(
      t.Toolbar.Button,
      {
        className: "bn-button",
        mainTooltip: n.link_toolbar.edit.tooltip,
        isSelected: !1,
        children: n.link_toolbar.edit.text
      }
    ) }),
    /* @__PURE__ */ l(
      t.Generic.Popover.Content,
      {
        className: "bn-popover-content bn-form-popover",
        variant: "form-popover",
        children: /* @__PURE__ */ l(ct, { ...e })
      }
    )
  ] });
}, lo = (e) => {
  const t = p(), n = V();
  return /* @__PURE__ */ l(
    t.Toolbar.Button,
    {
      className: "bn-button",
      mainTooltip: n.link_toolbar.open.tooltip,
      label: n.link_toolbar.open.tooltip,
      isSelected: !1,
      onClick: () => {
        window.open(ce(e.url, window.location.href), "_blank");
      },
      icon: /* @__PURE__ */ l(On, {})
    }
  );
}, io = (e) => {
  const t = p();
  return e.children ? /* @__PURE__ */ l(t.Toolbar.Root, { className: "bn-toolbar bn-link-toolbar", children: e.children }) : /* @__PURE__ */ M(
    t.Toolbar.Root,
    {
      className: "bn-toolbar bn-link-toolbar",
      onMouseEnter: e.stopHideTimer,
      onMouseLeave: e.startHideTimer,
      children: [
        /* @__PURE__ */ l(
          ro,
          {
            url: e.url,
            text: e.text,
            editLink: e.editLink
          }
        ),
        /* @__PURE__ */ l(lo, { url: e.url }),
        /* @__PURE__ */ l(oo, { deleteLink: e.deleteLink })
      ]
    }
  );
}, co = (e) => {
  const t = v(), n = {
    deleteLink: t.linkToolbar.deleteLink,
    editLink: t.linkToolbar.editLink,
    startHideTimer: t.linkToolbar.startHideTimer,
    stopHideTimer: t.linkToolbar.stopHideTimer
  }, o = P(
    t.linkToolbar.onUpdate.bind(t.linkToolbar)
  ), { isMounted: r, ref: i, style: c, getFloatingProps: s } = Z(
    (o == null ? void 0 : o.show) || !1,
    (o == null ? void 0 : o.referencePos) || null,
    4e3,
    {
      placement: "top-start",
      middleware: [O(10), F()],
      onOpenChange: (m) => {
        m || (t.linkToolbar.closeMenu(), t.focus());
      },
      ...e.floatingOptions
    }
  );
  if (!r || !o)
    return null;
  const { show: d, referencePos: a, ...u } = o, g = e.linkToolbar || io;
  return /* @__PURE__ */ l("div", { ref: i, style: c, ...s(), children: /* @__PURE__ */ l(g, { ...u, ...n }) });
};
function ao(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 1024 1024" }, child: [{ tag: "path", attr: { d: "M482 152h60q8 0 8 8v704q0 8-8 8h-60q-8 0-8-8V160q0-8 8-8Z" }, child: [] }, { tag: "path", attr: { d: "M192 474h672q8 0 8 8v60q0 8-8 8H160q-8 0-8-8v-60q0-8 8-8Z" }, child: [] }] })(e);
}
const so = (e) => {
  const t = p(), n = V(), o = v(), r = k(() => {
    const i = e.block.content;
    if (i !== void 0 && Array.isArray(i) && i.length === 0)
      o.setTextCursorPosition(e.block), o.openSuggestionMenu("/");
    else {
      const s = o.insertBlocks(
        [{ type: "paragraph" }],
        e.block,
        "after"
      )[0];
      o.setTextCursorPosition(s), o.openSuggestionMenu("/");
    }
  }, [o, e.block]);
  return /* @__PURE__ */ l(
    t.SideMenu.Button,
    {
      className: "bn-button",
      label: n.side_menu.add_block_label,
      icon: /* @__PURE__ */ l(ao, { size: 24, onClick: r, "data-test": "dragHandleAdd" })
    }
  );
};
function st(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24" }, child: [{ tag: "path", attr: { fill: "none", d: "M0 0h24v24H0V0z" }, child: [] }, { tag: "path", attr: { d: "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" }, child: [] }] })(e);
}
const uo = (e) => {
  const t = p(), n = v();
  return !A("textColor", e.block.type, n) && !A("backgroundColor", e.block.type, n) ? null : /* @__PURE__ */ M(t.Generic.Menu.Root, { position: "right", sub: !0, children: [
    /* @__PURE__ */ l(t.Generic.Menu.Trigger, { sub: !0, children: /* @__PURE__ */ l(
      t.Generic.Menu.Item,
      {
        className: "bn-menu-item",
        subTrigger: !0,
        children: e.children
      }
    ) }),
    /* @__PURE__ */ l(
      t.Generic.Menu.Dropdown,
      {
        sub: !0,
        className: "bn-menu-dropdown bn-color-picker-dropdown",
        children: /* @__PURE__ */ l(
          it,
          {
            iconSize: 18,
            text: A(
              "textColor",
              e.block.type,
              n
            ) && le("textColor", e.block, n) ? {
              color: e.block.props.textColor,
              setColor: (o) => n.updateBlock(e.block, {
                type: e.block.type,
                props: { textColor: o }
              })
            } : void 0,
            background: A(
              "backgroundColor",
              e.block.type,
              n
            ) && le("backgroundColor", e.block, n) ? {
              color: e.block.props.backgroundColor,
              setColor: (o) => n.updateBlock(e.block, {
                props: { backgroundColor: o }
              })
            } : void 0
          }
        )
      }
    )
  ] });
}, go = (e) => {
  const t = p(), n = v();
  return /* @__PURE__ */ l(
    t.Generic.Menu.Item,
    {
      className: "bn-menu-item",
      onClick: () => n.removeBlocks([e.block]),
      children: e.children
    }
  );
}, mo = (e) => {
  const t = p(), n = V();
  return /* @__PURE__ */ l(
    t.Generic.Menu.Dropdown,
    {
      className: "bn-menu-dropdown bn-drag-handle-menu",
      children: e.children || /* @__PURE__ */ M(B, { children: [
        /* @__PURE__ */ l(go, { ...e, children: n.drag_handle.delete_menuitem }),
        /* @__PURE__ */ l(uo, { ...e, children: n.drag_handle.colors_menuitem })
      ] })
    }
  );
}, ho = (e) => {
  const t = p(), n = V(), o = e.dragHandleMenu || mo;
  return /* @__PURE__ */ M(
    t.Generic.Menu.Root,
    {
      onOpenChange: (r) => {
        r ? e.freezeMenu() : e.unfreezeMenu();
      },
      position: "left",
      children: [
        /* @__PURE__ */ l(t.Generic.Menu.Trigger, { children: /* @__PURE__ */ l(
          t.SideMenu.Button,
          {
            label: n.side_menu.drag_handle_label,
            draggable: !0,
            onDragStart: (r) => e.blockDragStart(r, e.block),
            onDragEnd: e.blockDragEnd,
            className: "bn-button",
            icon: /* @__PURE__ */ l(st, { size: 24, "data-test": "dragHandle" })
          }
        ) }),
        /* @__PURE__ */ l(o, { block: e.block })
      ]
    }
  );
}, fo = (e) => {
  const t = p(), n = H(() => {
    const o = {
      "data-block-type": e.block.type
    };
    return e.block.type === "heading" && (o["data-level"] = e.block.props.level.toString()), e.editor.schema.blockSchema[e.block.type].isFileBlock && (e.block.props.url ? o["data-url"] = "true" : o["data-url"] = "false"), e.block.type === "ai" && e.block.props.prompt && (o["data-prompt"] = e.block.props.prompt.toString()), o;
  }, [e.block, e.editor.schema.blockSchema]);
  return /* @__PURE__ */ l(t.SideMenu.Root, { className: "bn-side-menu", ...n, children: e.children || /* @__PURE__ */ M(B, { children: [
    /* @__PURE__ */ l(so, { ...e }),
    /* @__PURE__ */ l(ho, { ...e })
  ] }) });
}, bo = (e) => {
  const t = v(), n = {
    blockDragStart: t.sideMenu.blockDragStart,
    blockDragEnd: t.sideMenu.blockDragEnd,
    freezeMenu: t.sideMenu.freezeMenu,
    unfreezeMenu: t.sideMenu.unfreezeMenu
  }, o = P(
    t.sideMenu.onUpdate.bind(t.sideMenu)
  ), { isMounted: r, ref: i, style: c, getFloatingProps: s } = Z(
    (o == null ? void 0 : o.show) || !1,
    (o == null ? void 0 : o.referencePos) || null,
    1e3,
    {
      placement: "left-start",
      ...e.floatingOptions
    }
  );
  if (!r || !o)
    return null;
  const { show: d, referencePos: a, ...u } = o, g = e.sideMenu || fo;
  return /* @__PURE__ */ l("div", { ref: i, style: c, ...s(), children: /* @__PURE__ */ l(g, { ...u, ...n, editor: t }) });
};
async function Co(e, t) {
  return (await yt(e, t)).map(
    ({ id: n, onItemClick: o }) => ({
      id: n,
      onItemClick: o,
      icon: n
    })
  );
}
function po(e) {
  const t = p(), n = V(), { items: o, loadingState: r, selectedIndex: i, onItemClick: c, columns: s } = e, d = r === "loading-initial" || r === "loading" ? /* @__PURE__ */ l(
    t.GridSuggestionMenu.Loader,
    {
      className: "bn-grid-suggestion-menu-loader",
      columns: s,
      children: n.suggestion_menu.loading
    }
  ) : null, a = H(() => {
    const u = [];
    for (let g = 0; g < o.length; g++) {
      const m = o[g];
      u.push(
        /* @__PURE__ */ l(
          t.GridSuggestionMenu.Item,
          {
            className: "bn-grid-suggestion-menu-item",
            item: m,
            id: `bn-grid-suggestion-menu-item-${g}`,
            isSelected: g === i,
            onClick: () => c == null ? void 0 : c(m)
          },
          m.id
        )
      );
    }
    return u;
  }, [t, o, c, i]);
  return /* @__PURE__ */ M(
    t.GridSuggestionMenu.Root,
    {
      id: "bn-grid-suggestion-menu",
      columns: s,
      className: "bn-grid-suggestion-menu",
      children: [
        d,
        a,
        a.length === 0 && e.loadingState === "loaded" && /* @__PURE__ */ l(
          t.GridSuggestionMenu.EmptyItem,
          {
            className: "bn-grid-suggestion-menu-empty-item",
            columns: s,
            children: n.suggestion_menu.no_items_title
          }
        )
      ]
    }
  );
}
function dt(e, t, n, o = 3) {
  const r = I(0);
  y(() => {
    t !== void 0 && (e.length > 0 ? r.current = t.length : t.length - r.current > o && n());
  }, [n, o, e.length, t]);
}
function ut(e, t) {
  const [n, o] = f([]), [r, i] = f(!1), c = I(), s = I();
  return y(() => {
    const d = e;
    c.current = e, i(!0), t(e).then((a) => {
      c.current === d && (o(a), i(!1), s.current = d);
    });
  }, [e, t]), {
    items: n || [],
    // The query that was used to retrieve the last set of items may not be the
    // same as the current query as the items from the current query may not
    // have been retrieved yet. This is useful when using the returns of this
    // hook in other hooks.
    usedQuery: s.current,
    loadingState: s.current === void 0 ? "loading-initial" : r ? "loading" : "loaded"
  };
}
function ko(e, t, n, o, r) {
  const [i, c] = f(0), s = o !== void 0 && o > 1;
  return y(() => {
    var a;
    const d = (u) => (u.key === "ArrowLeft" && (u.preventDefault(), n.length && c((i - 1 + n.length) % n.length)), u.key === "ArrowRight" && (u.preventDefault(), n.length && c((i + 1 + n.length) % n.length)), u.key === "ArrowUp" ? (u.preventDefault(), n.length && c(
      (i - o + n.length) % n.length
    ), !0) : u.key === "ArrowDown" ? (u.preventDefault(), n.length && c((i + o) % n.length), !0) : u.key === "Enter" && !u.isComposing ? (u.stopPropagation(), u.preventDefault(), n.length && (r == null || r(n[i])), !0) : !1);
    return (a = e.domElement) == null || a.addEventListener(
      "keydown",
      d,
      !0
    ), () => {
      var u;
      (u = e.domElement) == null || u.removeEventListener(
        "keydown",
        d,
        !0
      );
    };
  }, [e.domElement, n, i, r, o, s]), y(() => {
    c(0);
  }, [t]), {
    selectedIndex: n.length === 0 ? void 0 : i
  };
}
function vo(e) {
  const n = E().setContentEditableProps, o = v(), {
    getItems: r,
    gridSuggestionMenuComponent: i,
    query: c,
    clearQuery: s,
    closeMenu: d,
    onItemClick: a,
    columns: u
  } = e, g = k(
    (x) => {
      d(), s(), a == null || a(x);
    },
    [a, d, s]
  ), { items: m, usedQuery: h, loadingState: b } = ut(
    c,
    r
  );
  dt(m, h, d);
  const { selectedIndex: S } = ko(
    o,
    c,
    m,
    u,
    g
  );
  return y(() => (n((x) => ({
    ...x,
    "aria-expanded": !0,
    "aria-controls": "bn-suggestion-menu"
  })), () => {
    n((x) => ({
      ...x,
      "aria-expanded": !1,
      "aria-controls": void 0
    }));
  }), [n]), y(() => (n((x) => ({
    ...x,
    "aria-activedescendant": S ? "bn-suggestion-menu-item-" + S : void 0
  })), () => {
    n((x) => ({
      ...x,
      "aria-activedescendant": void 0
    }));
  }), [n, S]), /* @__PURE__ */ l(
    i,
    {
      items: m,
      onItemClick: g,
      loadingState: b,
      selectedIndex: S,
      columns: u
    }
  );
}
function wo(e) {
  const t = v(), {
    triggerCharacter: n,
    gridSuggestionMenuComponent: o,
    columns: r,
    minQueryLength: i,
    onItemClick: c,
    getItems: s,
    floatingOptions: d
  } = e, a = H(() => c || ((L) => {
    L.onItemClick(t);
  }), [t, c]), u = H(() => s || (async (L) => await Co(
    t,
    L
  )), [t, s]), g = {
    closeMenu: t.suggestionMenus.closeMenu,
    clearQuery: t.suggestionMenus.clearQuery
  }, m = k(
    (L) => t.suggestionMenus.onUpdate(n, L),
    [t.suggestionMenus, n]
  ), h = P(m), { isMounted: b, ref: S, style: w, getFloatingProps: x } = Z(
    (h == null ? void 0 : h.show) || !1,
    (h == null ? void 0 : h.referencePos) || null,
    2e3,
    {
      placement: "bottom-start",
      middleware: [
        O(10),
        // Flips the menu placement to maximize the space available, and prevents
        // the menu from being cut off by the confines of the screen.
        F(),
        ue({
          apply({ availableHeight: L, elements: _ }) {
            Object.assign(_.floating.style, {
              maxHeight: `${L - 10}px`
            });
          }
        })
      ],
      onOpenChange(L) {
        L || t.suggestionMenus.closeMenu();
      },
      ...d
    }
  );
  return !b || !h || !(h != null && h.ignoreQueryLength) && i && (h.query.startsWith(" ") || h.query.length < i) ? null : /* @__PURE__ */ l("div", { ref: S, style: w, ...x(), children: /* @__PURE__ */ l(
    vo,
    {
      query: h.query,
      closeMenu: g.closeMenu,
      clearQuery: g.clearQuery,
      getItems: u,
      columns: r,
      gridSuggestionMenuComponent: o || po,
      onItemClick: a
    }
  ) });
}
function Ho(e) {
  const t = p(), n = V(), { items: o, loadingState: r, selectedIndex: i, onItemClick: c } = e, s = r === "loading-initial" || r === "loading" ? /* @__PURE__ */ l(t.SuggestionMenu.Loader, { className: "bn-suggestion-menu-loader", children: n.suggestion_menu.loading }) : null, d = H(() => {
    let a;
    const u = [];
    for (let g = 0; g < o.length; g++) {
      const m = o[g];
      m.group !== a && (a = m.group, u.push(
        /* @__PURE__ */ l(
          t.SuggestionMenu.Label,
          {
            className: "bn-suggestion-menu-label",
            children: a
          },
          a
        )
      )), u.push(
        /* @__PURE__ */ l(
          t.SuggestionMenu.Item,
          {
            className: W(
              "bn-suggestion-menu-item",
              m.size === "small" ? "bn-suggestion-menu-item-small" : ""
            ),
            item: m,
            id: `bn-suggestion-menu-item-${g}`,
            isSelected: g === i,
            onClick: () => c == null ? void 0 : c(m)
          },
          m.title
        )
      );
    }
    return u;
  }, [t, o, c, i]);
  return /* @__PURE__ */ M(
    t.SuggestionMenu.Root,
    {
      id: "bn-suggestion-menu",
      className: "bn-suggestion-menu",
      children: [
        d,
        d.length === 0 && (e.loadingState === "loading" || e.loadingState === "loaded") && /* @__PURE__ */ l(
          t.SuggestionMenu.EmptyItem,
          {
            className: "bn-suggestion-menu-item",
            children: n.suggestion_menu.no_items_title
          }
        ),
        s
      ]
    }
  );
}
function Mo(e, t) {
  const [n, o] = f(0);
  return {
    selectedIndex: n,
    setSelectedIndex: o,
    handler: (r) => {
      if (r.key === "ArrowUp")
        return r.preventDefault(), e.length && o((n - 1 + e.length) % e.length), !0;
      if (r.key === "ArrowDown")
        return r.preventDefault(), e.length && o((n + 1) % e.length), !0;
      const i = yo(r) ? r.nativeEvent.isComposing : r.isComposing;
      return r.key === "Enter" && !i ? (r.preventDefault(), r.stopPropagation(), e.length && (t == null || t(e[n])), !0) : !1;
    }
  };
}
function yo(e) {
  return e.nativeEvent !== void 0;
}
function So(e, t, n, o, r) {
  const { selectedIndex: i, setSelectedIndex: c, handler: s } = Mo(n, o);
  return y(() => {
    var d;
    return (d = r || e.domElement) == null || d.addEventListener("keydown", s, !0), () => {
      var a;
      (a = r || e.domElement) == null || a.removeEventListener(
        "keydown",
        s,
        !0
      );
    };
  }, [e.domElement, n, i, o, r, s]), y(() => {
    c(0);
  }, [t, c]), {
    selectedIndex: n.length === 0 ? void 0 : i
  };
}
function Vo(e) {
  const n = E().setContentEditableProps, o = v(), {
    getItems: r,
    suggestionMenuComponent: i,
    query: c,
    clearQuery: s,
    closeMenu: d,
    onItemClick: a
  } = e, u = k(
    (w) => {
      d(), s(), a == null || a(w);
    },
    [a, d, s]
  ), { items: g, usedQuery: m, loadingState: h } = ut(
    c,
    r
  );
  dt(g, m, d);
  const { selectedIndex: b } = So(
    o,
    c,
    g,
    u
  );
  return y(() => (n((w) => ({
    ...w,
    "aria-expanded": !0,
    "aria-controls": "bn-suggestion-menu"
  })), () => {
    n((w) => ({
      ...w,
      "aria-expanded": !1,
      "aria-controls": void 0
    }));
  }), [n]), y(() => (n((w) => ({
    ...w,
    "aria-activedescendant": b ? "bn-suggestion-menu-item-" + b : void 0
  })), () => {
    n((w) => ({
      ...w,
      "aria-activedescendant": void 0
    }));
  }), [n, b]), /* @__PURE__ */ l(
    i,
    {
      items: g,
      onItemClick: u,
      loadingState: h,
      selectedIndex: b
    }
  );
}
const xo = {
  heading: Ye,
  heading_2: Je,
  heading_3: Qe,
  numbered_list: nt,
  bullet_list: ot,
  check_list: tt,
  paragraph: be,
  table: Ln,
  image: rt,
  video: Tn,
  audio: lt,
  file: fe,
  emoji: Zn,
  code_block: Hn
};
function Lo(e) {
  return St(e).map((t) => {
    const n = xo[t.key];
    return {
      ...t,
      icon: /* @__PURE__ */ l(n, { size: 18 })
    };
  });
}
function Bo(e) {
  const t = v(), {
    triggerCharacter: n,
    suggestionMenuComponent: o,
    minQueryLength: r,
    onItemClick: i,
    getItems: c,
    floatingOptions: s
  } = e, d = H(() => i || ((x) => {
    x.onItemClick(t);
  }), [t, i]), a = H(() => c || (async (x) => Vt(
    Lo(t),
    x
  )), [t, c]), u = {
    closeMenu: t.suggestionMenus.closeMenu,
    clearQuery: t.suggestionMenus.clearQuery
  }, g = k(
    (x) => t.suggestionMenus.onUpdate(n, x),
    [t.suggestionMenus, n]
  ), m = P(g), { isMounted: h, ref: b, style: S, getFloatingProps: w } = Z(
    (m == null ? void 0 : m.show) || !1,
    (m == null ? void 0 : m.referencePos) || null,
    2e3,
    {
      placement: "bottom-start",
      middleware: [
        O(10),
        // Flips the menu placement to maximize the space available, and prevents
        // the menu from being cut off by the confines of the screen.
        F({
          mainAxis: !0,
          crossAxis: !1
        }),
        De(),
        ue({
          apply({ availableHeight: x, elements: L }) {
            Object.assign(L.floating.style, {
              maxHeight: `${x - 10}px`
            });
          }
        })
      ],
      onOpenChange(x) {
        x || t.suggestionMenus.closeMenu();
      },
      ...s
    }
  );
  return !h || !m || !(m != null && m.ignoreQueryLength) && r && (m.query.startsWith(" ") || m.query.length < r) ? null : /* @__PURE__ */ l("div", { ref: b, style: S, ...w(), children: /* @__PURE__ */ l(
    Vo,
    {
      query: m.query,
      closeMenu: u.closeMenu,
      clearQuery: u.clearQuery,
      getItems: a,
      suggestionMenuComponent: o || Ho,
      onItemClick: d
    }
  ) });
}
function To(e, t) {
  let n = 0;
  if (t === "columns")
    for (let r = e.rows[0].cells.length - 1; r >= 0 && e.rows.every((c) => c.cells[r].length === 0); r--)
      n++;
  const o = [];
  for (let r = e.rows.length - 1; r >= 0; r--)
    t === "rows" && o.length === 0 && e.rows[r].cells.every((i) => i.length === 0) || o.unshift({
      cells: e.rows[r].cells.slice(
        0,
        e.rows[0].cells.length - n
      )
    });
  return {
    ...e,
    rows: o
  };
}
const _o = (e, t = 0.3) => {
  const n = Math.floor(e) + t, o = Math.ceil(e) - t;
  return e >= n && e <= o ? Math.round(e) : e < n ? Math.floor(e) : Math.ceil(e);
}, Te = (e, t, n) => {
  const o = {
    cells: Array(n).fill([])
  }, r = [];
  for (let i = 0; i < t; i++)
    r.push(o);
  return {
    type: "tableContent",
    columnWidths: e.columnWidths,
    rows: [...e.rows, ...r]
  };
}, _e = (e, t) => {
  const n = [], o = [];
  for (let r = 0; r < t; r++)
    o.push(n);
  return {
    type: "tableContent",
    columnWidths: e.columnWidths ? [...e.columnWidths, ...o.map(() => {
    })] : void 0,
    rows: e.rows.map((r) => ({
      cells: [...r.cells, ...o]
    }))
  };
}, Eo = (e) => {
  const t = p(), n = I(!1), [o, r] = f(), i = k(
    (s) => {
      e.onMouseDown(), r({
        originalContent: e.block.content,
        originalCroppedContent: To(
          e.block.content,
          e.orientation === "addOrRemoveColumns" ? "columns" : "rows"
        ),
        startPos: e.orientation === "addOrRemoveColumns" ? s.clientX : s.clientY
      }), n.current = !1, s.preventDefault();
    },
    [e]
  ), c = k(() => {
    n.current || e.editor.updateBlock(e.block, {
      type: "table",
      content: e.orientation === "addOrRemoveColumns" ? _e(e.block.content, 1) : Te(
        e.block.content,
        1,
        e.block.content.rows[0].cells.length
      )
    });
  }, [e.block, e.orientation, e.editor]);
  return y(() => {
    const s = (d) => {
      var b, S;
      if (!o)
        throw new Error("editingState is undefined");
      n.current = !0;
      const a = (e.orientation === "addOrRemoveColumns" ? d.clientX : d.clientY) - o.startPos, u = e.orientation === "addOrRemoveColumns" ? ((b = o.originalCroppedContent.rows[0]) == null ? void 0 : b.cells.length) ?? 0 : o.originalCroppedContent.rows.length, g = e.orientation === "addOrRemoveColumns" ? ((S = o.originalContent.rows[0]) == null ? void 0 : S.cells.length) ?? 0 : o.originalContent.rows.length, m = e.orientation === "addOrRemoveColumns" ? e.block.content.rows[0].cells.length : e.block.content.rows.length, h = g + _o(
        a / (e.orientation === "addOrRemoveColumns" ? xt : Lt),
        0.3
      );
      h >= u && h > 0 && h !== m && (e.editor.updateBlock(e.block, {
        type: "table",
        content: e.orientation === "addOrRemoveColumns" ? _e(
          o.originalCroppedContent,
          h - u
        ) : Te(
          o.originalCroppedContent,
          h - u,
          o.originalContent.rows[0].cells.length
        )
      }), e.block.content && e.editor.setTextCursorPosition(e.block));
    };
    return o && window.addEventListener("mousemove", s), () => {
      window.removeEventListener("mousemove", s);
    };
  }, [o, e.block, e.editor, e.orientation]), y(() => {
    const s = e.onMouseUp, d = () => {
      r(void 0), s();
    };
    return o && window.addEventListener("mouseup", d), () => {
      window.removeEventListener("mouseup", d);
    };
  }, [o, e.onMouseUp]), /* @__PURE__ */ l(
    t.TableHandle.ExtendButton,
    {
      className: W(
        "bn-extend-button",
        e.orientation === "addOrRemoveColumns" ? "bn-extend-button-add-remove-columns" : "bn-extend-button-add-remove-rows",
        o !== null ? "bn-extend-button-editing" : ""
      ),
      onClick: c,
      onMouseDown: i,
      children: e.children || /* @__PURE__ */ l(Pn, { size: 18, "data-test": "extendButton" })
    }
  );
}, Ro = (e) => {
  const t = p(), n = V(), o = v();
  return /* @__PURE__ */ l(
    t.Generic.Menu.Item,
    {
      onClick: () => {
        const r = e.block.content.rows[e.index].cells.map(
          () => []
        ), i = [...e.block.content.rows];
        i.splice(e.index + (e.side === "below" ? 1 : 0), 0, {
          cells: r
        }), o.updateBlock(e.block, {
          type: "table",
          content: {
            type: "tableContent",
            columnWidths: e.block.content.columnWidths,
            rows: i
          }
        }), o.setTextCursorPosition(e.block);
      },
      children: n.table_handle[`add_${e.side}_menuitem`]
    }
  );
}, Po = (e) => {
  const t = p(), n = V(), o = v();
  return /* @__PURE__ */ l(
    t.Generic.Menu.Item,
    {
      onClick: () => {
        const r = [...e.block.content.columnWidths];
        r.splice(
          e.index + (e.side === "right" ? 1 : 0),
          0,
          void 0
        );
        const i = {
          type: "tableContent",
          columnWidths: r,
          rows: e.block.content.rows.map((c) => {
            const s = [...c.cells];
            return s.splice(e.index + (e.side === "right" ? 1 : 0), 0, []), { cells: s };
          })
        };
        o.updateBlock(e.block, {
          type: "table",
          content: i
        }), o.setTextCursorPosition(e.block);
      },
      children: n.table_handle[`add_${e.side}_menuitem`]
    }
  );
}, Ee = (e) => e.orientation === "row" ? /* @__PURE__ */ l(Ro, { ...e, side: e.side }) : /* @__PURE__ */ l(Po, { ...e, side: e.side }), No = (e) => {
  const t = p(), n = V(), o = v();
  return /* @__PURE__ */ l(
    t.Generic.Menu.Item,
    {
      onClick: () => {
        const r = {
          type: "tableContent",
          columnWidths: e.block.content.columnWidths,
          rows: e.block.content.rows.filter(
            (i, c) => c !== e.index
          )
        };
        o.updateBlock(e.block, {
          type: "table",
          content: r
        }), o.setTextCursorPosition(e.block);
      },
      children: n.table_handle.delete_row_menuitem
    }
  );
}, Io = (e) => {
  const t = p(), n = V(), o = v();
  return /* @__PURE__ */ l(
    t.Generic.Menu.Item,
    {
      onClick: () => {
        const r = {
          type: "tableContent",
          columnWidths: e.block.content.columnWidths.filter(
            (i, c) => c !== e.index
          ),
          rows: e.block.content.rows.map((i) => ({
            cells: i.cells.filter((c, s) => s !== e.index)
          }))
        };
        o.updateBlock(e.block, {
          type: "table",
          content: r
        }), o.setTextCursorPosition(e.block);
      },
      children: n.table_handle.delete_column_menuitem
    }
  );
}, Oo = (e) => e.orientation === "row" ? /* @__PURE__ */ l(No, { ...e }) : /* @__PURE__ */ l(Io, { ...e }), Zo = (e) => {
  const t = p();
  return /* @__PURE__ */ l(t.Generic.Menu.Dropdown, { className: "bn-table-handle-menu", children: e.children || /* @__PURE__ */ M(B, { children: [
    /* @__PURE__ */ l(
      Oo,
      {
        orientation: e.orientation,
        block: e.block,
        index: e.index
      }
    ),
    /* @__PURE__ */ l(
      Ee,
      {
        orientation: e.orientation,
        block: e.block,
        index: e.index,
        side: e.orientation === "row" ? "above" : "left"
      }
    ),
    /* @__PURE__ */ l(
      Ee,
      {
        orientation: e.orientation,
        block: e.block,
        index: e.index,
        side: e.orientation === "row" ? "below" : "right"
      }
    )
  ] }) });
}, Do = (e) => {
  const t = p(), [n, o] = f(!1), r = e.tableHandleMenu || Zo;
  return /* @__PURE__ */ M(
    t.Generic.Menu.Root,
    {
      onOpenChange: (i) => {
        i ? (e.freezeHandles(), e.hideOtherSide()) : (e.unfreezeHandles(), e.showOtherSide(), e.editor.focus());
      },
      position: "right",
      children: [
        /* @__PURE__ */ l(t.Generic.Menu.Trigger, { children: /* @__PURE__ */ l(
          t.TableHandle.Root,
          {
            className: W(
              "bn-table-handle",
              n ? "bn-table-handle-dragging" : ""
            ),
            draggable: !0,
            onDragStart: (i) => {
              o(!0), e.dragStart(i);
            },
            onDragEnd: () => {
              e.dragEnd(), o(!1);
            },
            style: e.orientation === "column" ? { transform: "rotate(0.25turn)" } : void 0,
            children: e.children || /* @__PURE__ */ l(st, { size: 24, "data-test": "tableHandle" })
          }
        ) }),
        ge(
          /* @__PURE__ */ l(
            r,
            {
              orientation: e.orientation,
              block: e.block,
              index: e.index
            }
          ),
          e.menuContainer
        )
      ]
    }
  );
};
function Re(e, t, n) {
  const { refs: o, update: r, context: i, floatingStyles: c } = se({
    open: t,
    placement: e === "addOrRemoveColumns" ? "right" : "bottom",
    middleware: [
      ue({
        apply({ rects: a, elements: u }) {
          Object.assign(
            u.floating.style,
            e === "addOrRemoveColumns" ? {
              height: `${a.reference.height}px`
            } : {
              width: `${a.reference.width}px`
            }
          );
        }
      })
    ]
  }), { isMounted: s, styles: d } = de(i);
  return y(() => {
    r();
  }, [n, r]), y(() => {
    n !== null && o.setReference({
      getBoundingClientRect: () => n
    });
  }, [e, n, o]), H(
    () => ({
      isMounted: s,
      ref: o.setFloating,
      style: {
        display: "flex",
        ...d,
        ...c
      }
    }),
    [c, s, o.setFloating, d]
  );
}
function Ao(e, t, n) {
  const o = Re(
    "addOrRemoveRows",
    t,
    n
  ), r = Re(
    "addOrRemoveColumns",
    e,
    n
  );
  return H(
    () => ({
      addOrRemoveRowsButton: o,
      addOrRemoveColumnsButton: r
    }),
    [r, o]
  );
}
function Fo(e, t, n) {
  return n && n.draggedCellOrientation === "row" ? new DOMRect(
    t.x,
    n.mousePos,
    t.width,
    0
  ) : new DOMRect(
    t.x,
    e.y,
    t.width,
    e.height
  );
}
function Uo(e, t, n) {
  return n && n.draggedCellOrientation === "col" ? new DOMRect(
    n.mousePos,
    t.y,
    0,
    t.height
  ) : new DOMRect(
    e.x,
    t.y,
    e.width,
    t.height
  );
}
function Pe(e, t, n, o, r) {
  const { refs: i, update: c, context: s, floatingStyles: d } = se({
    open: t,
    placement: e === "row" ? "left" : "top",
    middleware: [O(e === "row" ? -10 : -12)]
  }), { isMounted: a, styles: u } = de(s);
  return y(() => {
    c();
  }, [n, o, c]), y(() => {
    n === null || o === null || i.setReference({
      getBoundingClientRect: () => (e === "row" ? Fo : Uo)(n, o, r)
    });
  }, [r, e, n, o, i]), H(
    () => ({
      isMounted: a,
      ref: i.setFloating,
      style: {
        display: "flex",
        ...u,
        ...d
      }
    }),
    [d, a, i.setFloating, u]
  );
}
function zo(e, t, n, o) {
  const r = Pe(
    "row",
    e,
    t,
    n,
    o
  ), i = Pe(
    "col",
    e,
    t,
    n,
    o
  );
  return H(
    () => ({
      rowHandle: r,
      colHandle: i
    }),
    [i, r]
  );
}
const Wo = (e) => {
  var j, D;
  const t = v(), [n, o] = f(null);
  if (!t.tableHandles)
    throw new Error(
      "TableHandlesController can only be used when BlockNote editor schema contains table block"
    );
  const r = {
    rowDragStart: t.tableHandles.rowDragStart,
    colDragStart: t.tableHandles.colDragStart,
    dragEnd: t.tableHandles.dragEnd,
    freezeHandles: t.tableHandles.freezeHandles,
    unfreezeHandles: t.tableHandles.unfreezeHandles
  }, { freezeHandles: i, unfreezeHandles: c } = r, s = k(() => {
    i(), L(!0), w(!0);
  }, [i]), d = k(() => {
    c(), L(!1), w(!1);
  }, [c]), a = P(
    t.tableHandles.onUpdate.bind(t.tableHandles)
  ), u = H(() => {
    var $, q;
    return a != null && a.draggingState ? {
      draggedCellOrientation: ($ = a == null ? void 0 : a.draggingState) == null ? void 0 : $.draggedCellOrientation,
      mousePos: (q = a == null ? void 0 : a.draggingState) == null ? void 0 : q.mousePos
    } : void 0;
  }, [
    a == null ? void 0 : a.draggingState,
    (j = a == null ? void 0 : a.draggingState) == null ? void 0 : j.draggedCellOrientation,
    (D = a == null ? void 0 : a.draggingState) == null ? void 0 : D.mousePos
  ]), { rowHandle: g, colHandle: m } = zo(
    (a == null ? void 0 : a.show) || !1,
    (a == null ? void 0 : a.referencePosCell) || null,
    (a == null ? void 0 : a.referencePosTable) || null,
    u
  ), { addOrRemoveColumnsButton: h, addOrRemoveRowsButton: b } = Ao(
    (a == null ? void 0 : a.showAddOrRemoveColumnsButton) || !1,
    (a == null ? void 0 : a.showAddOrRemoveRowsButton) || !1,
    (a == null ? void 0 : a.referencePosTable) || null
  ), [S, w] = f(!1), [x, L] = f(!1);
  if (!a)
    return null;
  const _ = e.tableHandle || Do, G = e.extendButton || Eo;
  return /* @__PURE__ */ M(B, { children: [
    /* @__PURE__ */ l("div", { ref: o }),
    /* @__PURE__ */ M(vt, { root: a.widgetContainer, children: [
      !S && n && g.isMounted && a.rowIndex !== void 0 && /* @__PURE__ */ l("div", { ref: g.ref, style: g.style, children: /* @__PURE__ */ l(
        _,
        {
          editor: t,
          orientation: "row",
          showOtherSide: () => L(!1),
          hideOtherSide: () => L(!0),
          index: a.rowIndex,
          block: a.block,
          dragStart: r.rowDragStart,
          dragEnd: r.dragEnd,
          freezeHandles: r.freezeHandles,
          unfreezeHandles: r.unfreezeHandles,
          menuContainer: n
        }
      ) }),
      !x && n && m.isMounted && a.colIndex !== void 0 && /* @__PURE__ */ l("div", { ref: m.ref, style: m.style, children: /* @__PURE__ */ l(
        _,
        {
          editor: t,
          orientation: "column",
          showOtherSide: () => w(!1),
          hideOtherSide: () => w(!0),
          index: a.colIndex,
          block: a.block,
          dragStart: r.colDragStart,
          dragEnd: r.dragEnd,
          freezeHandles: r.freezeHandles,
          unfreezeHandles: r.unfreezeHandles,
          menuContainer: n
        }
      ) }),
      /* @__PURE__ */ l(
        "div",
        {
          ref: b.ref,
          style: b.style,
          children: /* @__PURE__ */ l(
            G,
            {
              editor: t,
              orientation: "addOrRemoveRows",
              block: a.block,
              onMouseDown: s,
              onMouseUp: d
            }
          )
        }
      ),
      /* @__PURE__ */ l(
        "div",
        {
          ref: h.ref,
          style: h.style,
          children: /* @__PURE__ */ l(
            G,
            {
              editor: t,
              orientation: "addOrRemoveColumns",
              block: a.block,
              onMouseDown: s,
              onMouseUp: d
            }
          )
        }
      )
    ] })
  ] });
};
function Go(e) {
  const t = v();
  if (!t)
    throw new Error(
      "BlockNoteDefaultUI must be used within a BlockNoteContext.Provider"
    );
  return /* @__PURE__ */ M(B, { children: [
    e.formattingToolbar !== !1 && /* @__PURE__ */ l(no, {}),
    e.linkToolbar !== !1 && /* @__PURE__ */ l(co, {}),
    e.slashMenu !== !1 && /* @__PURE__ */ l(Bo, { triggerCharacter: "/" }),
    e.emojiPicker !== !1 && /* @__PURE__ */ l(
      wo,
      {
        triggerCharacter: ":",
        columns: 10,
        minQueryLength: 2
      }
    ),
    e.sideMenu !== !1 && /* @__PURE__ */ l(bo, {}),
    t.filePanel && e.filePanel !== !1 && /* @__PURE__ */ l(cn, {}),
    t.tableHandles && e.tableHandles !== !1 && /* @__PURE__ */ l(Wo, {})
  ] });
}
const jo = () => {
  const e = H(
    () => {
      var c;
      return (c = window.matchMedia) == null ? void 0 : c.call(window, "(prefers-color-scheme: dark)");
    },
    []
  ), t = H(
    () => {
      var c;
      return (c = window.matchMedia) == null ? void 0 : c.call(window, "(prefers-color-scheme: light)");
    },
    []
  ), n = e == null ? void 0 : e.matches, o = t == null ? void 0 : t.matches, [r, i] = f(n ? "dark" : o ? "light" : "no-preference");
  return y(() => {
    i(n ? "dark" : o ? "light" : "no-preference");
  }, [n, o]), y(() => {
    if (typeof (e == null ? void 0 : e.addEventListener) == "function") {
      const c = ({ matches: d }) => d && i("dark"), s = ({ matches: d }) => d && i("light");
      return e == null || e.addEventListener("change", c), t == null || t.addEventListener("change", s), () => {
        e == null || e.removeEventListener("change", c), t == null || t.removeEventListener("change", s);
      };
    } else {
      const c = () => i(
        e.matches ? "dark" : t.matches ? "light" : "no-preference"
      );
      return e == null || e.addEventListener("change", c), t == null || t.addEventListener("change", c), () => {
        e == null || e.removeEventListener("change", c), t == null || t.removeEventListener("change", c);
      };
    }
  }, [e, t]), typeof window.matchMedia != "function", r;
}, $o = ({
  renderers: e
}) => /* @__PURE__ */ l(B, { children: Object.entries(e).map(([t, n]) => ge(n.reactElement, n.element, t)) });
function qo(e) {
  const [t, n] = f({});
  return y(() => (e.editor._tiptapEditor.contentComponent = {
    /**
     * Used by TipTap
     */
    setRenderer(o, r) {
      n((i) => ({ ...i, [o]: r }));
    },
    /**
     * Used by TipTap
     */
    removeRenderer(o) {
      n((r) => {
        const i = { ...r };
        return delete i[o], i;
      });
    }
  }, queueMicrotask(() => {
    e.editor._tiptapEditor.createNodeViews();
  }), () => {
    e.editor._tiptapEditor.contentComponent = null;
  }), [e.editor._tiptapEditor]), /* @__PURE__ */ M(B, { children: [
    /* @__PURE__ */ l($o, { renderers: t }),
    e.children
  ] });
}
const Ko = bt((e, t) => {
  const [n, o] = f();
  return Ct(
    t,
    () => (r, i) => {
      ze(() => {
        o({ node: r, container: i });
      }), o(void 0);
    },
    []
  ), /* @__PURE__ */ l(B, { children: n && ge(n.node, n.container) });
}), Ne = () => {
};
function Xo(e, t) {
  const {
    editor: n,
    className: o,
    theme: r,
    children: i,
    editable: c,
    onSelectionChange: s,
    onChange: d,
    formattingToolbar: a,
    linkToolbar: u,
    slashMenu: g,
    emojiPicker: m,
    sideMenu: h,
    filePanel: b,
    tableHandles: S,
    ...w
  } = e, [x, L] = f(), _ = E(), G = jo(), j = (_ == null ? void 0 : _.colorSchemePreference) || G, D = r || (j === "dark" ? "dark" : "light");
  me(d || Ne, n), he(s || Ne, n), y(() => {
    n.isEditable = c !== !1;
  }, [c, n]);
  const $ = H(() => /* @__PURE__ */ M(B, { children: [
    i,
    /* @__PURE__ */ l(
      Go,
      {
        formattingToolbar: a,
        linkToolbar: u,
        slashMenu: g,
        emojiPicker: m,
        sideMenu: h,
        filePanel: b,
        tableHandles: S
      }
    )
  ] }), [
    i,
    a,
    u,
    g,
    m,
    h,
    b,
    S
  ]), q = H(() => ({
    ..._,
    editor: n,
    setContentEditableProps: L
  }), [_, n]), ht = k(
    (ft) => {
      n.elementRenderer = ft;
    },
    [n]
  );
  return /* @__PURE__ */ M($e.Provider, { value: q, children: [
    /* @__PURE__ */ l(Ko, { ref: ht }),
    !n.headless && /* @__PURE__ */ l(qo, { editor: n, children: /* @__PURE__ */ M(
      "div",
      {
        className: W(
          "bn-container",
          D || "",
          o || ""
        ),
        "data-color-scheme": D,
        ...w,
        ref: t,
        children: [
          /* @__PURE__ */ l(
            "div",
            {
              "aria-autocomplete": "list",
              "aria-haspopup": "listbox",
              ref: n.mount,
              ...x
            }
          ),
          $
        ]
      }
    ) })
  ] });
}
const Mr = R.forwardRef(Xo);
var ae, X = en;
if (process.env.NODE_ENV === "production")
  ae = X.createRoot, X.hydrateRoot;
else {
  var Ie = X.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
  ae = function(e, t) {
    Ie.usingClientEntryPoint = !0;
    try {
      return X.createRoot(e, t);
    } finally {
      Ie.usingClientEntryPoint = !1;
    }
  };
}
function Q(e, t) {
  let n;
  const o = document.createElement("div");
  let r;
  if (t != null && t.elementRenderer ? t.elementRenderer(
    e((d) => n = d || void 0),
    o
  ) : (r = ae(o), ze(() => {
    r.render(e((d) => n = d || void 0));
  })), !o.childElementCount)
    return console.warn("ReactInlineContentSpec: renderHTML() failed"), {
      dom: document.createElement("span")
    };
  n == null || n.setAttribute("data-tmp-find", "true");
  const i = o.cloneNode(!0), c = i.firstElementChild, s = i.querySelector(
    "[data-tmp-find]"
  );
  return s == null || s.removeAttribute("data-tmp-find"), r == null || r.unmount(), {
    dom: c,
    contentDOM: s || void 0
  };
}
function re(e) {
  var t;
  return (
    // Creates `blockContent` element
    /* @__PURE__ */ l(
      We,
      {
        ...Object.fromEntries(
          Object.entries(e.domAttributes || {}).filter(
            ([n]) => n !== "class"
          )
        ),
        className: W(
          "bn-block-content",
          ((t = e.domAttributes) == null ? void 0 : t.class) || ""
        ),
        "data-content-type": e.blockType,
        ...Object.fromEntries(
          Object.entries(e.blockProps).filter(([n, o]) => {
            const r = e.propSchema[n];
            return !Bt.includes(n) && o !== r.default;
          }).map(([n, o]) => [Ae(n), o])
        ),
        "data-file-block": e.isFileBlock === !0 || void 0,
        children: e.children
      }
    )
  );
}
function te(e, t) {
  const n = Fe({
    name: e.type,
    content: e.content === "inline" ? "inline*" : "",
    group: "blockContent",
    selectable: e.isSelectable ?? !0,
    isolating: !0,
    addAttributes() {
      return Ue(e.propSchema);
    },
    parseHTML() {
      return Tt(e, t.parse);
    },
    renderHTML({ HTMLAttributes: o }) {
      const r = document.createElement("div");
      return _t(
        {
          dom: r,
          contentDOM: e.content === "inline" ? r : void 0
        },
        e.type,
        {},
        e.propSchema,
        e.isFileBlock,
        o
      );
    },
    addNodeView() {
      return (o) => {
        const r = Ge(
          (i) => {
            var g;
            const c = this.options.editor, s = Et(
              i.getPos,
              c,
              this.editor,
              e.type
            ), d = ((g = this.options.domAttributes) == null ? void 0 : g.blockContent) || {}, a = je().nodeViewContentRef;
            if (!a)
              throw new Error("nodeViewContentRef is not set");
            const u = t.render;
            return /* @__PURE__ */ l(
              re,
              {
                blockType: s.type,
                blockProps: s.props,
                propSchema: e.propSchema,
                isFileBlock: e.isFileBlock,
                domAttributes: d,
                children: /* @__PURE__ */ l(
                  u,
                  {
                    block: s,
                    editor: c,
                    contentRef: a
                  }
                )
              }
            );
          },
          {
            className: "bn-react-node-view-renderer"
          }
        )(o);
        return e.isSelectable === !1 && Rt(r, this.editor), r;
      };
    }
  });
  return Pt(e, {
    node: n,
    toInternalHTML: (o, r) => {
      var d, a;
      const i = ((d = n.options.domAttributes) == null ? void 0 : d.blockContent) || {}, c = t.render, s = Q(
        (u) => /* @__PURE__ */ l(
          re,
          {
            blockType: o.type,
            blockProps: o.props,
            propSchema: e.propSchema,
            domAttributes: i,
            children: /* @__PURE__ */ l(
              c,
              {
                block: o,
                editor: r,
                contentRef: u
              }
            )
          }
        ),
        r
      );
      return (a = s.contentDOM) == null || a.setAttribute("data-editable", ""), s;
    },
    toExternalHTML: (o, r) => {
      var d, a;
      const i = ((d = n.options.domAttributes) == null ? void 0 : d.blockContent) || {}, c = t.toExternalHTML || t.render, s = Q((u) => /* @__PURE__ */ l(
        re,
        {
          blockType: o.type,
          blockProps: o.props,
          propSchema: e.propSchema,
          domAttributes: i,
          children: /* @__PURE__ */ l(
            c,
            {
              block: o,
              editor: r,
              contentRef: u
            }
          )
        }
      ), r);
      return (a = s.contentDOM) == null || a.setAttribute("data-editable", ""), s;
    }
  });
}
function Ce(e) {
  const t = v(), [n, o] = f("loading"), [r, i] = f();
  if (y(() => {
    let c = !0;
    return (async () => {
      let s = "";
      o("loading");
      try {
        s = t.resolveFileUrl ? await t.resolveFileUrl(e) : e;
      } catch {
        o("error");
        return;
      }
      c && (o("loaded"), i(s));
    })(), () => {
      c = !1;
    };
  }, [t, e]), n !== "loaded")
    return {
      loadingState: n
    };
  if (!r)
    throw new Error("Finished fetching file but did not get download URL.");
  return {
    loadingState: n,
    downloadUrl: r
  };
}
const pe = (e) => /* @__PURE__ */ M("figure", { children: [
  e.children,
  /* @__PURE__ */ l("figcaption", { children: e.caption })
] });
function Yo(e) {
  const t = v();
  y(() => t.onUploadEnd(e), [e, t]);
}
function Jo(e) {
  const t = v();
  y(() => t.onUploadStart(e), [e, t]);
}
function gt(e) {
  const [t, n] = f(!1);
  return Jo((o) => {
    o === e && n(!0);
  }), Yo((o) => {
    o === e && n(!1);
  }), t;
}
const Qo = (e) => {
  const t = V(), n = k(
    (r) => {
      r.preventDefault();
    },
    []
  ), o = k(() => {
    e.editor.dispatch(
      e.editor._tiptapEditor.state.tr.setMeta(
        e.editor.filePanel.plugin,
        {
          block: e.block
        }
      )
    );
  }, [e.block, e.editor]);
  return /* @__PURE__ */ M(
    "div",
    {
      className: "bn-add-file-button",
      onMouseDown: n,
      onClick: o,
      children: [
        /* @__PURE__ */ l("div", { className: "bn-add-file-button-icon", children: e.buttonIcon || /* @__PURE__ */ l(fe, { size: 24 }) }),
        /* @__PURE__ */ l("div", { className: "bn-add-file-button-text", children: e.buttonText || t.file_blocks.file.add_button_text })
      ]
    }
  );
}, er = (e) => /* @__PURE__ */ M(
  "div",
  {
    className: "bn-file-name-with-icon",
    contentEditable: !1,
    draggable: !1,
    children: [
      /* @__PURE__ */ l("div", { className: "bn-file-icon", children: /* @__PURE__ */ l(fe, { size: 24 }) }),
      /* @__PURE__ */ l("p", { className: "bn-file-name", children: e.block.props.name })
    ]
  }
), ke = (e) => {
  const t = gt(e.block.id);
  return /* @__PURE__ */ l(
    "div",
    {
      className: "bn-file-block-content-wrapper",
      onMouseEnter: e.onMouseEnter,
      onMouseLeave: e.onMouseLeave,
      style: e.style,
      children: t ? (
        // Show loader while a file is being uploaded.
        /* @__PURE__ */ l("div", { className: "bn-file-loading-preview", children: "Loading..." })
      ) : e.block.props.url === "" ? (
        // Show the add file button if the file has not been uploaded yet.
        /* @__PURE__ */ l(Qo, { ...e })
      ) : (
        // Show the file preview, or the file name and icon.
        /* @__PURE__ */ M(B, { children: [
          e.block.props.showPreview === !1 || !e.children ? (
            // Show file name and icon.
            /* @__PURE__ */ l(er, { ...e })
          ) : (
            // Show preview.
            e.children
          ),
          e.block.props.caption && // Show the caption if there is one.
          /* @__PURE__ */ l("p", { className: "bn-file-caption", children: e.block.props.caption })
        ] })
      )
    }
  );
}, ne = (e) => /* @__PURE__ */ M("div", { children: [
  e.children,
  /* @__PURE__ */ l("p", { children: e.caption })
] }), tr = (e) => {
  const t = Ce(e.block.props.url);
  return /* @__PURE__ */ l(
    "audio",
    {
      className: "bn-audio",
      src: t.loadingState === "loading" ? e.block.props.url : t.downloadUrl,
      controls: !0,
      contentEditable: !1,
      draggable: !1
    }
  );
}, nr = (e) => {
  if (!e.block.props.url)
    return /* @__PURE__ */ l("p", { children: "Add audio" });
  const t = e.block.props.showPreview ? /* @__PURE__ */ l("audio", { src: e.block.props.url }) : /* @__PURE__ */ l("a", { href: e.block.props.url, children: e.block.props.name || e.block.props.url });
  return e.block.props.caption ? e.block.props.showPreview ? /* @__PURE__ */ l(pe, { caption: e.block.props.caption, children: t }) : /* @__PURE__ */ l(ne, { caption: e.block.props.caption, children: t }) : t;
}, or = (e) => /* @__PURE__ */ l(
  ke,
  {
    ...e,
    buttonText: e.editor.dictionary.file_blocks.audio.add_button_text,
    buttonIcon: /* @__PURE__ */ l(lt, { size: 24 }),
    children: /* @__PURE__ */ l(tr, { ...e })
  }
), yr = te(It, {
  render: or,
  parse: Nt,
  toExternalHTML: nr
}), rr = (e) => {
  if (!e.block.props.url)
    return /* @__PURE__ */ l("p", { children: "Add file" });
  const t = /* @__PURE__ */ l("a", { href: e.block.props.url, children: e.block.props.name || e.block.props.url });
  return e.block.props.caption ? /* @__PURE__ */ l(ne, { caption: e.block.props.caption, children: t }) : t;
}, lr = (e) => /* @__PURE__ */ l(ke, { ...e }), Sr = te(Zt, {
  render: lr,
  parse: Ot,
  toExternalHTML: rr
}), mt = (e) => {
  const [t, n] = f(void 0), [o, r] = f(e.block.props.previewWidth), [i, c] = f(!1), s = I(null);
  y(() => {
    const h = (S) => {
      let w;
      e.block.props.textAlignment === "center" ? t.handleUsed === "left" ? w = t.initialWidth + (t.initialClientX - S.clientX) * 2 : w = t.initialWidth + (S.clientX - t.initialClientX) * 2 : t.handleUsed === "left" ? w = t.initialWidth + t.initialClientX - S.clientX : w = t.initialWidth + S.clientX - t.initialClientX;
      const x = 64;
      w < x ? r(x) : r(w);
    }, b = () => {
      n(void 0), e.editor.updateBlock(e.block, {
        props: {
          previewWidth: o
        }
      });
    };
    return t && (window.addEventListener("mousemove", h), window.addEventListener("mouseup", b)), () => {
      window.removeEventListener("mousemove", h), window.removeEventListener("mouseup", b);
    };
  }, [e, t, o]);
  const d = k(() => {
    e.editor.isEditable && c(!0);
  }, [e.editor.isEditable]), a = k(() => {
    c(!1);
  }, []), u = k(
    (h) => {
      h.preventDefault(), n({
        handleUsed: "left",
        initialWidth: s.current.clientWidth,
        initialClientX: h.clientX
      });
    },
    []
  ), g = k(
    (h) => {
      h.preventDefault(), n({
        handleUsed: "right",
        initialWidth: s.current.clientWidth,
        initialClientX: h.clientX
      });
    },
    []
  ), m = gt(e.block.id);
  return /* @__PURE__ */ l(
    ke,
    {
      ...e,
      onMouseEnter: d,
      onMouseLeave: a,
      style: e.block.props.url && !m && e.block.props.showPreview ? { width: `${o}px` } : void 0,
      children: /* @__PURE__ */ M("div", { className: "bn-visual-media-wrapper", ref: s, children: [
        e.children,
        (i || t) && /* @__PURE__ */ M(B, { children: [
          /* @__PURE__ */ l(
            "div",
            {
              className: "bn-resize-handle",
              style: { left: "4px" },
              onMouseDown: u
            }
          ),
          /* @__PURE__ */ l(
            "div",
            {
              className: "bn-resize-handle",
              style: { right: "4px" },
              onMouseDown: g
            }
          )
        ] })
      ] })
    }
  );
}, ir = (e) => {
  const t = Ce(e.block.props.url);
  return /* @__PURE__ */ l(
    "img",
    {
      className: "bn-visual-media",
      src: t.loadingState === "loading" ? e.block.props.url : t.downloadUrl,
      alt: e.block.props.caption || "BlockNote image",
      contentEditable: !1,
      draggable: !1
    }
  );
}, cr = (e) => {
  if (!e.block.props.url)
    return /* @__PURE__ */ l("p", { children: "Add image" });
  const t = e.block.props.showPreview ? /* @__PURE__ */ l(
    "img",
    {
      src: e.block.props.url,
      alt: e.block.props.name || e.block.props.caption || "BlockNote image",
      width: e.block.props.previewWidth
    }
  ) : /* @__PURE__ */ l("a", { href: e.block.props.url, children: e.block.props.name || e.block.props.url });
  return e.block.props.caption ? e.block.props.showPreview ? /* @__PURE__ */ l(pe, { caption: e.block.props.caption, children: t }) : /* @__PURE__ */ l(ne, { caption: e.block.props.caption, children: t }) : t;
}, ar = (e) => /* @__PURE__ */ l(
  mt,
  {
    ...e,
    buttonText: e.editor.dictionary.file_blocks.image.add_button_text,
    buttonIcon: /* @__PURE__ */ l(rt, { size: 24 }),
    children: /* @__PURE__ */ l(ir, { ...e })
  }
), Vr = te(At, {
  render: ar,
  parse: Dt,
  toExternalHTML: cr
});
function sr(e) {
  return C({ tag: "svg", attr: { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, child: [{ tag: "path", attr: { d: "M14 3v4a1 1 0 0 0 1 1h4" }, child: [] }, { tag: "path", attr: { d: "M19 18v1a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-1" }, child: [] }, { tag: "path", attr: { d: "M3 14h3m4.5 0h3m4.5 0h3" }, child: [] }, { tag: "path", attr: { d: "M5 10v-5a2 2 0 0 1 2 -2h7l5 5v2" }, child: [] }] })(e);
}
const dr = {
  page_break: sr
};
function xr(e) {
  return Ft(e).map((t) => {
    const n = dr[t.key];
    return {
      ...t,
      icon: /* @__PURE__ */ l(n, { size: 18 })
    };
  });
}
const ur = (e) => {
  const t = Ce(e.block.props.url);
  return /* @__PURE__ */ l(
    "video",
    {
      className: "bn-visual-media",
      src: t.loadingState === "loading" ? e.block.props.url : t.downloadUrl,
      controls: !0,
      contentEditable: !1,
      draggable: !1
    }
  );
}, gr = (e) => {
  if (!e.block.props.url)
    return /* @__PURE__ */ l("p", { children: "Add video" });
  const t = e.block.props.showPreview ? /* @__PURE__ */ l("video", { src: e.block.props.url }) : /* @__PURE__ */ l("a", { href: e.block.props.url, children: e.block.props.name || e.block.props.url });
  return e.block.props.caption ? e.block.props.showPreview ? /* @__PURE__ */ l(pe, { caption: e.block.props.caption, children: t }) : /* @__PURE__ */ l(ne, { caption: e.block.props.caption, children: t }) : t;
}, mr = (e) => /* @__PURE__ */ l(
  mt,
  {
    ...e,
    buttonText: e.editor.dictionary.file_blocks.video.add_button_text,
    buttonIcon: /* @__PURE__ */ l(Rn, { size: 24 }),
    children: /* @__PURE__ */ l(ur, { ...e })
  }
), Lr = te(zt, {
  render: mr,
  parse: Ut,
  toExternalHTML: gr
}), Br = (e) => {
  const [t, n] = f("none"), o = I(null), r = v(), i = P(
    r.formattingToolbar.onUpdate.bind(r.formattingToolbar)
  ), c = H(() => ({
    display: "flex",
    position: "fixed",
    bottom: 0,
    zIndex: 3e3,
    transform: t
  }), [t]);
  if (y(() => {
    const d = window.visualViewport;
    function a() {
      const u = document.body, g = d.offsetLeft, m = d.height - u.getBoundingClientRect().height + d.offsetTop;
      n(
        `translate(${g}px, ${m}px) scale(${1 / d.scale})`
      );
    }
    return window.visualViewport.addEventListener("scroll", a), window.visualViewport.addEventListener("resize", a), a(), () => {
      window.visualViewport.removeEventListener("scroll", a), window.visualViewport.removeEventListener("resize", a);
    };
  }, []), !i)
    return null;
  if (!i.show && o.current)
    return /* @__PURE__ */ l(
      "div",
      {
        ref: o,
        style: c,
        dangerouslySetInnerHTML: { __html: o.current.innerHTML }
      }
    );
  const s = e.formattingToolbar || at;
  return /* @__PURE__ */ l("div", { ref: o, style: c, children: /* @__PURE__ */ l(s, {}) });
};
function Tr(e) {
  const t = E();
  if (e || (e = t == null ? void 0 : t.editor), !e)
    throw new Error(
      "'editor' is required, either from BlockNoteContext or as a function argument"
    );
  const n = e, [o, r] = f(() => n.getActiveStyles());
  return me(() => {
    r(n.getActiveStyles());
  }, n), he(() => {
    r(n.getActiveStyles());
  }, n), o;
}
const hr = (e = {}, t = []) => H(() => {
  const n = Wt.create(e);
  return window && (window.ProseMirror = n._tiptapEditor), n;
}, t), _r = hr;
function fr() {
  const [, e] = f(0);
  return () => e((t) => t + 1);
}
const Er = (e) => {
  const t = fr();
  y(() => {
    const n = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          t();
        });
      });
    };
    return e.on("transaction", n), () => {
      e.off("transaction", n);
    };
  }, [e]);
};
function br(e) {
  return (
    // Creates inline content section element
    /* @__PURE__ */ l(
      We,
      {
        as: "span",
        className: "bn-inline-content-section",
        "data-inline-content-type": e.inlineContentType,
        ...Object.fromEntries(
          Object.entries(e.inlineContentProps).filter(([t, n]) => {
            const o = e.propSchema[t];
            return n !== o.default;
          }).map(([t, n]) => [Ae(t), n])
        ),
        children: e.children
      }
    )
  );
}
function Rr(e, t) {
  const n = Fe({
    name: e.type,
    inline: !0,
    group: "inline",
    selectable: e.content === "styled",
    atom: e.content === "none",
    content: e.content === "styled" ? "inline*" : "",
    addAttributes() {
      return Ue(e.propSchema);
    },
    addKeyboardShortcuts() {
      return Gt(e);
    },
    parseHTML() {
      return jt(e);
    },
    renderHTML({ node: o }) {
      const r = this.options.editor, i = we(
        o,
        r.schema.inlineContentSchema,
        r.schema.styleSchema
      ), c = t.render, s = Q(
        (d) => /* @__PURE__ */ l(
          c,
          {
            inlineContent: i,
            updateInlineContent: () => {
            },
            contentRef: d
          }
        ),
        r
      );
      return $t(
        s,
        e.type,
        o.attrs,
        e.propSchema
      );
    },
    // TODO: needed?
    addNodeView() {
      const o = this.options.editor;
      return (r) => Ge(
        (i) => {
          const c = je().nodeViewContentRef;
          if (!c)
            throw new Error("nodeViewContentRef is not set");
          const s = t.render;
          return /* @__PURE__ */ l(
            br,
            {
              inlineContentProps: i.node.attrs,
              inlineContentType: e.type,
              propSchema: e.propSchema,
              children: /* @__PURE__ */ l(
                s,
                {
                  contentRef: c,
                  inlineContent: we(
                    i.node,
                    o.schema.inlineContentSchema,
                    o.schema.styleSchema
                  ),
                  updateInlineContent: (d) => {
                    const a = qt(
                      [d],
                      o._tiptapEditor.schema,
                      o.schema.styleSchema
                    );
                    o.dispatch(
                      o.prosemirrorView.state.tr.replaceWith(
                        i.getPos(),
                        i.getPos() + i.node.nodeSize,
                        a
                      )
                    );
                  }
                }
              )
            }
          );
        },
        {
          className: "bn-ic-react-node-view-renderer",
          as: "span"
          // contentDOMElementTag: "span", (requires tt upgrade)
        }
      )(r);
    }
  });
  return Kt(e, {
    node: n
  });
}
function Pr(e, t) {
  const n = tn.create({
    name: e.type,
    addAttributes() {
      return Xt(e.propSchema);
    },
    parseHTML() {
      return Yt(e);
    },
    renderHTML({ mark: o }) {
      const r = {};
      e.propSchema === "string" && (r.value = o.attrs.stringValue);
      const i = t.render, c = Q(
        (s) => /* @__PURE__ */ l(i, { ...r, contentRef: s }),
        void 0
      );
      return Jt(
        c,
        e.type,
        o.attrs.stringValue,
        e.propSchema
      );
    }
  });
  return Qt(e, {
    mark: n
  });
}
function Nr(e, t) {
  const n = e.getBoundingClientRect(), o = t.getBoundingClientRect(), r = n.top < o.top, i = n.bottom > o.bottom;
  return r && i ? "both" : r ? "top" : i ? "bottom" : "none";
}
export {
  so as AddBlockButton,
  Ee as AddButton,
  Po as AddColumnButton,
  Qo as AddFileButton,
  Ro as AddRowButton,
  or as AudioBlock,
  tr as AudioPreview,
  nr as AudioToExternalHTML,
  K as BasicTextStyleButton,
  uo as BlockColorsItem,
  re as BlockContentWrapper,
  $e as BlockNoteContext,
  Go as BlockNoteDefaultUI,
  Mr as BlockNoteViewRaw,
  Yn as BlockTypeSelect,
  Fn as ColorStyleButton,
  on as ComponentsContext,
  zn as CreateLinkButton,
  Oo as DeleteButton,
  Io as DeleteColumnButton,
  oo as DeleteLinkButton,
  No as DeleteRowButton,
  ho as DragHandleButton,
  mo as DragHandleMenu,
  ro as EditLinkButton,
  ct as EditLinkMenuItems,
  rn as EmbedTab,
  Br as ExperimentalMobileFormattingToolbarController,
  Eo as ExtendButton,
  pe as FigureWithCaption,
  lr as FileBlock,
  ke as FileBlockWrapper,
  Wn as FileCaptionButton,
  Gn as FileDeleteButton,
  Jn as FileDownloadButton,
  er as FileNameWithIcon,
  qe as FilePanel,
  cn as FilePanelController,
  Qn as FilePreviewButton,
  jn as FileRenameButton,
  $n as FileReplaceButton,
  rr as FileToExternalHTML,
  at as FormattingToolbar,
  no as FormattingToolbarController,
  wo as GridSuggestionMenuController,
  vo as GridSuggestionMenuWrapper,
  ar as ImageBlock,
  ir as ImagePreview,
  cr as ImageToExternalHTML,
  br as InlineContentWrapper,
  io as LinkToolbar,
  co as LinkToolbarController,
  ne as LinkWithCaption,
  qn as NestBlockButton,
  lo as OpenLinkButton,
  yr as ReactAudioBlock,
  Sr as ReactFileBlock,
  Vr as ReactImageBlock,
  Lr as ReactVideoBlock,
  go as RemoveBlockItem,
  mt as ResizableFileBlockWrapper,
  fo as SideMenu,
  bo as SideMenuController,
  Bo as SuggestionMenuController,
  Vo as SuggestionMenuWrapper,
  Do as TableHandle,
  Zo as TableHandleMenu,
  Wo as TableHandlesController,
  oe as TextAlignButton,
  Kn as UnnestBlockButton,
  ln as UploadTab,
  mr as VideoBlock,
  ur as VideoPreview,
  gr as VideoToExternalHTML,
  Xn as blockTypeSelectItems,
  te as createReactBlockSpec,
  Rr as createReactInlineContentSpec,
  Pr as createReactStyleSpec,
  Nr as elementOverflow,
  Co as getDefaultReactEmojiPickerItems,
  Lo as getDefaultReactSlashMenuItems,
  to as getFormattingToolbarItems,
  xr as getPageBreakReactSlashMenuItems,
  an as mergeRefs,
  Tr as useActiveStyles,
  _r as useBlockNote,
  E as useBlockNoteContext,
  v as useBlockNoteEditor,
  dt as useCloseSuggestionMenuNoItems,
  p as useComponentsContext,
  hr as useCreateBlockNote,
  V as useDictionary,
  me as useEditorChange,
  N as useEditorContentOrSelectionChange,
  Er as useEditorForceUpdate,
  he as useEditorSelectionChange,
  Ao as useExtendButtonsPositioning,
  ko as useGridSuggestionMenuKeyboardNavigation,
  ut as useLoadSuggestionMenuItems,
  jo as usePrefersColorScheme,
  Ce as useResolveUrl,
  T as useSelectedBlocks,
  Mo as useSuggestionMenuKeyboardHandler,
  So as useSuggestionMenuKeyboardNavigation,
  zo as useTableHandlesPositioning,
  Z as useUIElementPositioning,
  P as useUIPluginState
};
//# sourceMappingURL=blocknote-react.js.map
