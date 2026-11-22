import { BoosterType } from '../assets/scripts/core/BoosterRules';
import { Cell } from '../assets/scripts/core/Cell';
import { GameController } from '../assets/scripts/game/GameController';
import {
    checkerboard, createBoardView, createBoostersView, createGame, loadBoosterConfig, setBoard
} from './helpers';

function createScene(boosterConfig?: any) {
    const game = createGame({ movesLimit: 5, targetScore: 100000, boosterConfig });
    const board = createBoardView();
    const boosters = createBoostersView();
    const controller = new GameController(game, board as any, boosters);
    controller.Start();
    setBoard(game.Board, checkerboard());
    boosters.ClearSelection.mockClear();
    return { game, board, boosters, controller };
}

describe('GameController: бустеры', () => {
    it('выбор бомбы подсвечивает кнопку, клик по клетке использует заряд', () => {
        const scene = createScene();

        scene.controller.OnBoosterClick(BoosterType.Bomb);

        expect(scene.boosters.Select).toHaveBeenCalledWith(BoosterType.Bomb);
        expect(scene.boosters.ClearSelection).not.toHaveBeenCalled();

        scene.controller.OnCellClick(Cell.Create(4, 4));

        expect(scene.board.PlaySteps).toHaveBeenCalledTimes(1);
        expect(scene.game.Boosters.GetCount(BoosterType.Bomb)).toBe(2);
        expect(scene.boosters.ClearSelection).toHaveBeenCalled();
        expect(scene.board.SetSelected).toHaveBeenLastCalledWith(null);
    });

    it('без зарядов кнопка показывает отказ и не выбирается', () => {
        const config = loadBoosterConfig();
        config.boosters.find((item) => item.type === BoosterType.Bomb).charges = 0;
        const scene = createScene(config);

        scene.controller.OnBoosterClick(BoosterType.Bomb);

        expect(scene.boosters.PlayUnavailable).toHaveBeenCalledWith(BoosterType.Bomb);
        expect(scene.boosters.Select).not.toHaveBeenCalled();
    });

    it('повторный клик по выбранному бустеру снимает выбор', () => {
        const scene = createScene();

        scene.controller.OnBoosterClick(BoosterType.Bomb);
        scene.controller.OnBoosterClick(BoosterType.Bomb);

        expect(scene.boosters.ClearSelection).toHaveBeenCalledTimes(1);
        expect(scene.game.Boosters.GetCount(BoosterType.Bomb)).toBe(3);
    });

    it('телепорт: первая клетка подсвечивается, вторая завершает обмен', () => {
        const scene = createScene();

        scene.controller.OnBoosterClick(BoosterType.Teleport);
        scene.controller.OnCellClick(Cell.Create(0, 0));

        expect(scene.board.SetSelected).toHaveBeenLastCalledWith(Cell.Create(0, 0));
        expect(scene.board.PlaySteps).not.toHaveBeenCalled();

        scene.controller.OnCellClick(Cell.Create(2, 0));

        expect(scene.board.PlaySteps).toHaveBeenCalledTimes(1);
        expect(scene.game.Boosters.GetCount(BoosterType.Teleport)).toBe(4);
        expect(scene.boosters.ClearSelection).toHaveBeenCalled();
        expect(scene.board.SetSelected).toHaveBeenLastCalledWith(null);
    });

    it('отказ бустера не снимает выбор, чтобы можно было выбрать другую цель', () => {
        const scene = createScene();
        scene.game.Board.SetTile(4, 4, null);

        scene.controller.OnBoosterClick(BoosterType.Bomb);
        scene.controller.OnCellClick(Cell.Create(4, 4));

        expect(scene.board.PlayInvalid).toHaveBeenCalledWith(Cell.Create(4, 4));
        expect(scene.boosters.ClearSelection).not.toHaveBeenCalled();
        expect(scene.game.Boosters.GetCount(BoosterType.Bomb)).toBe(3);
    });
});
