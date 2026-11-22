import { Cell, CeilType } from '../assets/scripts/core/Cell';
import { AbstractDispatcher, Dispatcher } from '../assets/scripts/core/Dispatcher';
import { Random } from '../assets/scripts/core/Random';
import { Tile } from '../assets/scripts/core/Tile';
import { randomSeries } from './helpers';

describe('Cell и Tile', () => {
    it('Cell.Create собирает координату и тип, Cell.Same сравнивает по значению', () => {
        const cell = Cell.Create(2, 5);

        expect(cell).toEqual({ Row: 2, Col: 5, Type: CeilType.Normal, Tile: null });
        expect(Cell.Same(cell, Cell.Create(2, 5))).toBe(true);
        expect(Cell.Same(cell, Cell.Create(5, 2))).toBe(false);
    });

    it('Cell.CanHoldTile разводит поведение по типу клетки (switch)', () => {
        expect(Cell.CanHoldTile(Cell.Create(0, 0))).toBe(true);
        expect(Cell.CanHoldTile(Cell.Create(0, 0, CeilType.Normal))).toBe(true);
        expect(Cell.CanHoldTile(Cell.Create(0, 0, CeilType.Blocked))).toBe(false);
        expect(Cell.CanHoldTile({ Row: 0, Col: 0, Type: 99 as CeilType, Tile: null })).toBe(false);
    });

    it('Tile хранит идентификатор и цвет без изменений', () => {
        const first = new Tile(1, 'blue');
        const second = new Tile(2, 'blue');

        expect(first.Id).toBe(1);
        expect(first.Color).toBe('blue');
        expect(second.Id).not.toBe(first.Id);
    });
});

describe('Dispatcher', () => {
    it('рассылает событие всем подписчикам и не дублирует подписку', () => {
        const dispatcher = new Dispatcher<(value: number) => void>();
        const handler = jest.fn();

        dispatcher.AddObserver(handler);
        dispatcher.AddObserver(handler);
        dispatcher.Post((item) => item(42));

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(42);
    });

    it('RemoveObserver и RemoveAll отключают подписчиков', () => {
        const dispatcher = new Dispatcher<(value: number) => void>();
        const handler = jest.fn();

        dispatcher.AddObserver(handler);
        dispatcher.RemoveObserver(handler);
        dispatcher.Post((item) => item(42));
        expect(handler).not.toHaveBeenCalled();

        dispatcher.AddObserver(handler);
        dispatcher.RemoveAll();
        dispatcher.Post((item) => item(42));
        expect(handler).not.toHaveBeenCalled();
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

    it('AbstractDispatcher.RemoveAll отключает всех наследников', () => {
        const first = { OnEvent: jest.fn() };
        const second = { OnEvent: jest.fn() };
        const subject = new (class extends AbstractDispatcher<{ OnEvent(): void }> {
            public Fire(): void {
                this._dispatcher.Post((item) => item.OnEvent());
            }
        })();

        subject.AddHandler(first);
        subject.AddHandler(second);
        subject.RemoveAll();
        subject.Fire();

        expect(first.OnEvent).not.toHaveBeenCalled();
        expect(second.OnEvent).not.toHaveBeenCalled();
    });
});

describe('Random', () => {
    it('Next детерминирован при одинаковом сиде', () => {
        Random.Reset(123);
        const first = randomSeries(5);
        Random.Reset(123);
        const second = randomSeries(5);
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
        randomSeries(10);
        Random.Reset(7);
        expect(Random.Next()).toBe(first);
    });

    it('Reset нормализует отрицательный и дробный сид', () => {
        Random.Reset(12.9);
        const expected = Random.Next();

        Random.Reset(12);
        expect(Random.Next()).toBe(expected);

        Random.Reset(-12);
        expect(Random.Next()).toBe(expected);
    });

    it('Reset с NaN/Infinity не ломает генератор и начинает с состояния 1', () => {
        Random.Reset(NaN);
        const fromNaN = Random.Next();

        Random.Reset(Infinity);
        const fromInfinity = Random.Next();

        expect(fromNaN).toBe(fromInfinity);
        expect(fromNaN).toBeGreaterThanOrEqual(0);
        expect(fromNaN).toBeLessThan(1);
    });

    it('NextInt с неположительным аргументом не двигает последовательность', () => {
        Random.Reset(5);
        const expected = Random.Next();

        Random.Reset(5);
        expect(Random.NextInt(-9)).toBe(0);
        expect(Random.Next()).toBe(expected);
    });
});
