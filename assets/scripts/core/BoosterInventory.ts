import { BoosterType } from './BoosterRules';
import { IBoosterConfig } from './Config';
import { AbstractDispatcher } from './Dispatcher';

export interface IBoosterHandler {
    OnBoosterCountChanged(type: BoosterType, count: number): void;
}

export class BoosterInventory extends AbstractDispatcher<IBoosterHandler> {
    private _counts: Map<BoosterType, number> = new Map();

    public Configure(boosters: IBoosterConfig[]): void {
        this._counts.clear();
        boosters.forEach((booster) => {
            this._counts.set(booster.type, Math.max(0, booster.charges));
        });
        this.PostAll();
    }

    public GetCount(type: BoosterType): number {
        return this._counts.get(type) || 0;
    }

    public CanSpend(type: BoosterType): boolean {
        return this.GetCount(type) > 0;
    }

    public TrySpend(type: BoosterType): boolean {
        if (!this.CanSpend(type)) {
            return false;
        }
        this._counts.set(type, this.GetCount(type) - 1);
        this._dispatcher.Post((handler) => handler.OnBoosterCountChanged(type, this.GetCount(type)));
        return true;
    }

    public Reset(): void {
        this.PostAll();
    }

    private PostAll(): void {
        this._counts.forEach((count, type) => {
            this._dispatcher.Post((handler) => handler.OnBoosterCountChanged(type, count));
        });
    }
}
