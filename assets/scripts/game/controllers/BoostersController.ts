import { BoosterInventory, IBoosterHandler } from '../../core/BoosterInventory';
import { BoosterType } from '../../core/BoosterRules';
import { IBoostersView } from '../IBoostersView';

export class BoostersController implements IBoosterHandler {
    private _inventory: BoosterInventory;
    private _view: IBoostersView;

    constructor(view: IBoostersView, inventory: BoosterInventory) {
        this._view = view;
        this._inventory = inventory;
        this._inventory.AddHandler(this);
    }

    public Dispose(): void {
        this._inventory.RemoveHandler(this);
    }

    public OnBoosterCountChanged(type: BoosterType, count: number): void {
        this._view.SetCount(type, count);
    }
}
