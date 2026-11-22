type TweenBuilder = () => cc.Tween;

export class AnimationUtil {
    public static readonly SELECTED_SCALE: number = 1.08;
    public static readonly SELECTED_DURATION: number = 0.12;

    private static _pending: WeakMap<cc.Node, () => void> = new WeakMap();

    public static IsPending(node: cc.Node): boolean {
        return !!node && AnimationUtil._pending.has(node);
    }

    public static Begin(node: cc.Node, resolve: () => void): void {
        if (!node) {
            return;
        }
        AnimationUtil.Finish(node);
        AnimationUtil._pending.set(node, resolve);
    }

    public static Finish(node: cc.Node): void {
        if (!node) {
            return;
        }
        const resolve = AnimationUtil._pending.get(node);
        AnimationUtil._pending.delete(node);
        if (resolve) {
            resolve();
        }
    }

    public static Cancel(node: cc.Node): void {
        if (!node) {
            return;
        }
        if (node.isValid) {
            cc.Tween.stopAllByTarget(node);
        }
        AnimationUtil.Finish(node);
    }

    public static Play(node: cc.Node, build: TweenBuilder): Promise<void> {
        AnimationUtil.Cancel(node);
        return new Promise<void>((resolve) => {
            AnimationUtil.Begin(node, resolve);
            build().call(() => AnimationUtil.Finish(node)).start();
        });
    }

    public static Select(node: cc.Node, selected: boolean): void {
        if (!node) {
            return;
        }
        AnimationUtil.Cancel(node);
        cc.tween(node)
            .to(AnimationUtil.SELECTED_DURATION, { scale: selected ? AnimationUtil.SELECTED_SCALE : 1 }, { easing: 'quadOut' })
            .start();
    }

    public static Shake(node: cc.Node, offset: number, duration: number): cc.Tween {
        const startX = node.x;
        const step = duration / 3;
        return cc.tween(node)
            .by(step, { position: cc.v3(offset, 0, 0) })
            .by(step, { position: cc.v3(-offset * 2, 0, 0) })
            .by(step, { position: cc.v3(offset, 0, 0) })
            .call(() => {
                node.x = startX;
            });
    }

    public static PlayShake(node: cc.Node, offset: number, duration: number): Promise<void> {
        return AnimationUtil.Play(node, () => AnimationUtil.Shake(node, offset, duration));
    }
}
