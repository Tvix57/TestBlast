import { BoosterType } from '../assets/scripts/core/BoosterRules';
import { GameResult } from '../assets/scripts/core/GameResult';
import { TileType } from '../assets/scripts/core/Tile';
import { TurnStepType } from '../assets/scripts/core/TurnStepType';
import {
    checkerboard, createGame, expectedChainPoints, expectedPoints, loadGameConfig, startWithBoard, withCells
} from './helpers';

/**
 * Golden-тесты поведения «как было» до декомпозиции `GameSession`.
 * Фиксируют очки, порядок шагов и побочные эффекты; при рефакторинге не меняются.
 */
describe('Golden: сценарии хода', () => {
    const config = loadGameConfig();

    it('группа из 3 — очки, шаги и списание хода', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]));

        const result = game.ClickCell(4, 4);

        expect(result.Accepted).toBe(true);
        expect(result.Steps.slice(0, 3).map((step) => step.Type)).toEqual([
            TurnStepType.Blast, TurnStepType.DropTiles, TurnStepType.Refill
        ]);
        expect(game.Score.Get()).toBe(expectedPoints(config, 3));
        expect(game.Moves.Left).toBe(4);
    });

    it('группа из 5 — тот же порядок шагов, супер-тайл и бонус в очках', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, withCells(checkerboard(), [
            [4, 2, 'B'], [4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B'], [4, 6, 'B']
        ]));

        const result = game.ClickCell(4, 4);
        const blast = result.Steps[0] as any;

        expect(result.Accepted).toBe(true);
        expect(result.Steps.slice(0, 3).map((step) => step.Type)).toEqual([
            TurnStepType.Blast, TurnStepType.DropTiles, TurnStepType.Refill
        ]);
        expect(blast.Spawned).toBeTruthy();
        expect(blast.Spawned.Type).toBe(TileType.Bomb);
        expect([blast.Spawned.Cell.Row, blast.Spawned.Cell.Col]).toEqual([4, 4]);
        expect(game.Score.Get()).toBe(expectedChainPoints(config, 5, 5, true));
        expect(game.Moves.Left).toBe(4);
    });

    it('бомба-бустер 5×5 — очки по зоне, заряд тратится, ход нет', () => {
        const game = createGame({ movesLimit: 5, targetScore: 100000 });
        startWithBoard(game, checkerboard());

        const result = game.UseBooster(BoosterType.Bomb, [{ Row: 4, Col: 4, Type: 0, Tile: null }]);

        expect(result.Accepted).toBe(true);
        expect(result.Steps.slice(0, 3).map((step) => step.Type)).toEqual([
            TurnStepType.Blast, TurnStepType.DropTiles, TurnStepType.Refill
        ]);
        const points = 25 * game.BoosterConfig.boosters.filter((item) => item.type === BoosterType.Bomb)[0]
            .effect.scorePerTile;
        expect(game.Score.Get()).toBe(points);
        expect(game.Boosters.GetCount(BoosterType.Bomb)).toBe(2);
        expect(game.Moves.Left).toBe(5);
        expect(result.Result).toBe(GameResult.None);
    });
});
