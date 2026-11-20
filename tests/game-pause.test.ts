import { GameResult } from '../assets/scripts/core/GameResult';
import { checkerboard, createClock, createGame, startWithBoard, withCells } from './helpers';

describe('Пауза матча', () => {
    it('Pause останавливает таймер, Resume продолжает с того же места', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, movesLimit: 0, clock: clock.now });
        game.Start();
        clock.advance(5);
        const remaining = game.Timer.Remaining;

        game.Pause();
        clock.advance(10);

        expect(game.Timer.Remaining).toBe(remaining);

        game.Resume();
        clock.advance(5);

        expect(game.Timer.Remaining).toBeCloseTo(remaining - 5, 6);
    });

    it('пауза по метке окончания: прошедшее вычитается, на паузе время стоит', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, clock: clock.now });
        game.Start();

        clock.advance(20);
        expect(game.Timer.Remaining).toBe(40);

        game.Pause();
        clock.advance(30);
        expect(game.Timer.Remaining).toBe(40);

        game.Resume();
        clock.advance(40);
        expect(game.Timer.IsExpired).toBe(true);

        game.ExpireTimer();
        expect(game.Result).toBe(GameResult.Lose);
    });

    it('на паузе ход отклоняется и не тратит ресурсы', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]));
        game.Pause();

        expect(game.ClickCell(4, 4).Accepted).toBe(false);
        expect(game.Moves.Left).toBe(5);

        game.Resume();

        expect(game.ClickCell(4, 4).Accepted).toBe(true);
        expect(game.Moves.Left).toBe(4);
    });

    it('Start снимает паузу у нового матча', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, clock: clock.now });
        game.Start();
        game.Pause();

        game.Start();

        clock.advance(1);
        expect(game.Timer.Remaining).toBeLessThan(60);
    });
});
