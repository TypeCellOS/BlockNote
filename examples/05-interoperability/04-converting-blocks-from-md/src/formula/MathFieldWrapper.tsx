import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import "mathlive";

// Web component <math-field> is registered as a side-effect of importing
// 'mathlive'. TypeScript doesn't know about custom elements, so declare a
// permissive JSX intrinsic here (local — not global).
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "math-virtual-keyboard-policy"?: "auto" | "manual" | "sandboxed";
          "read-only"?: string;
        },
        HTMLElement
      >;
    }
  }
}

export type MathFieldHandle = {
  insert(latex: string): void;
  focus(): void;
  getValue(): string;
  setValue(v: string): void;
};

export type MathFieldWrapperProps = {
  value: string;
  onChange(v: string): void;
  virtualKeyboard?: boolean;
  readOnly?: boolean;
  style?: CSSProperties;
  className?: string;
};

export function sanitizePlaceholders(latex: string): string {
  // Remove unfilled MathLive placeholders like \placeholder{} or \placeholder{...}
  // so downstream KaTeX rendering doesn't fail.
  return latex.replace(/\\placeholder\{[^}]*\}/g, "");
}

export const MathFieldWrapper = forwardRef<
  MathFieldHandle,
  MathFieldWrapperProps
>(function MathFieldWrapper(
  {
    value,
    onChange,
    virtualKeyboard = false,
    readOnly = false,
    style,
    className,
  },
  ref,
) {
  const mfRef = useRef<
    | (HTMLElement & {
        value: string;
        executeCommand: (cmd: any) => void;
        focus: () => void;
      })
    | null
  >(null);

  useImperativeHandle(
    ref,
    () => ({
      insert(latex) {
        const mf = mfRef.current;
        if (!mf) return;
        mf.executeCommand([
          "insert",
          latex,
          { selectionMode: "placeholder", focus: true },
        ]);
      },
      focus() {
        mfRef.current?.focus();
      },
      getValue() {
        return mfRef.current?.value ?? "";
      },
      setValue(v) {
        const mf = mfRef.current;
        if (mf && mf.value !== v) mf.value = v;
      },
    }),
    [],
  );

  // Two-way sync: push external value → math-field when it drifts.
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    if (mf.value !== value) mf.value = value;
  }, [value]);

  // Subscribe to math-field's `input` event → notify parent.
  useEffect(() => {
    const mf = mfRef.current;
    if (!mf) return;
    const onInput = (e: Event) => {
      const target = e.target as HTMLElement & { value: string };
      onChange(target.value);
    };
    mf.addEventListener("input", onInput);
    return () => mf.removeEventListener("input", onInput);
  }, [onChange]);

  return (
    <math-field
      ref={mfRef as any}
      math-virtual-keyboard-policy={virtualKeyboard ? "auto" : "manual"}
      read-only={readOnly ? "" : undefined}
      style={style}
      className={className}
    />
  );
});
