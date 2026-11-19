import { AbstractDispatcher, Dispatcher } from '../assets/scripts/core/Dispatcher';
import { IRandom, SeededRandom } from '../assets/scripts/core/Random';

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

describe('SeededRandom', () => {
    const assertRange = (random: IRandom) => {
        for (let i = 0; i < 200; i++) {
            const value = random.Next();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    };

    it('Next детерминирован при одинаковом сиде', () => {
        const first = new SeededRandom(123);
        const second = new SeededRandom(123);
        expect(new Array(5).fill(0).map(() => first.Next())).toEqual(new Array(5).fill(0).map(() => second.Next()));
    });

    it('разные сиды дают разные последовательности', () => {
        expect(new SeededRandom(1).Next()).not.toBe(new SeededRandom(2).Next());
    });

    it('Next всегда в [0, 1), NextInt в [0, max)', () => {
        const random = new SeededRandom(99);
        assertRange(random);
        for (let i = 0; i < 200; i++) {
            const value = random.NextInt(7);
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(7);
        }
    });

    it('NextInt(0) возвращает 0 и не ломает генератор', () => {
        const random = new SeededRandom(5);
        expect(random.NextInt(0)).toBe(0);
        expect(random.Next()).toBeGreaterThanOrEqual(0);
    });
});
