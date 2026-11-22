import { Cell } from '../assets/scripts/core/Cell';
import { GameResult, GameState } from '../assets/scripts/core/GameResult';
import { GameController } from '../assets/scripts/game/GameController';
import {
    checkerboard, createBoardView, createClock, createDeferred, createGame, flushPromises, setBoard, withCells
} from './helpers';

const groupOfThree = withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]);

describe('GameController: ввод, анимации и финал', () => {
    it('Start запускает модель и пересобирает поле', () => {
        const game = createGame();
        const view = createBoardView();
        const controller = new GameController(game, view as any);

        controller.Start();

        expect(game.State).toBe(GameState.Playing);
        expect(view.Build).toHaveBeenCalledTimes(1);
    });

    it('до старта матча клик не доходит до вида', () => {
        const game = createGame();
        const view = createBoardView();
        const controller = new GameController(game, view as any);

        controller.OnCellClick(Cell.Create(4, 4));

        expect(view.PlayInvalid).not.toHaveBeenCalled();
        expect(view.PlaySteps).not.toHaveBeenCalled();
        expect(game.State).toBe(GameState.Waiting);
    });

    it('после старта отклонённый ход проигрывает анимацию отказа', () => {
        const game = createGame();
        const view = createBoardView();
        const controller = new GameController(game, view as any);
        controller.Start();
        setBoard(game.Board, checkerboard());

        controller.OnCellClick(Cell.Create(4, 4));

        expect(view.PlayInvalid).toHaveBeenCalledWith(Cell.Create(4, 4));
        expect(view.PlaySteps).not.toHaveBeenCalled();
    });

    it('принятый ход блокирует ввод до конца анимации и один раз разблокирует', async () => {
        const game = createGame({ movesLimit: 3, targetScore: 100000 });
        const view = createBoardView();
        const animation = createDeferred<void>();
        view.PlaySteps.mockReturnValue(animation.promise);
        const controller = new GameController(game, view as any);
        controller.Start();
        setBoard(game.Board, groupOfThree);

        controller.OnCellClick(Cell.Create(4, 4));
        expect(view.Lock).toHaveBeenCalledTimes(1);
        expect(game.Moves.Left).toBe(2);

        // Повторный клик во время хода не запускает второй ход.
        controller.OnCellClick(Cell.Create(4, 4));
        expect(game.Moves.Left).toBe(2);
        expect(view.PlaySteps).toHaveBeenCalledTimes(1);

        animation.resolve();
        await flushPromises();

        expect(view.Unlock).toHaveBeenCalledTimes(1);
    });

    it('ошибка анимации не оставляет ввод заблокированным', async () => {
        const game = createGame({ movesLimit: 3, targetScore: 100000 });
        const view = createBoardView();
        view.PlaySteps.mockReturnValue(Promise.reject(new Error('animation failed')));
        const controller = new GameController(game, view as any);
        controller.Start();
        setBoard(game.Board, groupOfThree);

        controller.OnCellClick(Cell.Create(4, 4));
        await flushPromises();

        expect(view.Unlock).toHaveBeenCalledTimes(1);

        setBoard(game.Board, groupOfThree);
        controller.OnCellClick(Cell.Create(4, 4));
        expect(view.PlaySteps).toHaveBeenCalledTimes(2);
    });

    it('сообщает о финале один раз — после завершения анимации хода', async () => {
        const game = createGame({ targetScore: 30, timeLimitSeconds: 60 });
        const view = createBoardView();
        const controller = new GameController(game, view as any);
        const onFinished = jest.fn();
        controller.OnFinished = onFinished;
        controller.Start();
        setBoard(game.Board, groupOfThree);

        controller.OnCellClick(Cell.Create(4, 4));
        expect(onFinished).not.toHaveBeenCalled();

        await flushPromises();

        expect(game.State).toBe(GameState.Finished);
        expect(onFinished).toHaveBeenCalledTimes(1);
        expect(onFinished).toHaveBeenCalledWith(GameResult.Win);

        controller.ExpireTimer();
        controller.OnCellClick(Cell.Create(4, 3));
        expect(onFinished).toHaveBeenCalledTimes(1);
    });

    it('ExpireTimer завершает матч поражением и уведомляет сцену один раз', () => {
        const clock = createClock();
        const game = createGame({ timeLimitSeconds: 1, targetScore: 100000, clock: clock.now });
        const view = createBoardView();
        const controller = new GameController(game, view as any);
        const onFinished = jest.fn();
        controller.OnFinished = onFinished;
        controller.Start();

        clock.advance(2);
        controller.ExpireTimer();
        controller.ExpireTimer();

        expect(game.State).toBe(GameState.Finished);
        expect(game.Result).toBe(GameResult.Lose);
        expect(onFinished).toHaveBeenCalledTimes(1);
        expect(onFinished).toHaveBeenCalledWith(GameResult.Lose);
    });

    it('Start после финала снова разрешает ход и сбрасывает уведомление', async () => {
        const game = createGame({ targetScore: 30, timeLimitSeconds: 60 });
        const view = createBoardView();
        const controller = new GameController(game, view as any);
        const onFinished = jest.fn();
        controller.OnFinished = onFinished;
        controller.Start();
        setBoard(game.Board, groupOfThree);
        controller.OnCellClick(Cell.Create(4, 4));
        await flushPromises();
        expect(onFinished).toHaveBeenCalledTimes(1);

        controller.Start();

        expect(view.Build).toHaveBeenCalledTimes(2);
        expect(game.State).toBe(GameState.Playing);
        expect(game.Result).toBe(GameResult.None);
    });
});
