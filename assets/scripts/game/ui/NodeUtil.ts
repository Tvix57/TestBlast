export class NodeUtil {
    public static Destroy(node: cc.Node | null): void {
        if (!node || !node.isValid) {
            return;
        }
        if (node.parent) {
            node.removeFromParent();
        }
        node.destroy();
    }
}
