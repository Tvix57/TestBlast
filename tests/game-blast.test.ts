import { GameState, GameResult } from '../assets/scripts/core/GameResult';
import { TurnStepType } from '../assets/scripts/core/TurnStepType';
import {
    checkerboard, countTiles, createGame, expectedPoints, loadGameConfig,
    startWithBoard, withCells
} from './helpers';

describe('Game: клик по полю', () => {
    const config = loadGameConfig();

    it('клик по одиночному тайлу отклоняется и не тратит ход', () => {
        const game = createGame({ movesLimit: 5 });
        startWithBoard(game, checkerboard());

        const result = game.ClickCell(4, 4);

        expect(result.Accepted).toBe(false);
        expect(result.Steps).toHaveLength(0);
        expect(game.Score.Get()).toBe(0);
        expect(game.Moves.Left).toBe(5);
    });

    it('клик по группе из 3 сжигает её, начисляет очки и тратит ход', () => {
        const game = createGame({ movesLimit: 5 });
        startWithBoard(game, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]));

        const result = game.ClickCell(4, 4);

        expect(result.Accepted).toBe(true);
        expect(result.Steps.map((step) => step.Type)).toEqual([
            TurnStepType.Blast, TurnStepType.DropTiles, TurnStepType.Refill
        ]);
        expect(game.Score.Get()).toBe(expectedPoints(config, 3));
        expect(game.Moves.Left).toBe(4);
        expect(result.Score).toBe(game.Score.Get());
    });

    it('группа из 4 включает бонус за размер группы', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [
            [4, 2, 'B'], [4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']
        ]));

        const result = game.ClickCell(4, 4);

        expect(result.Accepted).toBe(true);
        expect(game.Score.Get()).toBe(expectedPoints(config, 4));
        expect(game.Score.Get()).toBeGreaterThan(expectedPoints(config, 3));
    });

    it('шаги хода содержат данные для анимации: клетки, перемещения и спавны', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]));

        const result = game.ClickCell(4, 4);
        const [blast, drop, refill] = result.Steps as any[];

        expect(blast.Primary).toEqual(expect.arrayContaining([
            { Row: 4, Col: 3 }, { Row: 4, Col: 4 }, { Row: 4, Col: 5 }
        ]));
        expect(blast.Points).toBe(expectedPoints(config, 3));
        expect(drop.Moves).toHaveLength(12);
        drop.Moves.forEach((move: any) => {
            expect(move.Tile).toBeTruthy();
            expect(move.To.Row).toBeGreaterThan(move.From.Row);
            expect(move.From.Col).toBe(move.To.Col);
        });
        expect(refill.Spawns.map((spawn: any) => spawn.Cell)).toEqual([
            { Row: 0, Col: 3 }, { Row: 0, Col: 4 }, { Row: 0, Col: 5 }
        ]);
        refill.Spawns.forEach((spawn: any) => expect(spawn.FromRow).toBe(-1));
    });

    it('после хода поле снова заполнено полностью', () => {
        const game = createGame();
        startWithBoard(game, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]));

        game.ClickCell(4, 4);

        expect(countTiles(game.Board)).toBe(config.board.columns * config.board.rows);
    });

    it('клик до старта матча отклоняется', () => {
        const game = createGame();

        const result = game.ClickCell(0, 0);

        expect(result.Accepted).toBe(false);
        expect(game.State).toBe(GameState.Waiting);
        expect(game.IsFinished).toBe(false);
    });

    it('клик по пустой клетке отклоняется', () => {
        const game = createGame();
        startWithBoard(game, withCells(checkerboard(), [[4, 4, '.']]));

        expect(game.ClickCell(4, 4).Accepted).toBe(false);
    });
});

describe('Game: проигрыш по ходам', () => {
    it('после исчерпания ходов матч завершается поражением', () => {
        const game = createGame({ movesLimit: 2, targetScore: 100000 });
        const matrix = withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]);
        startWithBoard(game, matrix);

        game.ClickCell(4, 4);
        expect(game.State).toBe(GameState.Playing);
        game.Board.SetTile(4, 3, game.Board.CreateTile('red'));
        game.Board.SetTile(4, 4, game.Board.CreateTile('red'));
        game.Board.SetTile(4, 5, game.Board.CreateTile('red'));

        const result = game.ClickCell(4, 5);

        expect(result.Accepted).toBe(true);
        expect(game.State).toBe(GameState.Finished);
        expect(game.Result).toBe(GameResult.Lose);
        expect(game.Moves.Left).toBe(0);
    });
});
