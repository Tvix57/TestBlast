import { TileType } from '../assets/scripts/core/Tile';
import { TurnStepType } from '../assets/scripts/core/TurnStepType';
import { BoardController } from '../assets/scripts/game/controllers/BoardController';
import { BoardLayout } from '../assets/scripts/game/layout/BoardLayout';
import {
    checkerboard, createBoardStage, createDeferred, createGame, findTileViewAt, flushPromises,
    startWithBoard, withCells
} from './helpers';

const groupOfThree = withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]);

function createScene(options: { width?: number; height?: number; scale?: number } = {}) {
    const game = createGame({ seed: 11 });
    game.Start();
    const stage = createBoardStage(options);
    const controller = new BoardController(stage as any, game.Board, game.Config.animation);
    return { game, stage, controller };
}

async function buildScene(options: { width?: number; height?: number; scale?: number } = {}) {
    const scene = createScene(options);
    await scene.controller.Build();
    return scene;
}

describe('BoardController: поле без `cc`', () => {
    it('Build создаёт вид на каждый тайл, ставит по сетке и держит ввод до появления', async () => {
        const game = createGame({ seed: 11 });
        game.Start();
        const stage = createBoardStage();
        const controller = new BoardController(stage as any, game.Board, game.Config.animation);
        const handler = jest.fn();
        controller.SetClickHandler(handler);
        const placements = game.Board.GetPlacements();

        const building = controller.Build();
        controller.OnTileClick(placements[0].Cell);

        expect(handler).not.toHaveBeenCalled();
        expect(stage.ClearCount).toBe(1);
        expect(stage.Created.length).toBe(placements.length);
        expect(stage.Created[0].SetTile).toHaveBeenCalledWith(placements[0].Tile, placements[0].Cell);
        expect(stage.Created[0].PlayAppear).toHaveBeenCalled();
        expect(stage.Created[0].SetCellSize).toHaveBeenCalledWith(expect.any(Number));
        expect(stage.Errors).toEqual([]);

        await building;
        controller.OnTileClick(placements[0].Cell);
        expect(handler).toHaveBeenCalledWith(placements[0].Cell);
    });

    it('раскладка считается по размеру зоны и масштабу ноды поля', async () => {
        const game = createGame({ seed: 11 });
        game.Start();
        const stage = createBoardStage({ width: 990, height: 990, scale: 2 });
        const controller = new BoardController(stage as any, game.Board, game.Config.animation);

        await controller.Build();

        const expected = BoardLayout.Fit(game.Board.Rows, game.Board.Columns, stage.GridSize, game.Board.CellGapRatio);
        const view = stage.Created[0];
        expect(view.SetCellSize).toHaveBeenLastCalledWith(expected.cellSize / 2);
        expect(view.Position).toEqual(BoardLayout.Position(
            game.Board.Rows, game.Board.Columns, expected.step / 2, view.Cell.Row, view.Cell.Col
        ));
    });

    it('проигрывает шаги хода: сгорание, падение и дозаполнение, затем возвращает ввод', async () => {
        const game = createGame({ seed: 11 });
        startWithBoard(game, groupOfThree);
        const stage = createBoardStage();
        const controller = new BoardController(stage as any, game.Board, game.Config.animation);
        await controller.Build();

        const result = game.ClickCell(4, 4);
        expect(result.Accepted).toBe(true);
        const groupViews = [[4, 3], [4, 4], [4, 5]].map(([row, col]) => findTileViewAt(stage, row, col));
        const handler = jest.fn();
        controller.SetClickHandler(handler);

        controller.Lock();
        controller.OnTileClick(game.Board.GetCell(0, 0));
        await controller.PlaySteps(result.Steps);
        controller.Unlock();

        groupViews.forEach((view) => expect(view.PlayBlast).toHaveBeenCalledTimes(1));
        groupViews.forEach((view) => expect(stage.Released).toContain(view));
        expect(stage.Created.some((view) => view.MoveTo.mock.calls.length > 0)).toBe(true);
        expect(stage.Created.some((view) => view.PlaySpawnFall.mock.calls.length > 0)).toBe(true);
        expect(handler).not.toHaveBeenCalled();

        controller.OnTileClick(game.Board.GetCell(0, 0));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('новый ход обрывает предыдущую цепочку шагов одним поколением действий', async () => {
        const { game, stage, controller } = await buildScene();
        const first = game.Board.GetCell(4, 3);
        const second = game.Board.GetCell(4, 5);
        const firstView = findTileViewAt(stage, 4, 3);
        const secondView = findTileViewAt(stage, 4, 5);
        const deferred = createDeferred<void>();
        firstView.PlayBlast.mockReturnValueOnce(deferred.promise);

        const play = controller.PlaySteps([
            { Type: TurnStepType.Blast, Primary: [first], Points: 0 },
            { Type: TurnStepType.Blast, Primary: [second], Points: 0 }
        ] as any);
        await flushPromises();

        controller.PlaySteps([]);
        deferred.resolve();
        await play;

        expect(firstView.PlayBlast).toHaveBeenCalledTimes(1);
        expect(secondView.PlayBlast).not.toHaveBeenCalled();
    });

    it('PlayInvalid блокирует ввод на время shake и возвращает тайл в позицию модели', async () => {
        const { game, stage, controller } = await buildScene();
        const cell = game.Board.GetCell(4, 4);
        const view = findTileViewAt(stage, 4, 4);
        const deferred = createDeferred<void>();
        view.PlayInvalid.mockReturnValueOnce(deferred.promise);
        const placesBefore = view.PlaceAt.mock.calls.length;

        const shake = controller.PlayInvalid(cell);
        await expect(controller.PlayInvalid(cell)).resolves.toBeUndefined();

        expect(view.PlayInvalid).toHaveBeenCalledTimes(1);
        expect(view.PlayInvalid).toHaveBeenCalledWith(
            game.Config.animation.invalidShakeDuration,
            game.Config.animation.invalidShakeOffset
        );
        expect(view.PlaceAt.mock.calls.length).toBe(placesBefore);

        deferred.resolve();
        await shake;
        expect(view.PlaceAt.mock.calls.length).toBeGreaterThan(placesBefore);
    });

    it('Lock/Unlock управляют вводом, Dispose снимает обработчик', async () => {
        const { game, controller } = await buildScene();
        const cell = game.Board.GetCell(0, 0);
        const handler = jest.fn();
        controller.SetClickHandler(handler);

        controller.Lock();
        controller.OnTileClick(cell);
        expect(handler).not.toHaveBeenCalled();

        controller.Unlock();
        controller.OnTileClick(cell);
        expect(handler).toHaveBeenCalledTimes(1);

        controller.Dispose();
        controller.OnTileClick(cell);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('ресайз во время анимации применяется после неё, без отдельного флага раскладки', async () => {
        const { game, stage, controller } = await buildScene();
        const view = stage.Created[0];
        const placesBefore = view.PlaceAt.mock.calls.length;

        controller.Lock();
        stage.GridSize = { width: 480, height: 480 };
        controller.RefreshLayout();
        expect(view.PlaceAt.mock.calls.length).toBe(placesBefore);

        controller.Unlock();

        const expected = BoardLayout.Fit(game.Board.Rows, game.Board.Columns, stage.GridSize, game.Board.CellGapRatio);
        expect(view.SetCellSize).toHaveBeenLastCalledWith(expected.cellSize);
        expect(view.PlaceAt.mock.calls.length).toBeGreaterThan(placesBefore);
    });

    it('отказ по клетке без вида завершается сразу и не трогает остальные тайлы', async () => {
        const { controller, stage } = await buildScene();

        await expect(controller.PlayInvalid(null)).resolves.toBeUndefined();
        await expect(controller.PlayInvalid({ Row: 99, Col: 99, Type: 0, Tile: null } as any))
            .resolves.toBeUndefined();

        expect(stage.Created.some((view) => view.PlayInvalid.mock.calls.length > 0)).toBe(false);
    });

    it('SetSelected подсвечивает клетку и снимает подсветку', async () => {
        const { game, stage, controller } = await buildScene();
        const cell = game.Board.GetCell(4, 4);
        const view = findTileViewAt(stage, 4, 4);

        controller.SetSelected(cell);

        expect(view.PlaySelected).toHaveBeenCalledWith(true);

        controller.SetSelected(null);

        expect(view.PlaySelected).toHaveBeenLastCalledWith(false);
    });

    it('Swap меняет клетки видов и едет за swapDuration', async () => {
        const { game, stage, controller } = await buildScene();
        const first = findTileViewAt(stage, 0, 0);
        const second = findTileViewAt(stage, 0, 2);

        await controller.PlaySteps([{
            Type: TurnStepType.Swap,
            First: first.Cell,
            Second: second.Cell,
            FirstTile: first.Tile,
            SecondTile: second.Tile
        } as any]);

        expect(first.Cell).toEqual(expect.objectContaining({ Row: 0, Col: 2 }));
        expect(second.Cell).toEqual(expect.objectContaining({ Row: 0, Col: 0 }));
        expect(first.MoveTo.mock.calls[0][2]).toBe(game.Config.animation.swapDuration);
        expect(second.MoveTo.mock.calls[0][2]).toBe(game.Config.animation.swapDuration);
        expect(findTileViewAt(stage, 0, 2)).toBe(first);
        expect(findTileViewAt(stage, 0, 0)).toBe(second);
    });

    it('Spawned создаёт вид супер-тайла и проигрывает появление', async () => {
        const { game, stage, controller } = await buildScene();
        const cell = game.Board.GetCell(4, 4);
        const blastView = findTileViewAt(stage, 4, 4);
        const createdBefore = stage.Created.length;
        const tile = game.Board.CreateTile(TileType.Bomb);

        await controller.PlaySteps([{
            Type: TurnStepType.Blast,
            Primary: [cell],
            Chain: [],
            Points: 0,
            Spawned: { Cell: cell, Tile: tile, Type: TileType.Bomb }
        } as any]);

        expect(blastView.PlayBlast).toHaveBeenCalled();
        const spawned = stage.Created[createdBefore];
        expect(spawned).toBeTruthy();
        expect(spawned.SetTile).toHaveBeenCalledWith(tile, expect.objectContaining({ Row: 4, Col: 4 }));
        expect(spawned.PlaySuperSpawn).toHaveBeenCalledWith(game.Config.animation.superSpawnDuration);
    });

    it('Chain сгорает после Primary и тоже удаляет свои виды', async () => {
        const { game, stage, controller } = await buildScene();
        const primary = game.Board.GetCell(4, 4);
        const chained = game.Board.GetCell(0, 0);
        const chainedView = findTileViewAt(stage, 0, 0);

        await controller.PlaySteps([{
            Type: TurnStepType.Blast,
            Primary: [primary],
            Chain: [chained],
            Points: 0,
            Spawned: null
        } as any]);

        expect(chainedView.PlayBlast).toHaveBeenCalled();
        expect(stage.Released).toContain(chainedView);
    });
});

