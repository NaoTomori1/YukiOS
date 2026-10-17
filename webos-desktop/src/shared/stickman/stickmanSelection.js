import { $$ } from "../../framework.js";
export function getShardNodes() {
  let nodes = [];
  try {
    nodes = Array.from($$(".stk-layer .stk-shard") || []);
  } catch {}
  return nodes.filter((node) => {
    try {
      return !!node && node.isConnected;
    } catch {
      return false;
    }
  });
}
export function setShardSelected(node, on) {
  try {
    if (!node) return;
    node.classList.toggle("stk-selected", !!on);
  } catch {}
}
export function clearShardSelection() {
  try {
    const nodes = getShardNodes();
    for (let i = 0; i < nodes.length; i++) setShardSelected(nodes[i], false);
  } catch {}
}
export function getSelectedShards() {
  try {
    return getShardNodes().filter((node) => {
      try {
        return node.classList.contains("stk-selected");
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}
