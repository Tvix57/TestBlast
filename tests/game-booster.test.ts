import { BoosterType } from '../assets/scripts/core/BoosterRules';
import { IBlastStep } from '../assets/scripts/core/TurnResult';
import { TurnStepType } from '../assets/scripts/core/TurnStepType';
import {
    checkerboard, countTiles, createGame, expectedChainPoints, loadBoosterConfig, loadGameConfig,
    startWithBoard, withCells
} from './helpers';

describe('Бустер «бомба»', () => {
    const boosterConfig = loadBoosterConfig();
    const gameConfig = loadGameConfig();
    const bomb = boosterConfig.boosters.find((item) => item.type === BoosterType.Bomb);

    it('сжигает квадрат 5x5, начисляет очки и тратит заряд, не тратя ход', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, checkerboard());

        const result = game.UseBooster(BoosterType.Bomb, [{ Row: 4, Col: 4, Type: 0, Tile: null }]);

        expect(result.Accepted).toBe(true);
        expect(result.Steps.map((step) => step.Type)).toEqual([
            TurnStepType.Blast, TurnStepType.DropTiles, TurnStepType.Refill
        ]);
        expect(game.Score.Get()).toBe(25 * bomb.effect.scorePerTile);
        expect(game.Boosters.GetCount(BoosterType.Bomb)).toBe(bomb.charges - 1);
        expect(game.Moves.Left).toBe(5);
        expect(countTiles(game.Board)).toBe(gameConfig.board.columns * gameConfig.board.rows);
    });

    it('без зарядов бустер не срабатывает', () => {
        const config = loadBoosterConfig();
        config.boosters.find((item) => item.type === BoosterType.Bomb).charges = 1;
        const game = createGame({ targetScore: 100000, boosterConfig: config });
        startWithBoard(game, checkerboard());

        expect(game.UseBooster(BoosterType.Bomb, [{ Row: 4, Col: 4, Type: 0, Tile: null }]).Accepted).toBe(true);
        const rejected = game.UseBooster(BoosterType.Bomb, [{ Row: 4, Col: 4, Type: 0, Tile: null }]);

        expect(rejected.Accepted).toBe(false);
        expect(game.Boosters.GetCount(BoosterType.Bomb)).toBe(0);
    });

    it('по пустой клетке бустер не срабатывает и заряд сохраняется', () => {
        const game = createGame({ targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 4, '.']]));

        const result = game.UseBooster(BoosterType.Bomb, [{ Row: 4, Col: 4, Type: 0, Tile: null }]);

        expect(result.Accepted).toBe(false);
        expect(game.Boosters.GetCount(BoosterType.Bomb)).toBe(bomb.charges);
    });

    it('цепочка: бомба подрывает супер-тайл, тот выжигает строку', () => {
        const game = createGame({ targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 6, '3']]));

        const result = game.UseBooster(BoosterType.Bomb, [{ Row: 4, Col: 4, Type: 0, Tile: null }]);
        const blast = result.Steps[0] as IBlastStep;

        // 25 клеток бомбы + 4 клетки строки, которых не было в зоне
        expect(blast.Primary).toHaveLength(25);
        expect(blast.Chain).toHaveLength(4);
        expect(game.Score.Get()).toBe(29 * bomb.effect.scorePerTile);
    });
});

describe('Бустер «телепорт»', () => {
    const boosterConfig = loadBoosterConfig();
    const gameConfig = loadGameConfig();
    const teleport = boosterConfig.boosters.find((item) => item.type === BoosterType.Teleport);

    it('без сложившейся группы только меняет тайлы местами', () => {
        const game = createGame({ targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[2, 0, 'P']]));

        const result = game.UseBooster(BoosterType.Teleport, [
            { Row: 0, Col: 0, Type: 0, Tile: null },
            { Row: 2, Col: 0, Type: 0, Tile: null }
        ]);

        expect(result.Accepted).toBe(true);
        expect(result.Steps.map((step) => step.Type)).toEqual([TurnStepType.Swap]);
        expect(game.Score.Get()).toBe(0);
        expect(game.Boosters.GetCount(BoosterType.Teleport)).toBe(teleport.charges - 1);
    });

    it('сжигает группу, сложившуюся после обмена', () => {
        const game = createGame({ targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [
            [4, 1, 'B'], [4, 2, 'B'], [4, 3, 'R'], [4, 4, 'B']
        ]));

        const result = game.UseBooster(BoosterType.Teleport, [
            { Row: 4, Col: 3, Type: 0, Tile: null },
            { Row: 4, Col: 4, Type: 0, Tile: null }
        ]);

        expect(result.Accepted).toBe(true);
        expect(result.Steps.map((step) => step.Type)).toEqual([
            TurnStepType.Swap, TurnStepType.Blast, TurnStepType.DropTiles, TurnStepType.Refill
        ]);
        expect(game.Score.Get()).toBe(expectedChainPoints(gameConfig, 3, 3, false));
        expect(game.Boosters.GetCount(BoosterType.Teleport)).toBe(teleport.charges - 1);
        expect(countTiles(game.Board)).toBe(gameConfig.board.columns * gameConfig.board.rows);
    });

    it('обмен клетки с самой собой отклоняется', () => {
        const game = createGame({ targetScore: 100000 });
        startWithBoard(game, checkerboard());

        const result = game.UseBooster(BoosterType.Teleport, [
            { Row: 0, Col: 0, Type: 0, Tile: null },
            { Row: 0, Col: 0, Type: 0, Tile: null }
        ]);

        expect(result.Accepted).toBe(false);
        expect(game.Boosters.GetCount(BoosterType.Teleport)).toBe(teleport.charges);
    });

    it('без зарядов телепорт не срабатывает', () => {
        const config = loadBoosterConfig();
        config.boosters.find((item) => item.type === BoosterType.Teleport).charges = 1;
        const game = createGame({ targetScore: 100000, boosterConfig: config });
        startWithBoard(game, checkerboard());

        expect(game.UseBooster(BoosterType.Teleport, [
            { Row: 0, Col: 0, Type: 0, Tile: null },
            { Row: 0, Col: 2, Type: 0, Tile: null }
        ]).Accepted).toBe(true);
        const rejected = game.UseBooster(BoosterType.Teleport, [
            { Row: 0, Col: 0, Type: 0, Tile: null },
            { Row: 0, Col: 2, Type: 0, Tile: null }
        ]);

        expect(rejected.Accepted).toBe(false);
        expect(game.Boosters.GetCount(BoosterType.Teleport)).toBe(0);
    });

    it('при usesMove = true обмен тратит ход', () => {
        const configWithCost = loadBoosterConfig();
        configWithCost.boosters.find((item) => item.type === BoosterType.Teleport).usesMove = true;
        const game = createGame({ movesLimit: 5, targetScore: 100000, boosterConfig: configWithCost });
        startWithBoard(game, withCells(checkerboard(), [[2, 0, 'P']]));

        game.UseBooster(BoosterType.Teleport, [
            { Row: 0, Col: 0, Type: 0, Tile: null },
            { Row: 2, Col: 0, Type: 0, Tile: null }
        ]);

        expect(game.Moves.Left).toBe(4);
    });
});

