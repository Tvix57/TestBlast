import { BoosterType } from '../assets/scripts/core/BoosterRules';
import { GameResult, GameState } from '../assets/scripts/core/GameResult';
import { MainSceneController } from '../assets/scripts/game/controllers/MainSceneController';
import {
    checkerboard, createBoardView, createBoostersView, createHudView, createTestContext, setBoard, withCells
} from './helpers';

const groupOfThree = withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]);

/** Фейк планировщика: запоминает колбэк, интервал и снятие — без `cc`. */
function createScheduler() {
    const scheduler = {
        Scheduled: null as null | (() => void),
        Unscheduled: null as null | (() => void),
        Interval: 0,
        Schedule(callback: () => void, intervalSeconds: number): void {
            scheduler.Scheduled = callback;
            scheduler.Interval = intervalSeconds;
        },
        Unschedule(callback: () => void): void {
            scheduler.Unscheduled = callback;
        }
    };
    return scheduler;
}

function createDialogs(startDialog: boolean = true) {
    return {
        OpenStartDialog: jest.fn((onPlay: () => void) => startDialog),
        OpenEndDialog: jest.fn((data: any, onRestart: () => void) => true),
        SetPauseHandler: jest.fn((handler: (paused: boolean) => void) => undefined),
        ClearPauseHandler: jest.fn((handler: (paused: boolean) => void) => undefined)
    };
}

function createScene(options: { startDialog?: boolean } = {}) {
    const context = createTestContext();
    const dialogs = createDialogs(options.startDialog !== false);
    const board = createBoardView();
    const hud = createHudView();
    const boosters = createBoostersView();
    const scheduler = createScheduler();
    const controller = new MainSceneController(
        context, dialogs as any, board as any, hud as any, scheduler, boosters as any
    );
    return { context, dialogs, board, hud, boosters, scheduler, controller };
}

type IScene = ReturnType<typeof createScene>;

function confirmStart(scene: IScene): void {
    const onPlay = scene.dialogs.OpenStartDialog.mock.calls[0][0];
    onPlay();
}

function expireByTimer(scene: IScene): void {
    scene.context.Session.Timer.Expire();
    (scene.scheduler.Scheduled as () => void)();
}

describe('MainSceneController: биндинг сцены через контроллер', () => {
    it('Start привязывает виды, подписку на паузу и ждёт подтверждения старта', () => {
        const scene = createScene();
        scene.controller.Start();

        expect(scene.board.Init).toHaveBeenCalledWith(
            scene.context.Session.Board,
            scene.context.Session.Config.animation
        );
        expect(scene.hud.Bind).toHaveBeenCalledWith(scene.context.Session);
        expect(scene.board.SetClickHandler).toHaveBeenCalledTimes(1);
        expect(scene.dialogs.SetPauseHandler).toHaveBeenCalledTimes(1);
        expect(scene.dialogs.OpenStartDialog).toHaveBeenCalledTimes(1);
        expect(scene.context.Session.State).toBe(GameState.Waiting);

        confirmStart(scene);

        expect(scene.context.Session.State).toBe(GameState.Playing);
        expect(scene.board.Build).toHaveBeenCalledTimes(1);
        expect(scene.scheduler.Scheduled).not.toBeNull();
        expect(scene.scheduler.Interval).toBe(1);
    });

    it('если стартовый диалог не открылся, матч стартует сразу', () => {
        const scene = createScene({ startDialog: false });

        scene.controller.Start();

        expect(scene.context.Session.State).toBe(GameState.Playing);
        expect(scene.board.Build).toHaveBeenCalledTimes(1);
    });

    it('пауза останавливает ввод, снятие паузы возвращает его', () => {
        const scene = createScene({ startDialog: false });
        scene.controller.Start();
        setBoard(scene.context.Session.Board, groupOfThree);
        const onPause = scene.dialogs.SetPauseHandler.mock.calls[0][0];

        onPause(true);
        expect(scene.context.Session.ClickCell(4, 4).Accepted).toBe(false);

        onPause(false);
        expect(scene.context.Session.ClickCell(4, 4).Accepted).toBe(true);
        expect(scene.hud.SetTime).toHaveBeenCalled();
    });

    it('истечение таймера завершает матч, снимает тик и открывает финальный диалог', () => {
        const scene = createScene({ startDialog: false });
        scene.controller.Start();

        expireByTimer(scene);

        expect(scene.context.Session.State).toBe(GameState.Finished);
        expect(scene.dialogs.OpenEndDialog).toHaveBeenCalledTimes(1);
        expect(scene.dialogs.OpenEndDialog.mock.calls[0][0].Result).toBe(GameResult.Lose);
        expect(scene.scheduler.Unscheduled).toBe(scene.scheduler.Scheduled);
    });

    it('«Заново» после поражения перезапускает уровень с новым вариантом поля', () => {
        const scene = createScene({ startDialog: false });
        scene.controller.Start();
        const finished = scene.context.Session;
        const level = finished.Level;
        const variant = finished.FieldVariant;
        expireByTimer(scene);

        const onRestart = scene.dialogs.OpenEndDialog.mock.calls[0][1];
        onRestart();

        expect(scene.context.Session).not.toBe(finished);
        expect(scene.context.Session.Level).toBe(level);
        expect(scene.context.Session.FieldVariant).toBe(variant + 1);
        expect(scene.context.Session.State).toBe(GameState.Playing);
        expect(scene.board.Build).toHaveBeenCalledTimes(2);
        expect(scene.hud.Bind).toHaveBeenLastCalledWith(scene.context.Session);
    });

    it('LoadField переключает вариант поля и сразу начинает новый матч', () => {
        const scene = createScene({ startDialog: false });
        scene.controller.Start();

        scene.controller.LoadField(1);

        expect(scene.context.Session.FieldVariant).toBe(1);
        expect(scene.context.Session.State).toBe(GameState.Playing);
        expect(scene.board.Build).toHaveBeenCalledTimes(2);
    });

    it('Dispose снимает тик и только свой обработчик паузы', () => {
        const scene = createScene({ startDialog: false });
        scene.controller.Start();
        const handler = scene.dialogs.SetPauseHandler.mock.calls[0][0];

        scene.controller.Dispose();

        expect(scene.scheduler.Unscheduled).toBe(scene.scheduler.Scheduled);
        expect(scene.dialogs.ClearPauseHandler).toHaveBeenCalledWith(handler);
    });

    it('Start связывает панель бустеров с матчем и её клики', () => {
        const scene = createScene({ startDialog: false });
        scene.controller.Start();

        expect(scene.boosters.Bind).toHaveBeenCalledWith(
            scene.context.Session.Boosters, scene.context.Session.Rules
        );
        expect(scene.boosters.SetClickHandler).toHaveBeenCalledTimes(1);
        const onBoosterClick = scene.boosters.SetClickHandler.mock.calls[0][0];

        onBoosterClick(BoosterType.Bomb);

        expect(scene.boosters.Select).toHaveBeenCalledWith(BoosterType.Bomb);
    });

    it('после перезапуска панель бустеров привязывается к новому матчу', () => {
        const scene = createScene({ startDialog: false });
        scene.controller.Start();
        expireByTimer(scene);
        const onRestart = scene.dialogs.OpenEndDialog.mock.calls[0][1];

        onRestart();

        expect(scene.boosters.Bind).toHaveBeenCalledTimes(2);
        expect(scene.boosters.Bind).toHaveBeenLastCalledWith(
            scene.context.Session.Boosters, scene.context.Session.Rules
        );
    });
});
