import { GameSession } from '../../core/GameSession';
import { IMovesHandler } from '../../core/MovesCounter';
import { ITimerHandler } from '../../core/MatchTimer';
import { IScoreHandler } from '../../core/ScoreCounter';
import { IHudView } from '../IHudView';

export class HudController implements IScoreHandler, IMovesHandler, ITimerHandler {
    private _view: IHudView;
    private _session: GameSession;

    constructor(view: IHudView, session: GameSession) {
        this._view = view;
        this._session = session;

        session.Score.AddHandler(this);
        session.Moves.AddHandler(this);
        session.Timer.AddHandler(this);

        this.sync();
    }

    public Dispose(): void {
        this._session.Score.RemoveHandler(this);
        this._session.Moves.RemoveHandler(this);
        this._session.Timer.RemoveHandler(this);
    }

    public OnScoreChanged(score: number): void {
        this._view.SetScore(score);
    }

    public OnMovesChanged(left: number, limit: number): void {
        this._view.SetMoves(left, limit);
    }

    public OnTimeChanged(remainingSeconds: number, limitSeconds: number): void {
        this._view.SetTime(remainingSeconds, limitSeconds);
    }

    private sync(): void {
        const session = this._session;

        this._view.SetTarget(session.TargetScore);
        this._view.SetScore(session.Score.Get());
        this._view.SetMoves(session.Moves.Left, session.Moves.Limit);
        this._view.SetTime(session.Timer.Remaining, session.Timer.Limit);
    }
}
