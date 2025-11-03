/**
 * Instead of depending on the NPM package, we vendor this file from https://github.com/n1ru4l/toposort/blob/main/src/toposort.ts (MIT)
 *
 * There was a recent publish, despite not having been updated in 2 years, which is suspicious.
 *
 * This file is also simple enough that we can maintain it ourselves.
 */

export type DirectedAcyclicGraph = Map<string, Iterable<string>>;
export type DependencyGraph = DirectedAcyclicGraph;

export type TaskList = Array<Set<string>>;

// Add more specific types for better type safety
export type NodeId = string;
export type DependencyMap = Map<NodeId, Set<NodeId>>;

export function toposort(dag: DirectedAcyclicGraph): TaskList {
  const inDegrees = countInDegrees(dag);

  let { roots, nonRoots } = getRootsAndNonRoots(inDegrees);

  const sorted: TaskList = [];

  while (roots.size) {
    sorted.push(roots);

    const newRoots = new Set<NodeId>();
    for (const root of roots) {
      const dependents = dag.get(root);
      if (!dependents) {
        // Handle case where node has no dependents
        continue;
      }

      for (const dependent of dependents) {
        const currentDegree = inDegrees.get(dependent);
        if (currentDegree === undefined) {
          // Handle case where dependent node is not in inDegrees
          continue;
        }

        const newDegree = currentDegree - 1;
        inDegrees.set(dependent, newDegree);

        if (newDegree === 0) {
          newRoots.add(dependent);
        }
      }
    }

    roots = newRoots;
  }
  nonRoots = getRootsAndNonRoots(inDegrees).nonRoots;

  if (nonRoots.size) {
    throw new Error(
      `Cycle(s) detected; toposort only works on acyclic graphs. Cyclic nodes: ${Array.from(nonRoots).join(", ")}`,
    );
  }

  return sorted;
}

export function toposortReverse(deps: DependencyGraph): TaskList {
  const dag = reverse(deps);
  return toposort(dag);
}

type InDegrees = Map<NodeId, number>;

function countInDegrees(dag: DirectedAcyclicGraph): InDegrees {
  const counts: InDegrees = new Map();

  for (const [vx, dependents] of dag.entries()) {
    // Initialize count for current node if not present
    if (!counts.has(vx)) {
      counts.set(vx, 0);
    }

    for (const dependent of dependents) {
      const currentCount = counts.get(dependent) ?? 0;
      counts.set(dependent, currentCount + 1);
    }
  }

  return counts;
}

function getRootsAndNonRoots(counts: InDegrees) {
  const roots = new Set<NodeId>();
  const nonRoots = new Set<NodeId>();

  for (const [id, deg] of counts.entries()) {
    if (deg === 0) {
      roots.add(id);
    } else {
      nonRoots.add(id);
    }
  }

  return { roots, nonRoots };
}

function reverse(deps: DirectedAcyclicGraph): DependencyGraph {
  const reversedDeps: DependencyMap = new Map();

  for (const [name, dependsOn] of deps.entries()) {
    // Ensure the source node exists in the reversed map
    if (!reversedDeps.has(name)) {
      reversedDeps.set(name, new Set());
    }

    for (const dependsOnName of dependsOn) {
      if (!reversedDeps.has(dependsOnName)) {
        reversedDeps.set(dependsOnName, new Set());
      }
      reversedDeps.get(dependsOnName)!.add(name);
    }
  }

  return reversedDeps;
}

export function createDependencyGraph(): DependencyMap {
  return new Map();
}

export function addDependency(
  graph: DependencyMap,
  from: NodeId,
  to: NodeId,
): DependencyMap {
  if (!graph.has(from)) {
    graph.set(from, new Set());
  }
  graph.get(from)!.add(to);
  return graph;
}

export function removeDependency(
  graph: DependencyMap,
  from: NodeId,
  to: NodeId,
): boolean {
  const dependents = graph.get(from);
  if (!dependents) {
    return false;
  }
  return dependents.delete(to);
}

export function hasDependency(
  graph: DependencyMap,
  from: NodeId,
  to: NodeId,
): boolean {
  const dependents = graph.get(from);
  return dependents ? dependents.has(to) : false;
}

/**
 * Sorts a list of items by their dependencies
 * @returns A function which can retrieve the priority of an item
 */
export function sortByDependencies(
  items: { key: string; runsBefore?: ReadonlyArray<string> }[],
) {
  const dag = createDependencyGraph();

  for (const item of items) {
    if (Array.isArray(item.runsBefore) && item.runsBefore.length > 0) {
      item.runsBefore.forEach((runBefore) => {
        addDependency(dag, item.key, runBefore);
      });
    } else {
      addDependency(dag, "default", item.key);
    }
  }
  const sortedSpecs = toposortReverse(dag);
  const defaultIndex = sortedSpecs.findIndex((set) => set.has("default"));

  /**
   * The priority of an item is described relative to the "default" (an arbitrary string which can be used as the reference)
   *
   * Since items are topologically sorted, we can see what their relative position is to the "default"
   * Each layer away from the default is 10 priority points (arbitrarily chosen)
   * The default is fixed at 101 (1 point higher than any tiptap extension, giving priority to custom blocks than any defaults)
   *
   * This is a bit of a hack, but it's a simple way to ensure that custom items are always rendered with higher priority than default items
   * and that custom items are rendered in the order they are defined in the list
   */

  /**
   * Retrieves the priority of an item based on its position in the topologically sorted list
   * @param key - The key of the item to get the priority of
   * @returns The priority of the item
   */
  return (key: string) => {
    const index = sortedSpecs.findIndex((set) => set.has(key));
    // the default index should map to 101
    // one before the default index is 91
    // one after is 111
    return 91 + (index + defaultIndex) * 10;
  };
}
