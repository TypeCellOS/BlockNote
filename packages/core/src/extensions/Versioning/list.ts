import type { Store } from "../../util/Store.js";
import type {
  LoadedVersioningList,
  VersioningEndpoints,
  VersioningState,
} from "./types.js";

/**
 * The list half of the versioning store. Owns the `list` field and publishes
 * whether a fetch is in flight (`listing`) so the busy status can be derived
 * on read.
 */
export function createListSession({
  store,
  endpoints,
}: {
  store: Store<VersioningState>;
  endpoints: VersioningEndpoints;
}) {
  // At most one fetch is ever in flight: a call made while one is pending joins
  // it rather than hitting the backend again. Listing is a short-lived GET and
  // while it is pending the UI shows a loading state, so no mutation can land
  // in that window. With no second concurrent fetch there is no out-of-order
  // write and no need for a counter — this object is both the join key and the
  // busy flag.
  let latestRequest: {
    pending: boolean;
    promise: Promise<LoadedVersioningList>;
  } | null = null;

  /**
   * Fetch the list, joining an in-flight fetch rather than duplicating it.
   * Listing never touches `view`: the preview owns that.
   */
  function refresh(): Promise<LoadedVersioningList> {
    if (latestRequest?.pending) {
      return latestRequest.promise;
    }

    const promise = endpoints.list().then(({ current, snapshots }) => {
      const result: LoadedVersioningList = {
        loaded: true as const,
        current,
        snapshots: [...snapshots].sort((a, b) => b.createdAt - a.createdAt),
      };
      store.setState((state) => ({ ...state, list: result }));
      return result;
    });

    const entry = { pending: true, promise };
    latestRequest = entry;
    store.setState((state) => ({ ...state, listing: true }));

    const settle = () => {
      // Nothing can supersede `entry` while it is pending: `refresh` joins the
      // in-flight fetch instead of starting another, so this always applies.
      entry.pending = false;
      store.setState((state) => ({ ...state, listing: false }));
    };
    promise.then(settle, settle);

    return promise;
  }

  return { refresh };
}
