import { BoosterInventory, IBoosterHandler } from '../assets/scripts/core/BoosterInventory';
import { MatchTimer, ITimerHandler } from '../assets/scripts/core/MatchTimer';
import { MovesCounter, IMovesHandler } from '../assets/scripts/core/MovesCounter';
import { ScoreCounter, IScoreHandler } from '../assets/scripts/core/ScoreCounter';
import { loadBoosterConfig } from './helpers';

describe('ScoreCounter', () => {
    it('копит очки и сообщает новое значение подписчику', () => {
        const score = new ScoreCounter();
        const seen: number[] = [];
        const handler: IScoreHandler = { OnScoreChanged: (value) => seen.push(value) };
        score.AddHandler(handler);

        score.Add(30);
        score.Add(15);

        expect(score.Get()).toBe(45);
        expect(seen).toEqual([30, 45]);
    });

    it('Add(0) не рассылает событие', () => {
        const score = new ScoreCounter();
        const handler = { OnScoreChanged: jest.fn() };
        score.AddHandler(handler);

        score.Add(0);

        expect(handler.OnScoreChanged).not.toHaveBeenCalled();
    });

    it('Reset обнуляет счёт и уведомляет подписчиков', () => {
        const score = new ScoreCounter();
        score.Add(100);
        const handler = { OnScoreChanged: jest.fn() };
        score.AddHandler(handler);

        score.Reset();

        expect(score.Get()).toBe(0);
        expect(handler.OnScoreChanged).toHaveBeenCalledWith(0);
    });
});

describe('MovesCounter', () => {
    it('Configure включает лимит и рассылает состояние', () => {
        const moves = new MovesCounter();
        const seen: Array<[number, number]> = [];
        const handler: IMovesHandler = { OnMovesChanged: (left, limit) => seen.push([left, limit]) };
        moves.AddHandler(handler);

        moves.Configure(3);

        expect(moves.IsEnabled).toBe(true);
        expect(moves.Left).toBe(3);
        expect(seen).toEqual([[3, 3]]);
    });

    it('Spend уменьшает остаток до нуля и не уходит в минус', () => {
        const moves = new MovesCounter();
        moves.Configure(2);

        moves.Spend();
        moves.Spend();
        moves.Spend();

        expect(moves.Left).toBe(0);
        expect(moves.CanSpend()).toBe(false);
    });

    it('при выключенном лимите ход не тратится', () => {
        const moves = new MovesCounter();
        moves.Configure(0);

        moves.Spend();

        expect(moves.IsEnabled).toBe(false);
        expect(moves.CanSpend()).toBe(true);
        expect(moves.Left).toBe(0);
    });

    it('Reset возвращает исходный остаток', () => {
        const moves = new MovesCounter();
        moves.Configure(5);
        moves.Spend();

        moves.Reset();

        expect(moves.Left).toBe(5);
    });
});
