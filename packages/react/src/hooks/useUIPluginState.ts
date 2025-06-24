import { useEffect, useState } from "react";

export function useUIPluginState<State>(
  onUpdate: (callback: (state: State) => void) => void,
): State | undefined {
  const [state, setState] = useState<State>();

  useEffect(() => {
    return onUpdate((state) => {
      setState({ ...state });
    });
  }, [onUpdate]);

  return state;
}
