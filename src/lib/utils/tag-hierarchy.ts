/**
 * Tag Hierarchy Utility
 * Parses flat tags with slash notation into hierarchical tree structure
 *
 * Example:
 * Input: ['dev/react', 'dev/typescript', 'finance', 'dev']
 * Output:
 *   dev (1 direct, 3 total)
 *     ├─ react (1)
 *     └─ typescript (1)
 *   finance (1)
 */

export interface TagTreeNode {
  /** Display name (just the segment, e.g., "react" not "dev/react") */
  name: string;
  /** Full path including parents (e.g., "dev/react") */
  fullPath: string;
  /** Number of cards with exactly this tag */
  count: number;
  /** Total cards including all descendant tags */
  totalCount: number;
  /** True if no cards have this exact tag (only exists because children exist) */
  isVirtual: boolean;
  /** Nested child nodes */
  children: TagTreeNode[];
}

export interface TagStats {
  /** All unique tags */
  uniqueTags: string[];
  /** Count of cards per tag */
  tagCounts: Record<string, number>;
  /** Hierarchical tree structure */
  tree: TagTreeNode[];
  /** Total number of tags */
  totalTags: number;
}

/**
 * Build a hierarchical tree from flat tag strings
 *
 * @param tags - Array of tags from all cards (may contain duplicates)
 * @returns TagStats with tree structure and counts
 */
export function buildTagStats(tags: string[]): TagStats {
  // Count occurrences of each tag
  const tagCounts: Record<string, number> = {};
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed) {
      tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1;
    }
  }

  const uniqueTags = Object.keys(tagCounts).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  const tree = buildTagTree(uniqueTags, tagCounts);

  return {
    uniqueTags,
    tagCounts,
    tree,
    totalTags: uniqueTags.length,
  };
}

/**
 * Build tree structure from unique tags
 */
function buildTagTree(
  uniqueTags: string[],
  tagCounts: Record<string, number>
): TagTreeNode[] {
  // Map to track nodes by full path
  const nodeMap = new Map<string, TagTreeNode>();

  // First pass: create nodes for all actual tags
  for (const tag of uniqueTags) {
    const segments = tag.split('/').filter(Boolean);
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      if (!nodeMap.has(currentPath)) {
        const isExactTag = currentPath === tag;
        nodeMap.set(currentPath, {
          name: segment,
          fullPath: currentPath,
          count: isExactTag ? (tagCounts[tag] || 0) : 0,
          totalCount: 0, // Will calculate in second pass
          isVirtual: !isExactTag && !tagCounts[currentPath],
          children: [],
        });
      } else if (currentPath === tag) {
        // Update existing node if this is the exact tag
        const node = nodeMap.get(currentPath)!;
        node.count = tagCounts[tag] || 0;
        node.isVirtual = false;
      }
    }
  }

  // Second pass: build parent-child relationships
  for (const [path, node] of nodeMap) {
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash > 0) {
      const parentPath = path.substring(0, lastSlash);
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  // Third pass: calculate total counts (including children)
  function calculateTotalCount(node: TagTreeNode): number {
    let total = node.count;
    for (const child of node.children) {
      total += calculateTotalCount(child);
    }
    node.totalCount = total;
    return total;
  }

  // Get root nodes and calculate totals
  const roots: TagTreeNode[] = [];
  for (const [path, node] of nodeMap) {
    if (!path.includes('/')) {
      roots.push(node);
    }
  }

  // Sort children alphabetically
  function sortChildren(node: TagTreeNode) {
    node.children.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
    for (const child of node.children) {
      sortChildren(child);
    }
  }

  for (const root of roots) {
    calculateTotalCount(root);
    sortChildren(root);
  }

  // Sort roots alphabetically
  roots.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return roots;
}

/**
 * Flatten a tree back into a sorted list of all paths
 * Useful for displaying in a flat list with indentation
 */
export function flattenTree(
  tree: TagTreeNode[],
  level = 0
): Array<{ node: TagTreeNode; level: number }> {
  const result: Array<{ node: TagTreeNode; level: number }> = [];

  for (const node of tree) {
    result.push({ node, level });
    result.push(...flattenTree(node.children, level + 1));
  }

  return result;
}

/**
 * Find a node in the tree by full path
 */
export function findNodeByPath(
  tree: TagTreeNode[],
  path: string
): TagTreeNode | null {
  for (const node of tree) {
    if (node.fullPath === path) {
      return node;
    }
    const found = findNodeByPath(node.children, path);
    if (found) {
      return found;
    }
  }
  return null;
}

/**
 * Get all descendant paths for a given path
 * Useful for filtering cards by a parent tag (includes all children)
 */
export function getDescendantPaths(
  tree: TagTreeNode[],
  path: string
): string[] {
  const node = findNodeByPath(tree, path);
  if (!node) {
    return [path];
  }

  const paths: string[] = [path];

  function collectPaths(n: TagTreeNode) {
    for (const child of n.children) {
      paths.push(child.fullPath);
      collectPaths(child);
    }
  }

  collectPaths(node);
  return paths;
}

/**
 * Get parent path from a tag path
 * Returns null if already at root level
 */
export function getParentPath(path: string): string | null {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash <= 0) {
    return null;
  }
  return path.substring(0, lastSlash);
}

/**
 * Get the leaf name from a tag path
 */
export function getTagName(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash >= 0 ? path.substring(lastSlash + 1) : path;
}
