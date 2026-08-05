import { Component, ErrorInfo, ReactNode } from "react";

/**
 * Catches render/setup errors from a scenario so one crashing case (e.g. a
 * concurrent table merge that hits prosemirror-tables' `fixTables` bug) shows an
 * inline message instead of white-screening the whole gallery. Reset via `key`.
 */
export class ScenarioErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("Scenario crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 16,
            border: "1px solid #e5484d",
            borderRadius: 8,
            background: "#fff5f5",
            color: "#c01c28",
          }}
        >
          <strong>This scenario crashed.</strong>
          <pre style={{ whiteSpace: "pre-wrap", marginTop: 8, fontSize: 12 }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
