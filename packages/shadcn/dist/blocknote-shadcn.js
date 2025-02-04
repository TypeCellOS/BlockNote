import { jsx as a, jsxs as v, Fragment as ue } from "react/jsx-runtime";
import { assertEmpty as c, mergeCSSClasses as pe } from "@blocknote/core";
import { elementOverflow as P, mergeRefs as F, ComponentsContext as fe, BlockNoteViewRaw as ge } from "@blocknote/react";
import * as l from "react";
import { createContext as he, useContext as ve, forwardRef as p, useMemo as B, useRef as k, useEffect as L } from "react";
import { FormProvider as Ne, useFormContext as xe, useForm as we } from "react-hook-form";
import { cva as T } from "class-variance-authority";
import { clsx as Ce } from "clsx";
import { extendTailwindMerge as ye } from "tailwind-merge";
import { Slot as z } from "@radix-ui/react-slot";
import * as h from "@radix-ui/react-dropdown-menu";
import { ChevronRight as V, Check as E, Circle as Se, ChevronDown as j, ChevronUp as Te } from "lucide-react";
import * as $ from "@radix-ui/react-label";
import * as M from "@radix-ui/react-popover";
import * as N from "@radix-ui/react-select";
import * as C from "@radix-ui/react-tabs";
import * as G from "@radix-ui/react-toggle";
import * as S from "@radix-ui/react-tooltip";
const Me = ye({
  prefix: "bn-"
});
function i(...n) {
  return Me(Ce(n));
}
const De = T(
  "bn-inline-flex bn-items-center bn-rounded-full bn-border bn-px-2.5 bn-py-0.5 bn-text-xs bn-font-semibold bn-transition-colors focus:bn-outline-none focus:bn-ring-2 focus:bn-ring-ring focus:bn-ring-offset-2",
  {
    variants: {
      variant: {
        default: "bn-border-transparent bn-bg-primary bn-text-primary-foreground hover:bn-bg-primary/80",
        secondary: "bn-border-transparent bn-bg-secondary bn-text-secondary-foreground hover:bn-bg-secondary/80",
        destructive: "bn-border-transparent bn-bg-destructive bn-text-destructive-foreground hover:bn-bg-destructive/80",
        outline: "bn-text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Ie({ className: n, variant: t, ...e }) {
  return /* @__PURE__ */ a("div", { className: i(De({ variant: t }), n), ...e });
}
const Re = T(
  "bn-inline-flex bn-items-center bn-justify-center bn-whitespace-nowrap bn-rounded-md bn-text-sm bn-font-medium bn-ring-offset-background bn-transition-colors focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-pointer-events-none disabled:bn-opacity-50",
  {
    variants: {
      variant: {
        default: "bn-bg-primary bn-text-primary-foreground hover:bn-bg-primary/90",
        destructive: "bn-bg-destructive bn-text-destructive-foreground hover:bn-bg-destructive/90",
        outline: "bn-border bn-border-input bn-bg-background hover:bn-bg-accent hover:bn-text-accent-foreground",
        secondary: "bn-bg-secondary bn-text-secondary-foreground hover:bn-bg-secondary/80",
        ghost: "hover:bn-bg-accent hover:bn-text-accent-foreground",
        link: "bn-text-primary bn-underline-offset-4 hover:bn-underline"
      },
      size: {
        default: "bn-h-10 bn-px-4 bn-py-2",
        sm: "bn-h-9 bn-rounded-md bn-px-3",
        lg: "bn-h-11 bn-rounded-md bn-px-8",
        icon: "bn-h-10 bn-w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), U = l.forwardRef(
  ({ className: n, variant: t, size: e, asChild: o = !1, ...r }, s) => /* @__PURE__ */ a(
    o ? z : "button",
    {
      className: i(Re({ variant: t, size: e, className: n })),
      ref: s,
      ...r
    }
  )
);
U.displayName = "Button";
const O = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  "div",
  {
    ref: e,
    className: i(
      "bn-rounded-lg bn-border bn-bg-card bn-text-card-foreground bn-shadow-sm",
      n
    ),
    ...t
  }
));
O.displayName = "Card";
const Pe = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  "div",
  {
    ref: e,
    className: i("bn-flex bn-flex-col bn-space-y-1.5 bn-p-6", n),
    ...t
  }
));
Pe.displayName = "CardHeader";
const Fe = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  "h3",
  {
    ref: e,
    className: i(
      "bn-text-2xl bn-font-semibold bn-leading-none bn-tracking-tight",
      n
    ),
    ...t
  }
));
Fe.displayName = "CardTitle";
const Be = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  "p",
  {
    ref: e,
    className: i("bn-text-sm bn-text-muted-foreground", n),
    ...t
  }
));
Be.displayName = "CardDescription";
const H = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a("div", { ref: e, className: i("bn-p-6 bn-pt-0", n), ...t }));
H.displayName = "CardContent";
const ke = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  "div",
  {
    ref: e,
    className: i("bn-flex bn-items-center bn-p-6 bn-pt-0", n),
    ...t
  }
));
ke.displayName = "CardFooter";
const Le = h.Root, ze = h.Trigger, Ve = h.Sub, K = l.forwardRef(({ className: n, inset: t, children: e, ...o }, r) => /* @__PURE__ */ v(
  h.SubTrigger,
  {
    ref: r,
    className: i(
      "bn-flex bn-cursor-default bn-select-none bn-items-center bn-rounded-sm bn-px-2 bn-py-1.5 bn-text-sm bn-outline-none focus:bn-bg-accent data-[state=open]:bn-bg-accent",
      t && "bn-pl-8",
      n
    ),
    ...o,
    children: [
      e,
      /* @__PURE__ */ a(V, { className: "bn-ml-auto bn-h-4 bn-w-4" })
    ]
  }
));
K.displayName = h.SubTrigger.displayName;
const q = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  h.SubContent,
  {
    ref: e,
    className: i(
      "bn-z-50 bn-min-w-[8rem] bn-overflow-hidden bn-rounded-md bn-border bn-bg-popover bn-p-1 bn-text-popover-foreground bn-shadow-lg data-[state=open]:bn-animate-in data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=open]:bn-fade-in-0 data-[state=closed]:bn-zoom-out-95 data-[state=open]:bn-zoom-in-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
      n
    ),
    ...t
  }
));
q.displayName = h.SubContent.displayName;
const W = l.forwardRef(({ className: n, sideOffset: t = 4, ...e }, o) => (
  // <DropdownMenuPrimitive.Portal>
  /* @__PURE__ */ a(
    h.Content,
    {
      ref: o,
      sideOffset: t,
      className: i(
        "bn-z-50 bn-min-w-[8rem] bn-overflow-hidden bn-rounded-md bn-border bn-bg-popover bn-p-1 bn-text-popover-foreground bn-shadow-md data-[state=open]:bn-animate-in data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=open]:bn-fade-in-0 data-[state=closed]:bn-zoom-out-95 data-[state=open]:bn-zoom-in-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
        n
      ),
      ...e
    }
  )
));
W.displayName = h.Content.displayName;
const A = l.forwardRef(({ className: n, inset: t, ...e }, o) => /* @__PURE__ */ a(
  h.Item,
  {
    ref: o,
    className: i(
      "bn-relative bn-flex bn-cursor-default bn-select-none bn-items-center bn-rounded-sm bn-px-2 bn-py-1.5 bn-text-sm bn-outline-none bn-transition-colors focus:bn-bg-accent focus:bn-text-accent-foreground data-[disabled]:bn-pointer-events-none data-[disabled]:bn-opacity-50",
      t && "bn-pl-8",
      n
    ),
    ...e
  }
));
A.displayName = h.Item.displayName;
const J = l.forwardRef(({ className: n, children: t, checked: e, ...o }, r) => /* @__PURE__ */ v(
  h.CheckboxItem,
  {
    ref: r,
    className: i(
      "bn-relative bn-flex bn-cursor-default bn-select-none bn-items-center bn-rounded-sm bn-py-1.5 bn-pl-8 bn-pr-2 bn-text-sm bn-outline-none bn-transition-colors focus:bn-bg-accent focus:bn-text-accent-foreground data-[disabled]:bn-pointer-events-none data-[disabled]:bn-opacity-50",
      n
    ),
    checked: e,
    ...o,
    children: [
      /* @__PURE__ */ a("span", { className: "bn-absolute bn-left-2 bn-flex bn-h-3.5 bn-w-3.5 bn-items-center bn-justify-center", children: /* @__PURE__ */ a(h.ItemIndicator, { children: /* @__PURE__ */ a(E, { className: "bn-h-4 bn-w-4" }) }) }),
      t
    ]
  }
));
J.displayName = h.CheckboxItem.displayName;
const Ee = l.forwardRef(({ className: n, children: t, ...e }, o) => /* @__PURE__ */ v(
  h.RadioItem,
  {
    ref: o,
    className: i(
      "bn-relative bn-flex bn-cursor-default bn-select-none bn-items-center bn-rounded-sm bn-py-1.5 bn-pl-8 bn-pr-2 bn-text-sm bn-outline-none bn-transition-colors focus:bn-bg-accent focus:bn-text-accent-foreground data-[disabled]:bn-pointer-events-none data-[disabled]:bn-opacity-50",
      n
    ),
    ...e,
    children: [
      /* @__PURE__ */ a("span", { className: "bn-absolute bn-left-2 bn-flex bn-h-3.5 bn-w-3.5 bn-items-center bn-justify-center", children: /* @__PURE__ */ a(h.ItemIndicator, { children: /* @__PURE__ */ a(Se, { className: "bn-h-2 bn-w-2 bn-fill-current" }) }) }),
      t
    ]
  }
));
Ee.displayName = h.RadioItem.displayName;
const Q = l.forwardRef(({ className: n, inset: t, ...e }, o) => /* @__PURE__ */ a(
  h.Label,
  {
    ref: o,
    className: i(
      "bn-px-2 bn-py-1.5 bn-text-sm bn-font-semibold",
      t && "bn-pl-8",
      n
    ),
    ...e
  }
));
Q.displayName = h.Label.displayName;
const X = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  h.Separator,
  {
    ref: e,
    className: i("bn--mx-1 bn-my-1 bn-h-px bn-bg-muted", n),
    ...t
  }
));
X.displayName = h.Separator.displayName;
const je = T(
  "bn-text-sm bn-font-medium bn-leading-none peer-disabled:bn-cursor-not-allowed peer-disabled:bn-opacity-70"
), R = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  $.Root,
  {
    ref: e,
    className: i(je(), n),
    ...t
  }
));
R.displayName = $.Root.displayName;
const $e = Ne, Ge = l.createContext(
  {}
), D = () => {
  const n = l.useContext(Ge), t = l.useContext(Y), { getFieldState: e, formState: o } = xe(), r = e(n.name, o);
  if (!n)
    throw new Error("useFormField should be used within <FormField>");
  const { id: s } = t;
  return {
    id: s,
    name: n.name,
    formItemId: `${s}-form-item`,
    formDescriptionId: `${s}-form-item-description`,
    formMessageId: `${s}-form-item-message`,
    ...r
  };
}, Y = l.createContext(
  {}
), Ue = l.forwardRef(({ className: n, ...t }, e) => {
  const o = l.useId();
  return /* @__PURE__ */ a(Y.Provider, { value: { id: o }, children: /* @__PURE__ */ a("div", { ref: e, className: i("bn-space-y-2", n), ...t }) });
});
Ue.displayName = "FormItem";
const Oe = l.forwardRef(({ className: n, ...t }, e) => {
  const { error: o, formItemId: r } = D();
  return /* @__PURE__ */ a(
    R,
    {
      ref: e,
      className: i(o && "bn-text-destructive", n),
      htmlFor: r,
      ...t
    }
  );
});
Oe.displayName = "FormLabel";
const He = l.forwardRef(({ ...n }, t) => {
  const { error: e, formItemId: o, formDescriptionId: r, formMessageId: s } = D();
  return /* @__PURE__ */ a(
    z,
    {
      ref: t,
      id: o,
      "aria-describedby": e ? `${r} ${s}` : `${r}`,
      "aria-invalid": !!e,
      ...n
    }
  );
});
He.displayName = "FormControl";
const Ke = l.forwardRef(({ className: n, ...t }, e) => {
  const { formDescriptionId: o } = D();
  return /* @__PURE__ */ a(
    "p",
    {
      ref: e,
      id: o,
      className: i("bn-text-sm bn-text-muted-foreground", n),
      ...t
    }
  );
});
Ke.displayName = "FormDescription";
const qe = l.forwardRef(({ className: n, children: t, ...e }, o) => {
  const { error: r, formMessageId: s } = D(), d = r ? String(r == null ? void 0 : r.message) : t;
  return d ? /* @__PURE__ */ a(
    "p",
    {
      ref: o,
      id: s,
      className: i("bn-text-sm bn-font-medium bn-text-destructive", n),
      ...e,
      children: d
    }
  ) : null;
});
qe.displayName = "FormMessage";
const Z = l.forwardRef(
  ({ className: n, type: t, ...e }, o) => /* @__PURE__ */ a(
    "input",
    {
      type: t,
      className: i(
        "bn-flex bn-h-10 bn-w-full bn-rounded-md bn-border bn-border-input bn-bg-background bn-px-3 bn-py-2 bn-text-sm bn-ring-offset-background file:bn-border-0 file:bn-bg-transparent file:bn-text-sm file:bn-font-medium placeholder:bn-text-muted-foreground focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-cursor-not-allowed disabled:bn-opacity-50",
        n
      ),
      ref: o,
      ...e
    }
  )
);
Z.displayName = "Input";
const We = M.Root, Ae = M.Trigger, _ = l.forwardRef(({ className: n, align: t = "center", sideOffset: e = 4, ...o }, r) => (
  // <PopoverPrimitive.Portal>
  /* @__PURE__ */ a(
    M.Content,
    {
      ref: r,
      align: t,
      sideOffset: e,
      className: i(
        "bn-z-50 bn-w-72 bn-rounded-md bn-border bn-bg-popover bn-p-4 bn-text-popover-foreground bn-shadow-md bn-outline-none data-[state=open]:bn-animate-in data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=open]:bn-fade-in-0 data-[state=closed]:bn-zoom-out-95 data-[state=open]:bn-zoom-in-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
        n
      ),
      ...o
    }
  )
));
_.displayName = M.Content.displayName;
const Je = N.Root, Qe = N.Value, ee = l.forwardRef(({ className: n, children: t, ...e }, o) => /* @__PURE__ */ v(
  N.Trigger,
  {
    ref: o,
    className: i(
      "bn-flex bn-h-10 bn-w-full bn-items-center bn-justify-between bn-rounded-md bn-border bn-border-input bn-bg-background bn-px-3 bn-py-2 bn-text-sm bn-ring-offset-background placeholder:bn-text-muted-foreground focus:bn-outline-none focus:bn-ring-2 focus:bn-ring-ring focus:bn-ring-offset-2 disabled:bn-cursor-not-allowed disabled:bn-opacity-50 [&>span]:bn-line-clamp-1",
      n
    ),
    ...e,
    children: [
      t,
      /* @__PURE__ */ a(N.Icon, { asChild: !0, children: /* @__PURE__ */ a(j, { className: "bn-h-4 bn-w-4 bn-opacity-50" }) })
    ]
  }
));
ee.displayName = N.Trigger.displayName;
const ne = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  N.ScrollUpButton,
  {
    ref: e,
    className: i(
      "bn-flex bn-cursor-default bn-items-center bn-justify-center bn-py-1",
      n
    ),
    ...t,
    children: /* @__PURE__ */ a(Te, { className: "bn-h-4 bn-w-4" })
  }
));
ne.displayName = N.ScrollUpButton.displayName;
const te = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  N.ScrollDownButton,
  {
    ref: e,
    className: i(
      "bn-flex bn-cursor-default bn-items-center bn-justify-center bn-py-1",
      n
    ),
    ...t,
    children: /* @__PURE__ */ a(j, { className: "bn-h-4 bn-w-4" })
  }
));
te.displayName = N.ScrollDownButton.displayName;
const oe = l.forwardRef(({ className: n, children: t, position: e = "popper", ...o }, r) => (
  // <SelectPrimitive.Portal>
  /* @__PURE__ */ v(
    N.Content,
    {
      ref: r,
      className: i(
        "bn-relative bn-z-50 bn-max-h-96 bn-min-w-[8rem] bn-overflow-hidden bn-rounded-md bn-border bn-bg-popover bn-text-popover-foreground bn-shadow-md data-[state=open]:bn-animate-in data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=open]:bn-fade-in-0 data-[state=closed]:bn-zoom-out-95 data-[state=open]:bn-zoom-in-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
        e === "popper" && "data-[side=bottom]:bn-translate-y-1 data-[side=left]:bn--translate-x-1 data-[side=right]:bn-translate-x-1 data-[side=top]:bn--translate-y-1",
        n
      ),
      position: e,
      ...o,
      children: [
        /* @__PURE__ */ a(ne, {}),
        /* @__PURE__ */ a(
          N.Viewport,
          {
            className: i(
              "bn-p-1",
              e === "popper" && "bn-h-[var(--radix-select-trigger-height)] bn-w-full bn-min-w-[var(--radix-select-trigger-width)]"
            ),
            children: t
          }
        ),
        /* @__PURE__ */ a(te, {})
      ]
    }
  )
));
oe.displayName = N.Content.displayName;
const Xe = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  N.Label,
  {
    ref: e,
    className: i(
      "bn-py-1.5 bn-pl-8 bn-pr-2 bn-text-sm bn-font-semibold",
      n
    ),
    ...t
  }
));
Xe.displayName = N.Label.displayName;
const re = l.forwardRef(({ className: n, children: t, ...e }, o) => /* @__PURE__ */ v(
  N.Item,
  {
    ref: o,
    className: i(
      "bn-relative bn-flex bn-w-full bn-cursor-default bn-select-none bn-items-center bn-rounded-sm bn-py-1.5 bn-pl-8 bn-pr-2 bn-text-sm bn-outline-none focus:bn-bg-accent focus:bn-text-accent-foreground data-[disabled]:bn-pointer-events-none data-[disabled]:bn-opacity-50",
      n
    ),
    ...e,
    children: [
      /* @__PURE__ */ a("span", { className: "bn-absolute bn-left-2 bn-flex bn-h-3.5 bn-w-3.5 bn-items-center bn-justify-center", children: /* @__PURE__ */ a(N.ItemIndicator, { children: /* @__PURE__ */ a(E, { className: "bn-h-4 bn-w-4" }) }) }),
      /* @__PURE__ */ a(N.ItemText, { children: t })
    ]
  }
));
re.displayName = N.Item.displayName;
const Ye = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  N.Separator,
  {
    ref: e,
    className: i("bn--mx-1 bn-my-1 bn-h-px bn-bg-muted", n),
    ...t
  }
));
Ye.displayName = N.Separator.displayName;
const Ze = C.Root, ae = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  C.List,
  {
    ref: e,
    className: i(
      "bn-inline-flex bn-h-10 bn-items-center bn-justify-center bn-rounded-md bn-bg-muted bn-p-1 bn-text-muted-foreground",
      n
    ),
    ...t
  }
));
ae.displayName = C.List.displayName;
const se = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  C.Trigger,
  {
    ref: e,
    className: i(
      "bn-inline-flex bn-items-center bn-justify-center bn-whitespace-nowrap bn-rounded-sm bn-px-3 bn-py-1.5 bn-text-sm bn-font-medium bn-ring-offset-background bn-transition-all focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-pointer-events-none disabled:bn-opacity-50 data-[state=active]:bn-bg-background data-[state=active]:bn-text-foreground data-[state=active]:bn-shadow-sm",
      n
    ),
    ...t
  }
));
se.displayName = C.Trigger.displayName;
const ie = l.forwardRef(({ className: n, ...t }, e) => /* @__PURE__ */ a(
  C.Content,
  {
    ref: e,
    className: i(
      "bn-mt-2 bn-ring-offset-background focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2",
      n
    ),
    ...t
  }
));
ie.displayName = C.Content.displayName;
const _e = T(
  "bn-inline-flex bn-items-center bn-justify-center bn-rounded-md bn-text-sm bn-font-medium bn-ring-offset-background bn-transition-colors hover:bn-bg-muted hover:bn-text-muted-foreground focus-visible:bn-outline-none focus-visible:bn-ring-2 focus-visible:bn-ring-ring focus-visible:bn-ring-offset-2 disabled:bn-pointer-events-none disabled:bn-opacity-50 data-[state=on]:bn-bg-accent data-[state=on]:bn-text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bn-bg-transparent",
        outline: "bn-border bn-border-input bn-bg-transparent hover:bn-bg-accent hover:bn-text-accent-foreground"
      },
      size: {
        default: "bn-h-10 bn-px-3",
        sm: "bn-h-9 bn-px-2.5",
        lg: "bn-h-11 bn-px-5"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), de = l.forwardRef(({ className: n, variant: t, size: e, ...o }, r) => /* @__PURE__ */ a(
  G.Root,
  {
    ref: r,
    className: i(_e({ variant: t, size: e, className: n })),
    ...o
  }
));
de.displayName = G.Root.displayName;
const en = S.Provider, nn = S.Root, tn = S.Trigger, be = l.forwardRef(({ className: n, sideOffset: t = 4, ...e }, o) => /* @__PURE__ */ a(
  S.Content,
  {
    ref: o,
    sideOffset: t,
    className: i(
      "bn-z-50 bn-overflow-hidden bn-rounded-md bn-border bn-bg-popover bn-px-3 bn-py-1.5 bn-text-sm bn-text-popover-foreground bn-shadow-md bn-animate-in bn-fade-in-0 bn-zoom-in-95 data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=closed]:bn-zoom-out-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
      n
    ),
    ...e
  }
));
be.displayName = S.Content.displayName;
const on = {
  Badge: {
    Badge: Ie
  },
  Button: {
    Button: U
  },
  Card: {
    Card: O,
    CardContent: H
  },
  DropdownMenu: {
    DropdownMenu: Le,
    DropdownMenuCheckboxItem: J,
    DropdownMenuContent: W,
    DropdownMenuItem: A,
    DropdownMenuLabel: Q,
    DropdownMenuSeparator: X,
    DropdownMenuSub: Ve,
    DropdownMenuSubContent: q,
    DropdownMenuSubTrigger: K,
    DropdownMenuTrigger: ze
  },
  Form: {
    Form: $e
  },
  Input: {
    Input: Z
  },
  Label: {
    Label: R
  },
  Popover: {
    Popover: We,
    PopoverContent: _,
    PopoverTrigger: Ae
  },
  Select: {
    Select: Je,
    SelectContent: oe,
    SelectItem: re,
    SelectTrigger: ee,
    SelectValue: Qe
  },
  Tabs: {
    Tabs: Ze,
    TabsContent: ie,
    TabsList: ae,
    TabsTrigger: se
  },
  Toggle: {
    Toggle: de
  },
  Tooltip: {
    Tooltip: nn,
    TooltipContent: be,
    TooltipProvider: en,
    TooltipTrigger: tn
  }
}, le = he(void 0);
function g() {
  return ve(le);
}
const rn = (n) => {
  const { children: t, ...e } = n;
  c(e);
  const o = g(), r = we();
  return /* @__PURE__ */ a(o.Form.Form, { ...r, children: t });
}, an = p((n, t) => {
  const {
    className: e,
    name: o,
    label: r,
    variant: s,
    icon: d,
    // TODO: implement
    value: u,
    autoFocus: m,
    placeholder: b,
    disabled: f,
    onKeyDown: x,
    onChange: w,
    onSubmit: y,
    autoComplete: ce,
    ...me
  } = n;
  c(me);
  const I = g();
  return r ? /* @__PURE__ */ v("div", { children: [
    /* @__PURE__ */ a(I.Label.Label, { htmlFor: r, children: r }),
    /* @__PURE__ */ a(
      I.Input.Input,
      {
        className: e,
        id: r,
        name: o,
        autoFocus: m,
        placeholder: b,
        disabled: f,
        value: u,
        onKeyDown: x,
        onChange: w,
        onSubmit: y
      }
    )
  ] }) : /* @__PURE__ */ a(
    I.Input.Input,
    {
      "aria-label": o,
      name: o,
      autoFocus: m,
      placeholder: b,
      disabled: f,
      value: u,
      onKeyDown: x,
      onChange: w,
      onSubmit: y,
      autoComplete: ce,
      ref: t
    }
  );
}), sn = (n) => p(
  (t, e) => /* @__PURE__ */ a(
    n,
    {
      onPointerDown: (o) => {
        o.nativeEvent.fakeEvent || (o.ctrlKey = !0);
      },
      onPointerUp: (o) => {
        const r = new PointerEvent("pointerdown", o.nativeEvent);
        r.fakeEvent = !0, o.target.dispatchEvent(r);
      },
      ...t,
      ref: e
    }
  )
), dn = (n) => {
  const {
    children: t,
    onOpenChange: e,
    position: o,
    // Unused
    sub: r,
    ...s
  } = n;
  c(s);
  const d = g();
  return r ? /* @__PURE__ */ a(
    d.DropdownMenu.DropdownMenuSub,
    {
      onOpenChange: e,
      children: t
    }
  ) : /* @__PURE__ */ a(d.DropdownMenu.DropdownMenu, { onOpenChange: e, children: t });
}, bn = (n) => {
  const { children: t, sub: e, ...o } = n;
  c(o);
  const r = g(), s = B(
    () => sn(
      r.DropdownMenu.DropdownMenuTrigger
    ),
    [r.DropdownMenu.DropdownMenuTrigger]
  );
  return e ? /* @__PURE__ */ a(r.DropdownMenu.DropdownMenuSubTrigger, { children: t }) : /* @__PURE__ */ a(s, { asChild: !0, ...o, children: t });
}, ln = p((n, t) => {
  const { className: e, children: o, sub: r, ...s } = n;
  c(s);
  const d = g();
  return r ? /* @__PURE__ */ a(
    d.DropdownMenu.DropdownMenuSubContent,
    {
      className: e,
      ref: t,
      children: o
    }
  ) : /* @__PURE__ */ a(
    d.DropdownMenu.DropdownMenuContent,
    {
      className: e,
      ref: t,
      children: o
    }
  );
}), cn = p((n, t) => {
  const { className: e, children: o, icon: r, checked: s, subTrigger: d, onClick: u, ...m } = n;
  c(m);
  const b = g();
  return d ? /* @__PURE__ */ v(ue, { children: [
    r,
    o
  ] }) : s !== void 0 ? /* @__PURE__ */ v(
    b.DropdownMenu.DropdownMenuCheckboxItem,
    {
      className: i(e, "bn-gap-1"),
      ref: t,
      checked: s,
      onClick: u,
      ...m,
      children: [
        r,
        o
      ]
    }
  ) : /* @__PURE__ */ v(
    b.DropdownMenu.DropdownMenuItem,
    {
      className: e,
      ref: t,
      onClick: u,
      ...m,
      children: [
        r,
        o,
        d && /* @__PURE__ */ a(V, { className: "bn-ml-auto bn-h-4 bn-w-4" })
      ]
    }
  );
}), mn = p((n, t) => {
  const { className: e, ...o } = n;
  c(o);
  const r = g();
  return /* @__PURE__ */ a(
    r.DropdownMenu.DropdownMenuSeparator,
    {
      className: e,
      ref: t
    }
  );
}), un = p((n, t) => {
  const { className: e, children: o, ...r } = n;
  c(r);
  const s = g();
  return /* @__PURE__ */ a(
    s.DropdownMenu.DropdownMenuLabel,
    {
      className: e,
      ref: t,
      children: o
    }
  );
}), pn = p((n, t) => {
  const {
    className: e,
    tabs: o,
    defaultOpenTab: r,
    openTab: s,
    setOpenTab: d,
    loading: u,
    // TODO: implement loader
    ...m
  } = n;
  c(m);
  const b = g();
  return /* @__PURE__ */ v(
    b.Tabs.Tabs,
    {
      className: i(e, "bn-bg-popover bn-p-2 bn-rounded-lg"),
      ref: t,
      value: s,
      defaultValue: r,
      onValueChange: d,
      children: [
        /* @__PURE__ */ a(b.Tabs.TabsList, { children: o.map((f) => /* @__PURE__ */ a(b.Tabs.TabsTrigger, { value: f.name, children: f.name }, f.name)) }),
        o.map((f) => /* @__PURE__ */ a(b.Tabs.TabsContent, { value: f.name, children: /* @__PURE__ */ a(b.Card.Card, { children: /* @__PURE__ */ a(b.Card.CardContent, { className: "bn-p-4", children: f.tabPanel }) }) }, f.name))
      ]
    }
  );
}), fn = p((n, t) => {
  const { className: e, children: o, ...r } = n;
  return c(r), /* @__PURE__ */ a(
    "div",
    {
      className: i(
        e,
        "bn-flex bn-flex-col bn-gap-2 bn-items-start bn-justify-center"
      ),
      ref: t,
      children: o
    }
  );
}), gn = p((n, t) => {
  const { className: e, value: o, placeholder: r, onKeyDown: s, onChange: d, ...u } = n;
  c(u);
  const m = g();
  return /* @__PURE__ */ a(
    m.Input.Input,
    {
      "data-test": "embed-input",
      className: i(e, "bn-w-80"),
      ref: t,
      value: o,
      placeholder: r,
      onKeyDown: s,
      onChange: d
    }
  );
}), hn = (n) => {
  const {
    children: t,
    opened: e,
    position: o,
    // unused
    ...r
  } = n;
  c(r);
  const s = g();
  return /* @__PURE__ */ a(s.Popover.Popover, { open: e, children: t });
}, vn = p(
  (n, t) => {
    const { children: e, ...o } = n;
    c(o);
    const r = g();
    return /* @__PURE__ */ a(r.Popover.PopoverTrigger, { ref: t, asChild: !0, children: e });
  }
), Nn = p((n, t) => {
  const { className: e, variant: o, children: r, ...s } = n;
  c(s);
  const d = g();
  return /* @__PURE__ */ a(
    d.Popover.PopoverContent,
    {
      sideOffset: 8,
      className: i(
        e,
        "bn-flex bn-flex-col bn-gap-2",
        o === "panel-popover" ? "bn-p-0 bn-border-none bn-shadow-none bn-max-w-none bn-w-fit" : ""
      ),
      ref: t,
      children: r
    }
  );
}), xn = p((n, t) => {
  const { className: e, children: o, ...r } = n;
  return c(r, !1), /* @__PURE__ */ a("div", { className: e, ref: t, ...r, children: o });
}), wn = p((n, t) => {
  const {
    className: e,
    children: o,
    icon: r,
    onClick: s,
    onDragEnd: d,
    onDragStart: u,
    draggable: m,
    label: b,
    ...f
  } = n;
  c(f, !1);
  const x = g();
  return /* @__PURE__ */ v(
    x.Button.Button,
    {
      variant: "ghost",
      className: i(e, "bn-text-gray-400"),
      ref: t,
      "aria-label": b,
      onClick: s,
      onDragStart: u,
      onDragEnd: d,
      draggable: m,
      ...f,
      children: [
        r,
        o
      ]
    }
  );
}), Cn = p((n, t) => {
  const { className: e, children: o, id: r, columns: s, ...d } = n;
  return c(d), /* @__PURE__ */ a(
    "div",
    {
      className: e,
      style: { gridTemplateColumns: `repeat(${s}, 1fr)` },
      ref: t,
      id: r,
      role: "grid",
      children: o
    }
  );
}), yn = p((n, t) => {
  const { className: e, children: o, columns: r, ...s } = n;
  return c(s), /* @__PURE__ */ a(
    "div",
    {
      className: e,
      style: { gridColumn: `1 / ${r + 1}` },
      ref: t,
      children: o
    }
  );
}), Sn = p((n, t) => {
  const { className: e, children: o, id: r, ...s } = n;
  return c(s), /* @__PURE__ */ a(
    "div",
    {
      id: r,
      role: "listbox",
      className: i(
        "bn-z-50 bn-min-w-[8rem] bn-overflow-auto bn-rounded-md bn-border bn-bg-popover bn-p-1 bn-text-popover-foreground bn-shadow-md data-[state=open]:bn-animate-in data-[state=closed]:bn-animate-out data-[state=closed]:bn-fade-out-0 data-[state=open]:bn-fade-in-0 data-[state=closed]:bn-zoom-out-95 data-[state=open]:bn-zoom-in-95 data-[side=bottom]:bn-slide-in-from-top-2 data-[side=left]:bn-slide-in-from-right-2 data-[side=right]:bn-slide-in-from-left-2 data-[side=top]:bn-slide-in-from-bottom-2",
        e
      ),
      ref: t,
      children: o
    }
  );
}), Tn = p((n, t) => {
  const { className: e, children: o, ...r } = n;
  return c(r), /* @__PURE__ */ a(
    "div",
    {
      className: i(
        "bn-relative bn-flex bn-cursor-default bn-select-none bn-items-center bn-rounded-sm bn-px-2 bn-py-1.5 bn-text-sm bn-outline-none bn-transition-colors focus:bn-bg-accent focus:bn-text-accent-foreground data-[disabled]:bn-pointer-events-none data-[disabled]:bn-opacity-50",
        e
      ),
      ref: t,
      children: /* @__PURE__ */ a("div", { children: o })
    }
  );
}), Mn = p((n, t) => {
  const e = g(), { className: o, item: r, isSelected: s, onClick: d, id: u, ...m } = n;
  c(m);
  const b = k(null);
  return L(() => {
    if (!b.current || !s)
      return;
    const f = P(
      b.current,
      document.querySelector(".bn-suggestion-menu, #ai-suggestion-menu")
      // TODO
    );
    f === "top" ? b.current.scrollIntoView(!0) : f === "bottom" && b.current.scrollIntoView(!1);
  }, [s]), /* @__PURE__ */ v(
    "div",
    {
      className: i(
        "bn-relative bn-flex bn-cursor-pointer bn-select-none bn-items-center bn-rounded-sm bn-px-2 bn-py-1.5 bn-text-sm bn-outline-none bn-transition-colors focus:bn-bg-accent focus:bn-text-accent-foreground data-[disabled]:bn-pointer-events-none data-[disabled]:bn-opacity-50",
        n.item.size === "small" ? "bn-gap-3 bn-py-1" : "",
        o
      ),
      ref: F([t, b]),
      id: u,
      onMouseDown: (f) => f.preventDefault(),
      onClick: d,
      role: "option",
      "aria-selected": s || void 0,
      children: [
        r.icon && /* @__PURE__ */ a(
          "div",
          {
            className: i(
              "bn-p-3",
              n.item.size === "small" ? "bn-p-0" : "",
              o
            ),
            "data-position": "left",
            children: r.icon
          }
        ),
        /* @__PURE__ */ v("div", { className: "bn-flex-1", children: [
          /* @__PURE__ */ a(
            "div",
            {
              className: i(
                "bn-text-base",
                n.item.size === "small" ? "bn-text-sm" : "",
                o
              ),
              children: r.title
            }
          ),
          /* @__PURE__ */ a(
            "div",
            {
              className: i(
                "bn-text-xs",
                n.item.size === "small" ? "bn-hidden" : "",
                o
              ),
              children: r.subtext
            }
          )
        ] }),
        r.badge && /* @__PURE__ */ a("div", { "data-position": "right", className: "bn-text-xs", children: /* @__PURE__ */ a(e.Badge.Badge, { variant: "secondary", children: r.badge }) })
      ]
    }
  );
}), Dn = p((n, t) => {
  const { className: e, children: o, ...r } = n;
  return c(r), /* @__PURE__ */ a(
    "div",
    {
      className: i("bn-px-2 bn-py-1.5 bn-text-sm bn-font-semibold", e),
      ref: t,
      children: o
    }
  );
}), In = p((n, t) => {
  const { className: e, children: o, ...r } = n;
  return c(r), /* @__PURE__ */ a("div", { className: e, ref: t, children: o });
}), Rn = p((n, t) => {
  const { className: e, children: o, onMouseDown: r, onClick: s, ...d } = n;
  c(d, !1);
  const u = g();
  return /* @__PURE__ */ a(
    u.Button.Button,
    {
      variant: "ghost",
      className: i(
        e,
        "bn-p-0 bn-h-full bn-w-full bn-text-gray-400",
        e != null && e.includes("bn-extend-button-add-remove-columns") ? "bn-ml-1" : "bn-mt-1",
        e != null && e.includes("bn-extend-button-editing") ? "bn-bg-accent bn-text-accent-foreground" : ""
      ),
      ref: t,
      onClick: s,
      onMouseDown: r,
      ...d,
      children: o
    }
  );
}), Pn = p((n, t) => {
  const {
    className: e,
    children: o,
    draggable: r,
    onDragStart: s,
    onDragEnd: d,
    style: u,
    label: m,
    ...b
  } = n;
  c(b, !1);
  const f = g();
  return /* @__PURE__ */ a(
    f.Button.Button,
    {
      variant: "ghost",
      className: i(e, "bn-p-0 bn-h-fit bn-w-fit bn-text-gray-400"),
      ref: t,
      "aria-label": m,
      draggable: r,
      onDragStart: s,
      onDragEnd: d,
      style: u,
      ...b,
      children: o
    }
  );
}), Fn = p(
  (n, t) => {
    const { className: e, children: o, onMouseEnter: r, onMouseLeave: s, ...d } = n;
    c(d);
    const u = g();
    return /* @__PURE__ */ a(u.Tooltip.TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ a(
      "div",
      {
        className: i(
          e,
          "bn-flex bn-gap-1 bn-p-1 bn-bg-popover bn-text-popover-foreground bn-border bn-rounded-lg bn-shadow-md"
        ),
        ref: t,
        onMouseEnter: r,
        onMouseLeave: s,
        children: o
      }
    ) });
  }
), Bn = p(
  (n, t) => {
    const {
      className: e,
      children: o,
      mainTooltip: r,
      secondaryTooltip: s,
      icon: d,
      isSelected: u,
      isDisabled: m,
      onClick: b,
      label: f,
      ...x
    } = n;
    c(x, !1);
    const w = g(), y = u === void 0 ? /* @__PURE__ */ v(
      w.Button.Button,
      {
        className: e,
        variant: "ghost",
        disabled: m,
        onClick: b,
        ref: t,
        "aria-label": f,
        ...x,
        children: [
          d,
          o
        ]
      }
    ) : /* @__PURE__ */ v(
      w.Toggle.Toggle,
      {
        className: i(
          e,
          "data-[state=open]:bg-accent data-[state=closed]:text-accent-foreground"
        ),
        "aria-label": f,
        onClick: b,
        pressed: u,
        disabled: m,
        "data-state": u ? "on" : "off",
        "data-disabled": m,
        ref: t,
        ...x,
        children: [
          d,
          o
        ]
      }
    );
    return r ? /* @__PURE__ */ v(w.Tooltip.Tooltip, { children: [
      /* @__PURE__ */ a(w.Tooltip.TooltipTrigger, { asChild: !0, children: y }),
      /* @__PURE__ */ v(
        w.Tooltip.TooltipContent,
        {
          className: "bn-flex bn-flex-col bn-items-center",
          children: [
            /* @__PURE__ */ a("span", { children: r }),
            s && /* @__PURE__ */ a("span", { children: s })
          ]
        }
      )
    ] }) : y;
  }
), kn = p((n, t) => {
  const { className: e, items: o, isDisabled: r, ...s } = n;
  c(s);
  const d = g(), u = (b) => /* @__PURE__ */ v("div", { className: "bn-flex bn-gap-1 bn-items-center", children: [
    b.icon,
    b.text
  ] }), m = o.filter((b) => b.isSelected)[0];
  return m ? /* @__PURE__ */ v(
    d.Select.Select,
    {
      value: m.text,
      onValueChange: (b) => {
        var f, x;
        return (x = (f = o.find((w) => w.text === b)).onClick) == null ? void 0 : x.call(f);
      },
      disabled: r,
      children: [
        /* @__PURE__ */ a(d.Select.SelectTrigger, { className: "bn-border-none", children: /* @__PURE__ */ a(d.Select.SelectValue, {}) }),
        /* @__PURE__ */ a(d.Select.SelectContent, { className: e, ref: t, children: o.map((b) => /* @__PURE__ */ a(
          d.Select.SelectItem,
          {
            disabled: b.isDisabled,
            value: b.text,
            children: /* @__PURE__ */ a(u, { ...b })
          },
          b.text
        )) })
      ]
    }
  ) : null;
}), Ln = p((n, t) => {
  const { className: e, children: o, onClick: r, label: s, ...d } = n;
  c(d);
  const u = g();
  return /* @__PURE__ */ a(
    u.Button.Button,
    {
      type: "submit",
      className: e,
      "aria-label": s,
      ref: t,
      onClick: r,
      children: o
    }
  );
}), zn = p((n, t) => {
  const { className: e, accept: o, value: r, placeholder: s, onChange: d, ...u } = n;
  c(u);
  const m = g();
  return /* @__PURE__ */ a(
    m.Input.Input,
    {
      type: "file",
      className: e,
      ref: t,
      accept: o,
      value: r ? r.name : void 0,
      onChange: async (b) => d == null ? void 0 : d(b.target.files[0]),
      placeholder: s
    }
  );
}), Vn = p((n, t) => {
  const { className: e, isSelected: o, onClick: r, item: s, id: d, ...u } = n;
  c(u);
  const m = k(null);
  return L(() => {
    if (!m.current || !o)
      return;
    const b = P(
      m.current,
      document.querySelector(".bn-grid-suggestion-menu")
    );
    b === "top" ? m.current.scrollIntoView(!0) : b === "bottom" && m.current.scrollIntoView(!1);
  }, [o]), /* @__PURE__ */ a(
    "div",
    {
      className: e,
      ref: F([t, m]),
      id: d,
      role: "option",
      onClick: r,
      "aria-selected": o || void 0,
      children: s.icon
    }
  );
}), En = p((n, t) => {
  const {
    className: e,
    children: o,
    // unused, using "dots" instead
    columns: r,
    ...s
  } = n;
  return c(s), /* @__PURE__ */ a(
    "div",
    {
      className: e,
      style: { gridColumn: `1 / ${r + 1}` },
      ref: t,
      children: o
    }
  );
}), jn = {
  Toolbar: {
    Root: Fn,
    Button: Bn,
    Select: kn
  },
  FilePanel: {
    Root: pn,
    Button: Ln,
    FileInput: zn,
    TabPanel: fn,
    TextInput: gn
  },
  SideMenu: {
    Root: xn,
    Button: wn
  },
  SuggestionMenu: {
    Root: Sn,
    Item: Mn,
    EmptyItem: Tn,
    Label: Dn,
    Loader: In
  },
  GridSuggestionMenu: {
    Root: Cn,
    Item: Vn,
    EmptyItem: yn,
    Loader: En
  },
  TableHandle: {
    Root: Pn,
    ExtendButton: Rn
  },
  Generic: {
    Form: {
      Root: rn,
      TextInput: an
    },
    Menu: {
      Root: dn,
      Trigger: bn,
      Dropdown: ln,
      Divider: mn,
      Label: un,
      Item: cn
    },
    Popover: {
      Root: hn,
      Trigger: vn,
      Content: Nn
    }
  }
}, Qn = (n) => {
  const { className: t, shadCNComponents: e, ...o } = n, r = B(() => ({
    ...on,
    ...e
  }), [e]);
  return /* @__PURE__ */ a(le.Provider, { value: r, children: /* @__PURE__ */ a(fe.Provider, { value: jn, children: /* @__PURE__ */ a(
    ge,
    {
      className: pe("bn-shadcn", t || ""),
      ...o
    }
  ) }) });
};
export {
  Qn as BlockNoteView,
  jn as components
};
//# sourceMappingURL=blocknote-shadcn.js.map
