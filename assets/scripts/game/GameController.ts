import { BoosterTargeting, BoosterType } from '../core/BoosterRules';
import { Cell, ICell } from '../core/Cell';
import { GameSession } from '../core/GameSession';
import { GameResult, GameState } from '../core/GameResult';
import { ITurnResult } from '../core/TurnResult';
import { IBoardView } from './IBoardView';
import { IBoostersView } from './IBoostersView';

export class GameController {
    public OnFinished: (result: GameResult) => void = null;

    private _game: GameSession;
    private _boardView: IBoardView;
    private _boostersView: IBoostersView;
    private _busy: boolean = false;
    private _finishNotified: boolean = false;
    private _selectedBooster: BoosterType | null = null;
    private _firstCell: ICell = null;

    constructor(game: GameSession, boardView: IBoardView, boostersView: IBoostersView) {
        this._game = game;
        this._boardView = boardView;
        this._boostersView = boostersView;
    }

    public Start(): void {
        this._busy = false;
        this._finishNotified = false;
        this.clearSelection();
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
        if (this._selectedBooster !== null) {
            this.handleBoosterTarget(cell);
            return;
        }
        this.playTurn(this._game.ClickCell(cell.Row, cell.Col), cell);
    }

    public OnBoosterClick(type: BoosterType): void {
        if (this._busy || this._game.State !== GameState.Playing) {
            return;
        }
        const booster = this._game.Rules.GetBooster(type);
        if (!booster) {
            this._boostersView.PlayUnavailable(type);
            return;
        }
        if (this._selectedBooster === booster.type) {
            this.clearSelection();
            return;
        }
        if (!this._game.Boosters.CanSpend(type)) {
            this._boostersView.PlayUnavailable(type);
            return;
        }
        this._selectedBooster = booster.type;
        this._firstCell = null;
        this._boardView.SetSelected(null);
        this._boostersView.Select(type);
    }

    private handleBoosterTarget(cell: ICell): void {
        const selected = this._selectedBooster;
        if (selected === null) {
            return;
        }
        const booster = this._game.Rules.GetBooster(selected);
        if (!booster) {
            this.clearSelection();
            return;
        }
        if (booster.targeting === BoosterTargeting.Pair) {
            this.handlePairTarget(cell, booster.type);
            return;
        }
        const result = this._game.UseBooster(booster.type, [cell]);
        if (!result.Accepted) {
            this._boardView.PlayInvalid(cell);
            return;
        }
        this.clearSelection();
        this.playTurn(result, cell);
    }

    private handlePairTarget(cell: ICell, type: BoosterType): void {
        if (!this._firstCell) {
            this._firstCell = cell;
            this._boardView.SetSelected(cell);
            return;
        }
        if (Cell.Same(this._firstCell, cell)) {
            this._firstCell = null;
            this._boardView.SetSelected(null);
            return;
        }
        const first = this._firstCell;
        this._firstCell = null;
        this._boardView.SetSelected(null);
        const result = this._game.UseBooster(type, [first, cell]);
        if (!result.Accepted) {
            this._boardView.PlayInvalid(cell);
            return;
        }
        this.clearSelection();
        this.playTurn(result, cell);
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
        this._boardView.PlaySteps(result.Steps).then(done, (error) => {
            if (typeof cc !== 'undefined' && cc.error) {
                cc.error('GameController: ошибка анимации хода: ' + error);
            }
            done();
        });
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

    private clearSelection(): void {
        this._selectedBooster = null;
        this._firstCell = null;
        this._boostersView.ClearSelection();
        this._boardView.SetSelected(null);
    }
}
