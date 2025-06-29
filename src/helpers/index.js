/**
 * Recursively search for node by ID and build path
 * @param {string} id - target node ID
 * @param {Array} nodes - list of nodes to search
 * @param {Array} path - accumulated path of IDs
 * @returns {{node: Object, path: string[]} | null}
 */
export function findNodeAndPath({id, nodes, path = []}) {
    for (const node of nodes) {
        // if we found the node, return it with full path
        if (node.id === id) return { node, path: [...path, node.id] };
        // otherwise, search in children recursively
        if (node.children) {
            const res = findNodeAndPath({id, nodes: node.children, path: [...path, node.id]});
            if (res) {
                return res
            }
        }
    }
    // not found
    return null;
}