import { AbstractDispatcher, Dispatcher } from '../assets/scripts/core/Dispatcher';
import { Random } from '../assets/scripts/core/Random';

describe('Dispatcher', () => {
    it('рассылает событие всем подписчикам и не дублирует подписку', () => {
        const dispatcher = new Dispatcher<(value: number) => void>();
        const received: number[] = [];
        const handler = (value: number) => {
            received.push(value);
        };

        dispatcher.AddObserver(handler);
        dispatcher.AddObserver(handler);
        dispatcher.Post((item) => item(42));

        expect(received).toEqual([42]);
    });

    it('RemoveObserver и RemoveAll отключают подписчиков', () => {
        const dispatcher = new Dispatcher<(value: number) => void>();
        const received: number[] = [];
        const handler = (value: number) => received.push(value);

        dispatcher.AddObserver(handler);
        dispatcher.RemoveObserver(handler);
        dispatcher.Post((item) => item(42));
        expect(received).toEqual([]);

        dispatcher.AddObserver(handler);
        dispatcher.RemoveAll();
        dispatcher.Post((item) => item(42));
        expect(received).toEqual([]);
    });

    it('подписчик, отписавшийся во время рассылки, получает текущее событие один раз', () => {
        const received: string[] = [];
        const dispatcher = new Dispatcher<{ OnEvent(): void }>();
        const second = { OnEvent: () => received.push('second') };
        const selfRemoving = {
            OnEvent: () => {
                received.push('self');
                dispatcher.RemoveObserver(selfRemoving);
            }
        };
        dispatcher.AddObserver(selfRemoving);
        dispatcher.AddObserver(second);

        dispatcher.Post((handler) => handler.OnEvent());
        dispatcher.Post((handler) => handler.OnEvent());

        expect(received).toEqual(['self', 'second', 'second']);
    });

    it('AbstractDispatcher даёт AddHandler/RemoveHandler наследникам', () => {
        const handler = { OnEvent: jest.fn() };
        const subject = new (class extends AbstractDispatcher<{ OnEvent(): void }> {
            public Fire(): void {
                this._dispatcher.Post((item) => item.OnEvent());
            }
        })();

        subject.AddHandler(handler);
        subject.Fire();
        subject.RemoveHandler(handler);
        subject.Fire();

        expect(handler.OnEvent).toHaveBeenCalledTimes(1);
    });
});

describe('Random', () => {
    const series = (count: number): number[] => new Array(count).fill(0).map(() => Random.Next());

    it('Next детерминирован при одинаковом сиде', () => {
        Random.Reset(123);
        const first = series(5);
        Random.Reset(123);
        const second = series(5);
        expect(first).toEqual(second);
    });

    it('разные сиды дают разные последовательности', () => {
        Random.Reset(1);
        const first = Random.Next();
        Random.Reset(2);
        expect(first).not.toBe(Random.Next());
    });

    it('Next всегда в [0, 1), NextInt в [0, max)', () => {
        Random.Reset(99);
        for (let i = 0; i < 200; i++) {
            const value = Random.Next();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
        for (let i = 0; i < 200; i++) {
            const value = Random.NextInt(7);
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(7);
        }
    });

    it('NextInt(0) возвращает 0 и не ломает генератор', () => {
        Random.Reset(5);
        expect(Random.NextInt(0)).toBe(0);
        expect(Random.Next()).toBeGreaterThanOrEqual(0);
    });

    it('Reset перезапускает последовательность с начала', () => {
        Random.Reset(7);
        const first = Random.Next();
        series(10);
        Random.Reset(7);
        expect(Random.Next()).toBe(first);
    });
});
