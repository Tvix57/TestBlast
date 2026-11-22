import { TileType } from '../assets/scripts/core/Tile';
import { IBlastStep } from '../assets/scripts/core/TurnResult';
import { TurnStepType } from '../assets/scripts/core/TurnStepType';
import {
    checkerboard, createGame, expectedChainPoints, loadGameConfig, startWithBoard, withCells
} from './helpers';

const gameConfig = loadGameConfig();

describe('Супер-тайлы: появление', () => {
    it('группа из 5 рождает бомбу в клетке клика и даёт бонус', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [
            [4, 1, 'B'], [4, 2, 'B'], [4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']
        ]));

        const result = game.ClickCell(4, 3);
        const blast = result.Steps[0] as IBlastStep;

        expect(result.Accepted).toBe(true);
        expect(blast.Spawned.Type).toBe(TileType.Bomb);
        expect(blast.Spawned.Cell).toEqual(expect.objectContaining({ Row: 4, Col: 3 }));
        expect(game.Board.GetTile(4, 3).IsSuper).toBe(true);
        expect(game.Board.GetTile(4, 3).Type).toBe(TileType.Bomb);
        expect(game.Score.Get()).toBe(expectedChainPoints(gameConfig, 5, 5, true));
    });

    it('группа из 7 рождает горизонтальный или вертикальный бласт', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [
            [4, 1, 'B'], [4, 2, 'B'], [4, 3, 'B'], [4, 4, 'B'],
            [4, 5, 'B'], [4, 6, 'B'], [4, 7, 'B']
        ]));

        const blast = game.ClickCell(4, 4).Steps[0] as IBlastStep;

        expect([TileType.HorizontalBlast, TileType.VerticalBlast]).toContain(blast.Spawned.Type);
        expect(game.Score.Get()).toBe(expectedChainPoints(gameConfig, 7, 7, true));
    });

    it('группа из 9 рождает bomb_max', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [
            [4, 0, 'B'], [4, 1, 'B'], [4, 2, 'B'], [4, 3, 'B'], [4, 4, 'B'],
            [4, 5, 'B'], [4, 6, 'B'], [4, 7, 'B'], [4, 8, 'B']
        ]));

        const blast = game.ClickCell(4, 4).Steps[0] as IBlastStep;

        expect(blast.Spawned.Type).toBe(TileType.BombMax);
        expect(game.Score.Get()).toBe(expectedChainPoints(gameConfig, 9, 9, true));
    });

    it('группа меньше 5 супер-тайл не рождает', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B'], [4, 6, 'B']]));

        const blast = game.ClickCell(4, 4).Steps[0] as IBlastStep;

        expect(blast.Spawned).toBeNull();
        expect(game.Score.Get()).toBe(expectedChainPoints(gameConfig, 4, 4, false));
    });
});

describe('Супер-тайлы: активация', () => {
    it('клик по супер-тайлу сжигает его зону и тратит ход', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 4, '3']]));

        const result = game.ClickCell(4, 4);
        const blast = result.Steps[0] as IBlastStep;

        expect(result.Accepted).toBe(true);
        expect(result.Steps[0].Type).toBe(TurnStepType.Blast);
        expect(blast.Primary).toHaveLength(9);
        expect(blast.Chain).toHaveLength(0);
        expect(blast.Spawned).toBeNull();
        expect(game.Score.Get()).toBe(9 * 15);
        expect(game.Moves.Left).toBe(4);
    });

    it('клик по супер-тайлу не считается обычной группой', () => {
        const game = createGame({ targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 4, '1']]));

        expect(game.Board.FindGroup(4, 4)).toHaveLength(0);
        expect(game.ClickCell(4, 4).Accepted).toBe(true);
    });

    it('цепочка супер-тайлов: один тайл подрывает соседний', () => {
        const game = createGame({ targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 4, '3'], [4, 6, '4']]));

        const blast = game.ClickCell(4, 4).Steps[0] as IBlastStep;

        // Строка 4 (9 клеток) + столбец 6 вертикального бласта вне строки: 8 клеток.
        expect(blast.Chain).toEqual(expect.arrayContaining([
            expect.objectContaining({ Row: 0, Col: 6 }),
            expect.objectContaining({ Row: 3, Col: 6 }),
            expect.objectContaining({ Row: 5, Col: 6 }),
            expect.objectContaining({ Row: 8, Col: 6 })
        ]));
        expect(blast.Chain).toHaveLength(8);
    });
});
