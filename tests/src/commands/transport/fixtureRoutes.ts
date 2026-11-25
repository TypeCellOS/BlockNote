import type { Route } from "@playwright/test";

type RouteHandler = (route: Route) => Promise<void>;
type FixtureRoute = { url: string; handler: RouteHandler };
type RouteTarget = {
  route(url: string, handler: RouteHandler): Promise<unknown>;
  unroute(url: string, handler: RouteHandler): Promise<void>;
};
type RouteBatch = { complete: boolean; routes: FixtureRoute[] };

export function createFixtureRouteMock(
  prepare: () => FixtureRoute[] | Promise<FixtureRoute[]>,
) {
  const batches = new WeakMap<RouteTarget, RouteBatch>();
  const pending = new WeakMap<RouteTarget, Promise<void>>();

  async function remove(target: RouteTarget, batch: RouteBatch) {
    batch.complete = false;
    const errors: unknown[] = [];
    for (let i = batch.routes.length - 1; i >= 0; i--) {
      const { url, handler } = batch.routes[i];
      try {
        await target.unroute(url, handler);
        batch.routes.splice(i, 1);
      } catch (error) {
        // Try the rest, and retain unsuccessful removals for a retry.
        errors.push(error);
      }
    }
    if (!batch.routes.length) {
      batches.delete(target);
    }
    if (errors.length) {
      throw new AggregateError(errors, "Could not remove fixture routes");
    }
  }

  async function update(target: RouteTarget, action: "install" | "remove") {
    const existing = batches.get(target);
    if (action === "install" && existing?.complete) {
      return;
    }
    if (existing) {
      await remove(target, existing);
    }
    if (action === "remove") {
      return;
    }

    const routes = await prepare();
    const batch: RouteBatch = { complete: false, routes: [] };
    batches.set(target, batch);
    try {
      for (const entry of routes) {
        // Playwright records the handler before updating interception patterns.
        // Even a rejected registration may therefore need to be removed.
        batch.routes.push(entry);
        await target.route(entry.url, entry.handler);
      }
      batch.complete = true;
    } catch (installError) {
      try {
        await remove(target, batch);
      } catch (rollbackError) {
        throw new AggregateError(
          [installError, rollbackError],
          "Could not install or roll back fixture routes",
        );
      }
      throw installError;
    }
  }

  return async function mockFixtureRoutes(
    { page, context }: { page?: RouteTarget; context: RouteTarget },
    action: "install" | "remove",
  ) {
    // Vitest's test iframe belongs to this page, so other pages in the context
    // need not inherit these interceptions.
    const target = page ?? context;
    // Keep an overlapping teardown from racing the batch's installation.
    const previous = pending.get(target) ?? Promise.resolve();
    const next = previous.then(
      () => update(target, action),
      () => update(target, action),
    );
    pending.set(target, next);
    try {
      await next;
    } finally {
      if (pending.get(target) === next) {
        pending.delete(target);
      }
    }
  };
}
