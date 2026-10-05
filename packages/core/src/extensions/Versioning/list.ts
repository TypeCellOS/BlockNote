import type { Store } from "../../util/Store.js";
import type {
  LoadedVersioningList,
  VersioningEndpoints,
  VersioningState,
  VersioningResult,
  VersionHistoryFetchError,
} from "./types.js";

type ListResult = VersioningResult<
  LoadedVersioningList,
  VersionHistoryFetchError
>;

/** Catch only the backend call, not list processing or store updates. */
async function fetchHistory(
  endpoints: VersioningEndpoints,
): Promise<
  VersioningResult<
    Awaited<ReturnType<VersioningEndpoints["list"]>>,
    VersionHistoryFetchError
  >
> {
  try {
    return { value: await endpoints.list() };
  } catch (cause) {
    return { error: { type: "fetch-failed", cause } };
  }
}

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
    promise: Promise<ListResult>;
  } | null = null;

  /**
   * Fetch the list, joining an in-flight fetch rather than duplicating it.
   * Listing never touches `view`: the preview owns that.
   */
  function refresh(): Promise<ListResult> {
    if (latestRequest?.pending) {
      return latestRequest.promise;
    }

    const promise = fetchHistory(endpoints).then((fetched): ListResult => {
      if (fetched.error) {
        store.setState((state) => ({ ...state, listError: fetched.error }));
        return fetched;
      }
      const { current, snapshots } = fetched.value;
      const result: LoadedVersioningList = {
        loaded: true as const,
        current,
        snapshots: [...snapshots].sort((a, b) => b.createdAt - a.createdAt),
      };
      store.setState((state) => ({
        ...state,
        list: result,
        listError: undefined,
      }));
      return { value: result };
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
