import { GameResult, GameState } from '../assets/scripts/core/GameResult';
import { TurnStepType } from '../assets/scripts/core/TurnStepType';
import { checkerboard, createGame, fillWithoutGroups, startWithBoard, withCells } from './helpers';

describe('Нет доступных ходов', () => {
    const groupOfThree = withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]);

    it('если групп нет и перемешивание запрещено — поражение', () => {
        const game = createGame({ maxAttempts: 0, targetScore: 100000 });
        startWithBoard(game, groupOfThree);
        jest.spyOn(game.Board, 'Refill').mockImplementation(() => {
            fillWithoutGroups(game);
            return [];
        });

        const result = game.ClickCell(4, 4);

        expect(game.Board.HasGroup(game.Config.board.minGroupSize)).toBe(false);
        expect(result.Result).toBe(GameResult.Lose);
        expect(game.State).toBe(GameState.Finished);
    });

    it('если перемешивание удалось, матч продолжается и в шагах есть shuffle', () => {
        const game = createGame({ maxAttempts: 3, targetScore: 100000, seed: 5 });
        startWithBoard(game, groupOfThree);
        jest.spyOn(game.Board, 'Refill').mockImplementation(() => {
            fillWithoutGroups(game);
            return [];
        });
        jest.spyOn(game.Board, 'Shuffle').mockImplementation(() => {
            game.Board.SetTile(0, 0, game.Board.CreateTile('blue'));
            game.Board.SetTile(0, 1, game.Board.CreateTile('blue'));
            game.Board.SetTile(0, 2, game.Board.CreateTile('blue'));
        });

        const result = game.ClickCell(4, 4);

        expect(game.State).toBe(GameState.Playing);
        expect(result.Steps.map((step) => step.Type)).toContain(TurnStepType.Shuffle);
        expect(game.Board.HasGroup(game.Config.board.minGroupSize)).toBe(true);
    });
});

describe('После завершения матча', () => {
    it('клики по полю игнорируются', () => {
        const game = createGame({ targetScore: 30 });
        startWithBoard(game, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]));
        game.ClickCell(4, 4);
        const scoreAfterWin = game.Score.Get();

        const result = game.ClickCell(4, 3);

        expect(game.State).toBe(GameState.Finished);
        expect(result.Accepted).toBe(false);
        expect(game.Score.Get()).toBe(scoreAfterWin);
    });
});
