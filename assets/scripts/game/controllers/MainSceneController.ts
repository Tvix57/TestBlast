import { GameContext } from '../../core/GameContext';
import { GameResult, GameState } from '../../core/GameResult';
import { GameSession } from '../../core/GameSession';
import { DialogsController } from '../dialogs/DialogsController';
import { GameController } from '../GameController';
import { IBoardView } from '../IBoardView';
import { IBoostersView } from '../IBoostersView';
import { Root } from '../Root';
import { HudView } from '../views/HudView';
import { IMatchScheduler, MatchTicker } from './MatchTicker';

export class MainSceneController {
    private _context: GameContext;
    private _dialogs: DialogsController;
    private _boardView: IBoardView;
    private _hudView: HudView;
    private _boostersView: IBoostersView;
    private _gameController: GameController = null;
    private _pauseHandler: (paused: boolean) => void = null;
    private _ticker: MatchTicker;

    public static Create(
        boardView: IBoardView,
        hudView: HudView,
        scheduler: IMatchScheduler,
        boostersView: IBoostersView
    ): MainSceneController {
        return new MainSceneController(
            Root.Instance.Context, new DialogsController(), boardView, hudView, scheduler, boostersView
        );
    }

    constructor(
        context: GameContext,
        dialogs: DialogsController,
        boardView: IBoardView,
        hudView: HudView,
        scheduler: IMatchScheduler,
        boostersView: IBoostersView
    ) {
        this._context = context;
        this._dialogs = dialogs;
        this._boardView = boardView;
        this._hudView = hudView;
        this._boostersView = boostersView;
        this._ticker = new MatchTicker(
            scheduler,
            () => this.session.Timer,
            (remainingSeconds: number, limitSeconds: number) => this._hudView.SetTime(remainingSeconds, limitSeconds),
            () => this.expireMatch()
        );
    }

    public Start(): void {
        this.bindPause();
        this.bindGame();
        if (!this._dialogs.OpenStartDialog(() => this.startMatch())) {
            this.startMatch();
        }
    }

    public ResumeTimer(): void {
        this.startTicker();
    }

    public SuspendTimer(): void {
        this._ticker.Stop();
    }

    public Dispose(): void {
        this._ticker.Stop();
        this.clearPause();
    }

    public LoadField(fieldVariant: number): void {
        this.startNewMatch(() => this._context.LoadField(fieldVariant));
    }

    private get session(): GameSession {
        return this._context.Session;
    }

    private bindGame(): void {
        const session = this.session;

        this._boardView.Init(session.Board, session.Config.animation);
        this._hudView.Bind(session);
        this._boostersView.Bind(session.Boosters, session.Rules);

        const gameController = new GameController(session, this._boardView, this._boostersView);
        this._gameController = gameController;
        this._gameController.OnFinished = (result: GameResult) => {
            this._ticker.Stop();
            this.showEndDialog(result);
        };
        this._boardView.SetClickHandler((cell) => gameController.OnCellClick(cell));
        this._boostersView.SetClickHandler((type) => gameController.OnBoosterClick(type));
    }

    private startMatch(): void {
        this._gameController.Start();
        this.startTicker();
    }

    private startNewMatch(transition: () => void): void {
        transition();
        this.bindGame();
        this.startMatch();
    }

    private startTicker(): void {
        if (this.session.State !== GameState.Playing) {
            return;
        }
        this._ticker.Start();
    }

    private expireMatch(): void {
        if (this._gameController) {
            this._gameController.ExpireTimer();
        }
    }

    private bindPause(): void {
        this._pauseHandler = (paused) => {
            const session = this.session;
            if (paused) {
                session.Pause();
            } else {
                session.Resume();
            }
            this._ticker.Refresh();
        };
        this._dialogs.SetPauseHandler(this._pauseHandler);
    }

    private clearPause(): void {
        if (!this._pauseHandler) {
            return;
        }
        this._dialogs.ClearPauseHandler(this._pauseHandler);
        this._pauseHandler = null;
    }

    private showEndDialog(result: GameResult): void {
        const session = this.session;
        this._dialogs.OpenEndDialog({
            Result: result,
            Score: session.Score.Get(),
            Target: session.TargetScore,
            MovesLeft: session.Moves.Left,
            MovesLimit: session.Moves.Limit
        }, () => this.restart(result));
    }

    private restart(result: GameResult): void {
        const context = this._context;
        this.startNewMatch(() => {
            if (result === GameResult.Win) {
                context.NextLevel();
            } else {
                context.RestartLevel();
            }
        });
    }
}
