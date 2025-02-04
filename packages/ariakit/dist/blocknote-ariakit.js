import { jsx as r, jsxs as p, Fragment as L } from "react/jsx-runtime";
import { assertEmpty as i, mergeCSSClasses as b, isSafari as F } from "@blocknote/core";
import { elementOverflow as I, mergeRefs as C, ComponentsContext as E, BlockNoteViewRaw as G } from "@blocknote/react";
import { FormProvider as f, FormLabel as V, FormInput as S, MenuProvider as $, Menu as O, MenuButton as P, MenuItem as M, MenuButtonArrow as A, CheckboxCheck as T, MenuGroupLabel as H, MenuSeparator as j, TabProvider as q, TabList as K, Tab as z, TabPanel as J, Button as v, PopoverDisclosure as Q, Popover as U, PopoverProvider as W, Group as w, Toolbar as X, ToolbarItem as y, TooltipProvider as Y, TooltipAnchor as Z, Tooltip as _, SelectProvider as ee, Select as ne, SelectArrow as te, SelectPopover as se, SelectItem as ae, SelectItemCheck as re } from "@ariakit/react";
import { forwardRef as d, useRef as x, useEffect as D } from "react";
const oe = (n) => {
  const { children: t, ...s } = n;
  return i(s), /* @__PURE__ */ r(f, { children: t });
}, le = d((n, t) => {
  const {
    className: s,
    name: e,
    label: a,
    variant: o,
    icon: l,
    value: m,
    autoFocus: c,
    placeholder: u,
    disabled: g,
    onKeyDown: h,
    onChange: N,
    onSubmit: k,
    autoComplete: R,
    ...B
  } = n;
  return i(B), /* @__PURE__ */ p(L, { children: [
    n.label && /* @__PURE__ */ r(V, { name: e, children: a }),
    /* @__PURE__ */ p("div", { className: "bn-ak-input-wrapper", children: [
      l,
      /* @__PURE__ */ r(
        S,
        {
          className: b(
            "bn-ak-input",
            s || "",
            o === "large" ? "bn-ak-input-large" : ""
          ),
          ref: t,
          name: e,
          value: m,
          autoFocus: c,
          placeholder: u,
          disabled: g,
          onKeyDown: h,
          onChange: N,
          onSubmit: k,
          autoComplete: R
        }
      )
    ] })
  ] });
}), ce = (n) => {
  const {
    children: t,
    onOpenChange: s,
    position: e,
    sub: a,
    // unused
    ...o
  } = n;
  return i(o), /* @__PURE__ */ r(
    $,
    {
      placement: e,
      setOpen: s,
      virtualFocus: !0,
      children: t
    }
  );
}, ie = d((n, t) => {
  const {
    className: s,
    children: e,
    sub: a,
    // unused
    ...o
  } = n;
  return i(o), /* @__PURE__ */ r(
    O,
    {
      unmountOnHide: !0,
      className: b("bn-ak-menu", s || ""),
      ref: t,
      children: e
    }
  );
}), ue = d((n, t) => {
  const { className: s, children: e, icon: a, checked: o, subTrigger: l, onClick: m, ...c } = n;
  return i(c), l ? /* @__PURE__ */ p(
    P,
    {
      render: /* @__PURE__ */ r(M, {}),
      className: b("bn-ak-menu-item", s || ""),
      ref: t,
      onClick: m,
      children: [
        a,
        e,
        /* @__PURE__ */ r(A, {}),
        o !== void 0 && /* @__PURE__ */ r(T, { checked: o })
      ]
    }
  ) : /* @__PURE__ */ p(
    M,
    {
      className: b("bn-ak-menu-item", s || ""),
      ref: t,
      onClick: m,
      children: [
        a,
        e,
        o !== void 0 && /* @__PURE__ */ r(T, { checked: o })
      ]
    }
  );
}), de = d((n, t) => {
  const { className: s, children: e, ...a } = n;
  return i(a), /* @__PURE__ */ r(
    H,
    {
      className: b("bn-ak-group-label", s || ""),
      ref: t,
      children: e
    }
  );
}), me = (n) => {
  const { children: t, sub: s, ...e } = n;
  return i(e), s ? t : /* @__PURE__ */ r(P, { render: t });
}, be = d((n, t) => {
  const { className: s, ...e } = n;
  return i(e), /* @__PURE__ */ r(
    j,
    {
      className: b("bn-ak-separator", s || ""),
      ref: t
    }
  );
}), pe = d((n, t) => {
  const {
    className: s,
    tabs: e,
    defaultOpenTab: a,
    openTab: o,
    setOpenTab: l,
    loading: m,
    // TODO: implement loading
    ...c
  } = n;
  return i(c), /* @__PURE__ */ r(
    "div",
    {
      className: b("bn-ak-wrapper", s || ""),
      ref: t,
      children: /* @__PURE__ */ p(
        q,
        {
          defaultSelectedId: a,
          selectedId: o,
          setActiveId: (u) => {
            u && l(u);
          },
          children: [
            /* @__PURE__ */ r(K, { className: "bn-ak-tab-list", children: e.map((u) => /* @__PURE__ */ r(z, { className: "bn-ak-tab", id: u.name, children: u.name }, u.name)) }),
            /* @__PURE__ */ r("div", { className: "bn-ak-panels", children: e.map((u) => /* @__PURE__ */ r(J, { tabId: u.name, children: u.tabPanel }, u.name)) })
          ]
        }
      )
    }
  );
}), ge = d((n, t) => {
  const { className: s, children: e, onClick: a, label: o, ...l } = n;
  return i(l), /* @__PURE__ */ r(
    v,
    {
      className: b("bn-ak-button", s || ""),
      onClick: a,
      "aria-label": o,
      ref: t,
      children: e
    }
  );
}), he = d((n, t) => {
  const { className: s, accept: e, value: a, placeholder: o, onChange: l, ...m } = n;
  return i(m), /* @__PURE__ */ r(f, { children: /* @__PURE__ */ r(
    S,
    {
      className: s,
      ref: t,
      name: "panel-input",
      type: "file",
      accept: e,
      value: a ? a.name : void 0,
      onChange: async (c) => l == null ? void 0 : l(c.target.files[0]),
      placeholder: o
    }
  ) });
}), Ne = d((n, t) => {
  const { className: s, children: e, ...a } = n;
  return i(a), /* @__PURE__ */ r("div", { className: s, ref: t, children: e });
}), ve = d((n, t) => {
  const { className: s, value: e, placeholder: a, onKeyDown: o, onChange: l, ...m } = n;
  return i(m), /* @__PURE__ */ r(f, { children: /* @__PURE__ */ r(
    S,
    {
      className: b("bn-ak-input", s || ""),
      name: "panel-input",
      value: e,
      placeholder: a,
      onChange: l,
      onKeyDown: o,
      "data-test": "embed-input",
      ref: t
    }
  ) });
}), ke = d((n, t) => {
  const { children: s, ...e } = n;
  return i(e), /* @__PURE__ */ r(Q, { render: s, ref: t });
}), fe = d((n, t) => {
  const { className: s, children: e, variant: a, ...o } = n;
  return i(o), /* @__PURE__ */ r(
    U,
    {
      className: b("bn-ak-popover", s || ""),
      ref: t,
      children: e
    }
  );
}), Se = (n) => {
  const { children: t, opened: s, position: e, ...a } = n;
  return i(a), /* @__PURE__ */ r(W, { open: s, placement: e, children: t });
}, Me = d((n, t) => {
  const { className: s, children: e, ...a } = n;
  return i(a, !1), /* @__PURE__ */ r(w, { className: s, ref: t, ...a, children: e });
}), Te = d((n, t) => {
  const {
    className: s,
    children: e,
    icon: a,
    onClick: o,
    label: l,
    onDragEnd: m,
    onDragStart: c,
    draggable: u,
    ...g
  } = n;
  return i(g, !1), /* @__PURE__ */ p(
    v,
    {
      onDragEnd: m,
      onDragStart: c,
      draggable: u,
      "aria-label": l,
      className: b(
        "bn-ak-button bn-ak-secondary",
        s || ""
      ),
      ref: t,
      onClick: o,
      ...g,
      children: [
        a,
        e
      ]
    }
  );
}), Ie = d((n, t) => {
  const { className: s, children: e, id: a, columns: o, ...l } = n;
  return i(l), /* @__PURE__ */ r(
    "div",
    {
      className: s,
      style: { gridTemplateColumns: `repeat(${o}, 1fr)` },
      ref: t,
      id: a,
      role: "grid",
      children: e
    }
  );
}), Ce = d((n, t) => {
  const { className: s, children: e, columns: a, ...o } = n;
  return i(o), /* @__PURE__ */ r(
    "div",
    {
      className: b("bn-ak-menu-item", s || ""),
      style: { gridColumn: `1 / ${a + 1}` },
      ref: t,
      children: /* @__PURE__ */ r("div", { className: "bn-ak-suggestion-menu-item-label", children: e })
    }
  );
}), Pe = d((n, t) => {
  const { className: s, isSelected: e, onClick: a, item: o, id: l, ...m } = n;
  i(m);
  const c = x(null);
  return D(() => {
    if (!c.current || !e)
      return;
    const u = I(
      c.current,
      document.querySelector(".bn-grid-suggestion-menu")
    );
    u === "top" ? c.current.scrollIntoView(!0) : u === "bottom" && c.current.scrollIntoView(!1);
  }, [e]), /* @__PURE__ */ r(
    "div",
    {
      className: s,
      ref: C([t, c]),
      id: l,
      role: "option",
      onClick: a,
      "aria-selected": e || void 0,
      children: o.icon
    }
  );
}), we = d((n, t) => {
  const {
    className: s,
    children: e,
    // unused, using "dots" instead
    columns: a,
    ...o
  } = n;
  return i(o), /* @__PURE__ */ r(
    "div",
    {
      className: s,
      style: { gridColumn: `1 / ${a + 1}` },
      ref: t,
      children: e
    }
  );
}), ye = d((n, t) => {
  const { className: s, children: e, id: a, ...o } = n;
  return i(o), /* @__PURE__ */ r(
    w,
    {
      className: b("bn-ak-menu", s || ""),
      id: a,
      role: "listbox",
      ref: t,
      children: e
    }
  );
}), xe = d((n, t) => {
  const { className: s, children: e, ...a } = n;
  return i(a), /* @__PURE__ */ r(
    "div",
    {
      className: b("bn-ak-menu-item", s || ""),
      ref: t,
      children: /* @__PURE__ */ r("div", { className: "bn-ak-suggestion-menu-item-label", children: e })
    }
  );
}), De = d((n, t) => {
  const { className: s, item: e, isSelected: a, onClick: o, id: l, ...m } = n;
  i(m);
  const c = x(null);
  return D(() => {
    if (!c.current || !a)
      return;
    const u = I(
      c.current,
      document.querySelector(".bn-suggestion-menu, #ai-suggestion-menu")
      // TODO
    );
    u === "top" ? c.current.scrollIntoView(!0) : u === "bottom" && c.current.scrollIntoView(!1);
  }, [a]), /* @__PURE__ */ p(
    "div",
    {
      className: b("bn-ak-menu-item", s || ""),
      ref: C([t, c]),
      id: l,
      onMouseDown: (u) => u.preventDefault(),
      onClick: o,
      role: "option",
      "aria-selected": a || void 0,
      children: [
        e.icon && /* @__PURE__ */ r(
          "div",
          {
            className: "bn-ak-suggestion-menu-item-section",
            "data-position": "left",
            children: e.icon
          }
        ),
        /* @__PURE__ */ p("div", { className: "bn-ak-suggestion-menu-item-body", children: [
          /* @__PURE__ */ r("div", { className: "bn-ak-suggestion-menu-item-title", children: e.title }),
          /* @__PURE__ */ r("div", { className: "bn-ak-suggestion-menu-item-subtitle", children: e.subtext })
        ] }),
        e.badge && /* @__PURE__ */ r(
          "div",
          {
            "data-position": "right",
            className: "bn-ak-suggestion-menu-item-section",
            children: /* @__PURE__ */ r("div", { children: e.badge })
          }
        )
      ]
    }
  );
}), Re = d((n, t) => {
  const { className: s, children: e, ...a } = n;
  return i(a), /* @__PURE__ */ r(
    "div",
    {
      className: b("bn-ak-group-label", s || ""),
      ref: t,
      children: e
    }
  );
}), Be = d((n, t) => {
  const { className: s, children: e, ...a } = n;
  return i(a), /* @__PURE__ */ r("div", { className: s, ref: t, children: e });
}), Le = d((n, t) => {
  const { children: s, className: e, onMouseDown: a, onClick: o, ...l } = n;
  return i(l, !1), /* @__PURE__ */ r(
    v,
    {
      className: b(
        "bn-ak-button bn-ak-secondary",
        e || ""
      ),
      ref: t,
      onMouseDown: a,
      onClick: o,
      ...l,
      children: s
    }
  );
}), Fe = d((n, t) => {
  const {
    className: s,
    children: e,
    draggable: a,
    onDragStart: o,
    onDragEnd: l,
    style: m,
    label: c,
    ...u
  } = n;
  return i(u, !1), /* @__PURE__ */ r(
    v,
    {
      className: b(
        "bn-ak-button bn-ak-secondary",
        s || ""
      ),
      ref: t,
      "aria-label": c,
      draggable: a,
      onDragStart: o,
      onDragEnd: l,
      style: m,
      ...u,
      children: e
    }
  );
}), Ee = d(
  (n, t) => {
    const { className: s, children: e, onMouseEnter: a, onMouseLeave: o, ...l } = n;
    return i(l), /* @__PURE__ */ r(
      X,
      {
        className: b("bn-ak-toolbar", s || ""),
        ref: t,
        onMouseEnter: a,
        onMouseLeave: o,
        children: e
      }
    );
  }
), Ge = d(
  (n, t) => {
    const {
      className: s,
      children: e,
      mainTooltip: a,
      secondaryTooltip: o,
      icon: l,
      isSelected: m,
      isDisabled: c,
      onClick: u,
      label: g,
      ...h
    } = n;
    i(h, !1);
    const N = /* @__PURE__ */ p(
      y,
      {
        "aria-label": g,
        className: b(
          "bn-ak-button bn-ak-secondary",
          s || ""
        ),
        onMouseDown: (k) => {
          F() && k.currentTarget.focus();
        },
        onClick: u,
        "aria-pressed": m,
        "data-selected": m ? "true" : void 0,
        "data-test": a && a.slice(0, 1).toLowerCase() + a.replace(/\s+/g, "").slice(1),
        disabled: c || !1,
        ref: t,
        ...h,
        children: [
          l,
          e
        ]
      }
    );
    return a ? /* @__PURE__ */ p(Y, { children: [
      /* @__PURE__ */ r(Z, { className: "link", render: N }),
      /* @__PURE__ */ p(_, { className: "bn-ak-tooltip", children: [
        /* @__PURE__ */ r("span", { children: a }),
        o && /* @__PURE__ */ r("span", { children: o })
      ] })
    ] }) : N;
  }
), Ve = d((n, t) => {
  const { className: s, items: e, isDisabled: a, ...o } = n;
  i(o);
  const l = n.items.filter((c) => c.isSelected)[0], m = (c) => {
    var u, g;
    (g = (u = e.find((h) => h.text === c)).onClick) == null || g.call(u);
  };
  return /* @__PURE__ */ p(ee, { value: l.text, setValue: m, children: [
    /* @__PURE__ */ p(
      ne,
      {
        className: "bn-ak-button bn-ak-secondary",
        disabled: a,
        "aria-label": "Text alignment",
        render: /* @__PURE__ */ r(y, {}),
        children: [
          l.icon,
          " ",
          l.text,
          " ",
          /* @__PURE__ */ r(te, {})
        ]
      }
    ),
    /* @__PURE__ */ r(
      se,
      {
        className: b("bn-ak-popover", s || ""),
        ref: t,
        gutter: 4,
        children: e.map((c) => /* @__PURE__ */ p(
          ae,
          {
            className: "bn-ak-select-item",
            value: c.text,
            children: [
              c.icon,
              c.text,
              c.text === l.text && /* @__PURE__ */ r(re, {})
            ]
          },
          c.text
        ))
      }
    )
  ] });
}), $e = {
  Toolbar: {
    Root: Ee,
    Button: Ge,
    Select: Ve
  },
  FilePanel: {
    Root: pe,
    Button: ge,
    FileInput: he,
    TabPanel: Ne,
    TextInput: ve
  },
  GridSuggestionMenu: {
    Root: Ie,
    Item: Pe,
    EmptyItem: Ce,
    Loader: we
  },
  SideMenu: {
    Root: Me,
    Button: Te
  },
  SuggestionMenu: {
    Root: ye,
    Item: De,
    EmptyItem: xe,
    Label: Re,
    Loader: Be
  },
  TableHandle: {
    Root: Fe,
    ExtendButton: Le
  },
  Generic: {
    Form: {
      Root: oe,
      TextInput: le
    },
    Menu: {
      Root: ce,
      Trigger: me,
      Dropdown: ie,
      Divider: be,
      Label: de,
      Item: ue
    },
    Popover: {
      Root: Se,
      Trigger: ke,
      Content: fe
    }
  }
}, Ke = (n) => {
  const { className: t, ...s } = n;
  return /* @__PURE__ */ r(E.Provider, { value: $e, children: /* @__PURE__ */ r(
    G,
    {
      className: b("bn-ariakit", t || ""),
      ...s
    }
  ) });
};
export {
  Ke as BlockNoteView,
  $e as components
};
//# sourceMappingURL=blocknote-ariakit.js.map
