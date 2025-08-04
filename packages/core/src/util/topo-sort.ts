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
