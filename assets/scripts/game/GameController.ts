import { ICell } from '../core/Cell';
import { GameSession } from '../core/GameSession';
import { GameResult, GameState } from '../core/GameResult';
import { ITurnResult } from '../core/TurnResult';
import { IBoardView } from './IBoardView';

export class GameController {
    public OnFinished: (result: GameResult) => void = null;

    private _game: GameSession;
    private _boardView: IBoardView;
    private _busy: boolean = false;
    private _finishNotified: boolean = false;

    constructor(game: GameSession, boardView: IBoardView) {
        this._game = game;
        this._boardView = boardView;
    }

    public Start(): void {
        this._busy = false;
        this._finishNotified = false;
        this._game.Start();
        this._boardView.Build();
    }

    public ExpireTimer(): void {
        if (this._game.State !== GameState.Playing) {
            return;
        }
        this._game.ExpireTimer();
        if (this._game.IsFinished) {
            this.notifyFinished();
        }
    }

    public OnCellClick(cell: ICell): void {
        if (this._busy || this._game.State !== GameState.Playing) {
            return;
        }
        this.playTurn(this._game.ClickCell(cell.Row, cell.Col), cell);
    }

    private playTurn(result: ITurnResult, cell: ICell): void {
        if (!result.Accepted) {
            this._boardView.PlayInvalid(cell);
            return;
        }
        this._busy = true;
        this._boardView.Lock();
        const done = () => {
            this._busy = false;
            this._boardView.Unlock();
            this.notifyFinished();
        };
        this._boardView.PlaySteps(result.Steps).then(done, done);
    }

    private notifyFinished(): void {
        if (this._busy || this._finishNotified) {
            return;
        }
        if (this._game.State !== GameState.Finished) {
            return;
        }
        this._finishNotified = true;
        if (this.OnFinished) {
            this.OnFinished(this._game.Result);
        }
    }
}
