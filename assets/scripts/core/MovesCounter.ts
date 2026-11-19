import { AbstractDispatcher } from './Dispatcher';

export interface IMovesHandler {
    OnMovesChanged(left: number, limit: number): void;
}

export class MovesCounter extends AbstractDispatcher<IMovesHandler> {
    private _limit: number = 0;
    private _left: number = 0;

    public get IsEnabled(): boolean {
        return this._limit > 0;
    }

    public get Limit(): number {
        return this._limit;
    }

    public get Left(): number {
        return this._left;
    }

    public Configure(limit: number): void {
        this._limit = Math.max(0, limit);
        this._left = this._limit;
        this.Post();
    }

    public CanSpend(): boolean {
        return !this.IsEnabled || this._left > 0;
    }

    public Spend(): void {
        if (!this.IsEnabled || this._left <= 0) {
            return;
        }
        this._left--;
        this.Post();
    }

    public Reset(): void {
        this._left = this._limit;
        this.Post();
    }

    private Post(): void {
        this._dispatcher.Post((handler) => handler.OnMovesChanged(this._left, this._limit));
    }
}
