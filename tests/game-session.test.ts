import { GameResult, GameState } from '../assets/scripts/core/GameResult';
import { TurnStepType } from '../assets/scripts/core/TurnStepType';
import { checkerboard, createClock, createGame, setBoard, withCells } from './helpers';

const groupOfThree = withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]);

describe('GameSession: паспорт и состояние матча', () => {
    it('до Start матч ждёт, счёт и ходы ещё не настроены', () => {
        const game = createGame({ seed: 123, movesLimit: 7, timeLimitSeconds: 60, targetScore: 900 });

        expect(game.State).toBe(GameState.Waiting);
        expect(game.Result).toBe(GameResult.None);
        expect(game.IsFinished).toBe(false);
        expect(game.Level).toBe(1);
        expect(game.FieldVariant).toBe(0);
        expect(game.Seed).toBe(123);
        expect(game.TargetScore).toBe(900);
        expect(game.Score.Get()).toBe(0);
        expect(game.Moves.Left).toBe(0);
        expect(game.Moves.Limit).toBe(0);
        expect(game.Timer.Limit).toBe(60);
    });

    it('Start настраивает ходы и таймер по конфигу текущего уровня', () => {
        const game = createGame({ movesLimit: 7, timeLimitSeconds: 60, targetScore: 900 });

        game.Start();

        expect(game.State).toBe(GameState.Playing);
        expect(game.Moves.Limit).toBe(7);
        expect(game.Moves.Left).toBe(7);
        expect(game.Timer.Limit).toBe(60);
        expect(game.Timer.Remaining).toBe(60);
        expect(game.Board.GetPlacements()).toHaveLength(game.Board.Rows * game.Board.Columns);
    });

    it('Start перемешивает поле, если в первой раскладке нет группы', () => {
        const game = createGame({ maxAttempts: 3 });
        jest.spyOn(game.Board, 'Fill').mockImplementation(() => {
            setBoard(game.Board, checkerboard());
            return [];
        });
        const shuffle = jest.spyOn(game.Board, 'Shuffle').mockImplementation(() => {
            game.Board.SetTile(0, 0, game.Board.CreateTile('blue'));
            game.Board.SetTile(0, 1, game.Board.CreateTile('blue'));
            game.Board.SetTile(0, 2, game.Board.CreateTile('blue'));
        });

        game.Start();

        expect(shuffle).toHaveBeenCalledTimes(1);
        expect(game.Board.HasGroup(game.Config.board.minGroupSize)).toBe(true);
    });

    it('Start ограничен maxAttempts, если перемешивание не помогает', () => {
        const game = createGame({ maxAttempts: 2 });
        jest.spyOn(game.Board, 'Fill').mockImplementation(() => {
            setBoard(game.Board, checkerboard());
            return [];
        });
        const shuffle = jest.spyOn(game.Board, 'Shuffle').mockImplementation(() => undefined);

        game.Start();

        expect(shuffle).toHaveBeenCalledTimes(2);
        expect(game.Board.HasGroup(game.Config.board.minGroupSize)).toBe(false);
        expect(game.State).toBe(GameState.Playing);
    });

    it('Pause до старта и Resume без паузы не меняют состояние', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, clock: clock.now });

        game.Pause();
        expect(game.State).toBe(GameState.Waiting);
        expect(game.Timer.Remaining).toBe(60);

        game.Start();
        clock.advance(5);
        game.Resume();
        clock.advance(5);

        expect(game.State).toBe(GameState.Playing);
        expect(game.Timer.Remaining).toBe(50);
    });

    it('повторная Pause не сдвигает таймер дважды', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 60, clock: clock.now });
        game.Start();
        clock.advance(10);

        game.Pause();
        const remaining = game.Timer.Remaining;
        clock.advance(5);
        game.Pause();
        clock.advance(5);

        expect(game.Timer.Remaining).toBe(remaining);
    });

    it('ExpireTimer до старта матча ничего не завершает', () => {
        const game = createGame({ timeLimitSeconds: 1 });

        game.ExpireTimer();

        expect(game.State).toBe(GameState.Waiting);
        expect(game.Result).toBe(GameResult.None);
    });

    it('клик за границами поля отклоняется без траты хода', () => {
        const game = createGame({ movesLimit: 5 });
        game.Start();
        setBoard(game.Board, checkerboard());

        const result = game.ClickCell(-1, 0);

        expect(result.Accepted).toBe(false);
        expect(result.Steps).toEqual([]);
        expect(game.Moves.Left).toBe(5);
    });

    it('принятый ход возвращает актуальные счёт, ходы и время', () => {
        const clock = createClock();
        const game = createGame({ movesLimit: 5, timeLimitSeconds: 60, clock: clock.now });
        game.Start();
        clock.advance(12);
        setBoard(game.Board, groupOfThree);

        const result = game.ClickCell(4, 4);

        expect(result.Accepted).toBe(true);
        expect(result.Score).toBe(game.Score.Get());
        expect(result.MovesLeft).toBe(4);
        expect(result.TimeLeft).toBeCloseTo(48, 6);
        expect(result.Result).toBe(GameResult.None);
        expect(result.Steps[0].Type).toBe(TurnStepType.Blast);
    });
});
