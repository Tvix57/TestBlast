import { GameResult, GameState } from '../assets/scripts/core/GameResult';
import {
    checkerboard, colorsOfSeed, countTiles, createClock, createGame, startWithBoard, withCells
} from './helpers';

const groupOfThree = withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]);

describe('Завершение матча', () => {
    it('победа при достижении цели', () => {
        const game = createGame({ targetScore: 30, timeLimitSeconds: 60 });
        startWithBoard(game, groupOfThree);

        const result = game.ClickCell(4, 4);

        expect(result.Result).toBe(GameResult.Win);
        expect(game.State).toBe(GameState.Finished);
        expect(game.IsFinished).toBe(true);
        expect(game.Score.Get()).toBeGreaterThanOrEqual(30);
    });

    it('после победы таймер не идёт', () => {
        const clock = createClock();
        const game = createGame({ targetScore: 30, timeLimitSeconds: 60, clock: clock.now });
        startWithBoard(game, groupOfThree);
        game.ClickCell(4, 4);
        const remaining = game.Timer.Remaining;

        clock.advance(10);

        expect(game.Timer.Remaining).toBe(remaining);
    });

    it('победа приоритетнее поражения по ходам', () => {
        const game = createGame({ targetScore: 30, movesLimit: 1 });
        startWithBoard(game, groupOfThree);

        game.ClickCell(4, 4);

        expect(game.Moves.Left).toBe(0);
        expect(game.Result).toBe(GameResult.Win);
    });

    it('поражение по времени', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 1, clock: clock.now });
        startWithBoard(game, checkerboard());

        clock.advance(1.5);
        expect(game.Timer.IsExpired).toBe(true);
        game.ExpireTimer();

        expect(game.State).toBe(GameState.Finished);
        expect(game.Result).toBe(GameResult.Lose);
    });

    it('ExpireTimer завершает матч поражением и обнуляет таймер', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, clock: clock.now });
        startWithBoard(game, checkerboard());

        clock.advance(61);
        game.ExpireTimer();

        expect(game.State).toBe(GameState.Finished);
        expect(game.Result).toBe(GameResult.Lose);
        expect(game.Timer.Remaining).toBe(0);
        expect(game.Timer.IsExpired).toBe(true);
    });

    it('ExpireTimer на паузе и после финала ничего не меняет', () => {
        const paused = createGame({ timeLimitSeconds: 60 });
        startWithBoard(paused, checkerboard());
        paused.Pause();

        paused.ExpireTimer();

        expect(paused.State).toBe(GameState.Playing);
        expect(paused.Timer.Remaining).toBe(60);

        const finished = createGame({ targetScore: 30, timeLimitSeconds: 60 });
        startWithBoard(finished, groupOfThree);
        finished.ClickCell(4, 4);

        finished.ExpireTimer();

        expect(finished.Result).toBe(GameResult.Win);
    });

    it('ход после метки окончания даёт поражение по таймеру', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, clock: clock.now });
        startWithBoard(game, groupOfThree);

        clock.advance(61);
        const result = game.ClickCell(4, 4);

        expect(result.Result).toBe(GameResult.Lose);
        expect(game.Result).toBe(GameResult.Lose);
    });

    it('без лимита времени ExpireTimer не завершает матч', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 0, clock: clock.now });
        startWithBoard(game, checkerboard());

        clock.advance(1000);
        game.ExpireTimer();

        expect(game.Timer.IsExpired).toBe(false);
        expect(game.State).toBe(GameState.Playing);
    });
});

describe('Перезапуск матча', () => {
    it('Start сбрасывает счёт, ходы и результат', () => {
        const game = createGame({ targetScore: 30, movesLimit: 5 });
        startWithBoard(game, groupOfThree);
        game.ClickCell(4, 4);
        expect(game.State).toBe(GameState.Finished);

        game.Start();

        expect(game.State).toBe(GameState.Playing);
        expect(game.Result).toBe(GameResult.None);
        expect(game.Score.Get()).toBe(0);
        expect(game.Moves.Left).toBe(5);
        expect(countTiles(game.Board)).toBe(game.Board.Rows * game.Board.Columns);
    });

    it('Start возвращает полный таймер и снимает паузу', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, targetScore: 100000, clock: clock.now });
        game.Start();
        clock.advance(20);
        game.Pause();
        const remainingOnPause = game.Timer.Remaining;

        game.Start();

        expect(remainingOnPause).toBe(40);
        expect(game.Timer.Remaining).toBe(60);
        clock.advance(5);
        expect(game.Timer.Remaining).toBe(55);
    });

    it('Start гарантирует наличие хотя бы одной группы', () => {
        for (let seed = 1; seed <= 20; seed++) {
            const game = createGame({ seed });
            game.Start();
            expect(game.Board.HasGroup(game.Config.board.minGroupSize)).toBe(true);
        }
    });

    it('одинаковый сид даёт одинаковое поле', () => {
        expect(colorsOfSeed(11)).toBe(colorsOfSeed(11));
        expect(colorsOfSeed(11)).not.toBe(colorsOfSeed(12));
    });
});
