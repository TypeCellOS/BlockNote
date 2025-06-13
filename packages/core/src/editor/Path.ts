import type { Block } from "../blocks/defaultBlocks.js";
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../schema/index.js";
import { type Path, toId } from "./Location.js";

/**
 * TODO this is mostly AI slop, but it proves the point of having a class
 * which includes a number of methods which can be used for Path operations.
 */

export class PathTools<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
> {
  constructor(private editor: { document: Block<BSchema, I, S>[] }) {}

  private get document() {
    return this.editor.document;
  }

  /**
   * Get the block(s) at the specified path
   */
  public getBlockAtPath(path: Path): Block<BSchema, I, S>[] {
    if (!path.length) {
      return this.document;
    }

    let currentBlocks = this.document;

    for (let i = 0; i < path.length; i++) {
      const id = toId(path[i]);
      const block = currentBlocks.find((block) => block.id === id);

      if (!block) {
        return [];
      }

      if (!block.children.length) {
        // If we're at the last path segment, return just the block
        if (i === path.length - 1) {
          return [block];
        }
        // If we have more path segments but no children, path is invalid
        return [];
      }

      currentBlocks = block.children;
    }

    return currentBlocks;
  }

  /**
   * Get a single block at the specified path
   */
  public getBlock(path: Path): Block<BSchema, I, S> | undefined {
    const blocks = this.getBlockAtPath(path);
    return blocks.length > 0 ? blocks[0] : undefined;
  }

  /**
   * Get a list of ancestor paths for a given path.
   * The paths are sorted from shallowest to deepest ancestor.
   */
  public getAncestors(path: Path, options: { reverse?: boolean } = {}): Path[] {
    const ancestors: Path[] = [];
    let currentPath: Path = [...path];

    while (currentPath.length > 0) {
      currentPath = currentPath.slice(0, -1);
      ancestors.push([...currentPath]);
    }

    return options.reverse ? ancestors.reverse() : ancestors;
  }

  /**
   * Get the common ancestor path of two paths.
   */
  public getCommonPath(path: Path, another: Path): Path {
    const common: Path = [];
    const minLength = Math.min(path.length, another.length);

    for (let i = 0; i < minLength; i++) {
      if (toId(path[i]) === toId(another[i])) {
        common.push(path[i]);
      } else {
        break;
      }
    }

    return common;
  }

  /**
   * Compare two paths based on their position in the document.
   * Returns -1 if path comes before another, 0 if they're the same, 1 if path comes after another.
   */
  public comparePaths(path: Path, another: Path): -1 | 0 | 1 {
    // First check common ancestry
    const minLength = Math.min(path.length, another.length);
    for (let i = 0; i < minLength; i++) {
      const pathId = toId(path[i]);
      const anotherId = toId(another[i]);

      if (pathId !== anotherId) {
        // Need to find the actual position in the document
        const parentPath = i === 0 ? [] : path.slice(0, i);
        const parentBlocks = this.getBlockAtPath(parentPath);

        // Find the indices of both blocks in their parent
        const pathIndex = parentBlocks.findIndex(
          (block) => block.id === pathId,
        );
        const anotherIndex = parentBlocks.findIndex(
          (block) => block.id === anotherId,
        );

        if (pathIndex < anotherIndex) {
          return -1;
        }
        if (pathIndex > anotherIndex) {
          return 1;
        }
      }
    }

    // If all common ancestors are the same, shorter path comes first
    if (path.length < another.length) {
      return -1;
    }
    if (path.length > another.length) {
      return 1;
    }

    // Paths are identical
    return 0;
  }

  /**
   * Get a list of paths at every level down to a path.
   */
  public getLevels(path: Path, options: { reverse?: boolean } = {}): Path[] {
    const levels: Path[] = [];
    let currentPath: Path = [];

    for (const segment of path) {
      currentPath = [...currentPath, segment];
      levels.push([...currentPath]);
    }

    return options.reverse ? levels.reverse() : levels;
  }

  /**
   * Given a path, gets the path to the next sibling node.
   */
  public getNextPath(path: Path): Path | null {
    if (path.length === 0) {
      return null;
    }

    const parentPath = path.slice(0, -1);
    const parentBlocks = this.getBlockAtPath(parentPath);
    const currentId = toId(path[path.length - 1]);

    // Find the current block's index in its parent
    const currentIndex = parentBlocks.findIndex(
      (block) => block.id === currentId,
    );

    // If it's the last child or not found, there's no next sibling
    if (currentIndex === -1 || currentIndex === parentBlocks.length - 1) {
      return null;
    }

    // Return the path to the next sibling
    return [...parentPath, parentBlocks[currentIndex + 1].id];
  }

  /**
   * Given a path, return a new path referring to the parent node above it.
   */
  public getParentPath(path: Path): Path {
    if (path.length === 0) {
      throw new Error("Cannot get parent of root path");
    }
    return path.slice(0, -1);
  }

  /**
   * Given a path, get the path to the previous sibling node.
   */
  public getPreviousPath(path: Path): Path | null {
    if (path.length === 0) {
      return null;
    }

    const parentPath = path.slice(0, -1);
    const parentBlocks = this.getBlockAtPath(parentPath);
    const currentId = toId(path[path.length - 1]);

    // Find the current block's index in its parent
    const currentIndex = parentBlocks.findIndex(
      (block) => block.id === currentId,
    );

    // If it's the first child or not found, there's no previous sibling
    if (currentIndex <= 0) {
      return null;
    }

    // Return the path to the previous sibling
    return [...parentPath, parentBlocks[currentIndex - 1].id];
  }

  /**
   * Given two paths, one that is an ancestor to the other, returns the relative path.
   */
  public getRelativePath(path: Path, ancestor: Path): Path {
    if (!this.isAncestor(ancestor, path)) {
      throw new Error("Ancestor path is not actually an ancestor");
    }
    return path.slice(ancestor.length);
  }

  /**
   * Check if a path ends after one of the indexes in another.
   */
  public endsAfter(path: Path, another: Path): boolean {
    return this.comparePaths(path, another) === 1;
  }

  /**
   * Check if a path ends at one of the indexes in another.
   */
  public endsAt(path: Path, another: Path): boolean {
    return this.equals(path, another);
  }

  /**
   * Check if a path ends before one of the indexes in another.
   */
  public endsBefore(path: Path, another: Path): boolean {
    return this.comparePaths(path, another) === -1;
  }

  /**
   * Check if a path is exactly equal to another.
   */
  public equals(path: Path, another: Path): boolean {
    return (
      path.length === another.length &&
      path.every((segment, i) => toId(segment) === toId(another[i]))
    );
  }

  /**
   * Check if the path of previous sibling node exists.
   */
  public hasPrevious(path: Path): boolean {
    return this.getPreviousPath(path) !== null;
  }

  /**
   * Check if a path is after another.
   */
  public isAfter(path: Path, another: Path): boolean {
    return this.comparePaths(path, another) === 1;
  }

  /**
   * Check if a path is an ancestor of another.
   */
  public isAncestor(path: Path, another: Path): boolean {
    return (
      path.length < another.length &&
      path.every((segment, i) => toId(segment) === toId(another[i]))
    );
  }

  /**
   * Check if a path is before another.
   */
  public isBefore(path: Path, another: Path): boolean {
    return this.comparePaths(path, another) === -1;
  }

  /**
   * Check if a path is a child of another.
   */
  public isChild(path: Path, another: Path): boolean {
    return (
      path.length === another.length + 1 &&
      another.every((segment, i) => toId(segment) === toId(path[i]))
    );
  }

  /**
   * Check if a path is equal to or an ancestor of another.
   */
  public isCommon(path: Path, another: Path): boolean {
    return this.equals(path, another) || this.isAncestor(path, another);
  }

  /**
   * Check if a path is a descendant of another.
   */
  public isDescendant(path: Path, another: Path): boolean {
    return (
      path.length > another.length &&
      another.every((segment, i) => toId(segment) === toId(path[i]))
    );
  }

  /**
   * Check if a path is the parent of another.
   */
  public isParent(path: Path, another: Path): boolean {
    return (
      path.length + 1 === another.length &&
      path.every((segment, i) => toId(segment) === toId(another[i]))
    );
  }

  /**
   * Check if a path is a sibling of another.
   */
  public isSibling(path: Path, another: Path): boolean {
    if (path.length !== another.length) {
      return false;
    }
    const parent = path.slice(0, -1);
    const otherParent = another.slice(0, -1);
    return this.equals(parent, otherParent);
  }
}

/**
 * Check if a value implements the Path interface.
 */
export function isPath(value: any): value is Path {
  return (
    Array.isArray(value) &&
    value.every(
      (segment) =>
        typeof segment === "string" ||
        (typeof segment === "object" && "id" in segment),
    )
  );
}
