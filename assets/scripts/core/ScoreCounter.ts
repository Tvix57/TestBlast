import { AbstractDispatcher } from './Dispatcher';

export interface IScoreHandler {
    OnScoreChanged(score: number): void;
}

export class ScoreCounter extends AbstractDispatcher<IScoreHandler> {
    private _score: number = 0;

    public Get(): number {
        return this._score;
    }

    public Add(value: number): void {
        if (value === 0) {
            return;
        }
        this._score += value;
        this._dispatcher.Post((handler) => handler.OnScoreChanged(this._score));
    }

    public Reset(): void {
        this._score = 0;
        this._dispatcher.Post((handler) => handler.OnScoreChanged(this._score));
    }
}
