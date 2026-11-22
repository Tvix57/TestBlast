import { AnimationUtil } from '../assets/scripts/game/ui/AnimationUtil';

/** Фейк ноды: AnimationUtil читает только `isValid` и `x`, остальное — контракт cc.Node. */
function fakeNode(isValid: boolean = true): any {
    return { isValid: isValid, x: 10, y: 20 };
}

/** Твин, который «никогда не завершается»: проверяем отмену промиса. */
function neverFinishingTween(): any {
    const tween: any = {
        call: () => tween,
        start: () => tween
    };
    return tween;
}

describe('AnimationUtil: один активный промис анимации узла', () => {
    it('новый Begin завершает предыдущий промис', () => {
        const node = fakeNode();
        const first = jest.fn();
        const second = jest.fn();

        AnimationUtil.Begin(node, first);
        AnimationUtil.Begin(node, second);

        expect(first).toHaveBeenCalledTimes(1);
        expect(second).not.toHaveBeenCalled();
        expect(AnimationUtil.IsPending(node)).toBe(true);
    });

    it('Finish завершает ровно один раз и очищает состояние', () => {
        const node = fakeNode();
        const done = jest.fn();

        AnimationUtil.Begin(node, done);
        AnimationUtil.Finish(node);
        AnimationUtil.Finish(node);

        expect(done).toHaveBeenCalledTimes(1);
        expect(AnimationUtil.IsPending(node)).toBe(false);
    });

    it('Play резолвится, когда твин завершился', async () => {
        const node = fakeNode();

        await expect(AnimationUtil.Play(node, () => cc.tween(node))).resolves.toBeUndefined();
        expect(AnimationUtil.IsPending(node)).toBe(false);
    });

    it('Select отменяет незавершённый Play — промис не зависает', async () => {
        const node = fakeNode();
        const pending = AnimationUtil.Play(node, neverFinishingTween);
        expect(AnimationUtil.IsPending(node)).toBe(true);

        AnimationUtil.Select(node, false);

        await expect(pending).resolves.toBeUndefined();
        expect(AnimationUtil.IsPending(node)).toBe(false);
    });

    it('Cancel завершает промис даже на невалидном узле', async () => {
        const node = fakeNode(false);
        const pending = AnimationUtil.Play(node, neverFinishingTween);

        AnimationUtil.Cancel(node);

        await expect(pending).resolves.toBeUndefined();
    });

    it('PlayShake резолвится и не оставляет активный промис', async () => {
        const node = fakeNode();

        await expect(AnimationUtil.PlayShake(node, 8, 0.18)).resolves.toBeUndefined();
        expect(AnimationUtil.IsPending(node)).toBe(false);
    });

    it('узлы не мешают друг другу', () => {
        const first = fakeNode();
        const second = fakeNode();
        const firstResolve = jest.fn();
        const secondResolve = jest.fn();

        AnimationUtil.Begin(first, firstResolve);
        AnimationUtil.Begin(second, secondResolve);
        AnimationUtil.Finish(first);

        expect(firstResolve).toHaveBeenCalledTimes(1);
        expect(secondResolve).not.toHaveBeenCalled();
        expect(AnimationUtil.IsPending(second)).toBe(true);
    });
});
