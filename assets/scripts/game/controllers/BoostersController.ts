import { BoosterInventory, IBoosterHandler } from '../../core/BoosterInventory';
import { BoosterType } from '../../core/BoosterRules';
import { BoostersView } from '../views/BoostersView';

export class BoostersController implements IBoosterHandler {
    private _inventory: BoosterInventory;
    private _view: BoostersView;

    constructor(view: BoostersView, inventory: BoosterInventory) {
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
