import { BoosterInventory } from '../core/BoosterInventory';
import { BoosterRules, BoosterType } from '../core/BoosterRules';

export interface IBoostersView {
    Bind(inventory: BoosterInventory, rules: BoosterRules): void;
    SetClickHandler(handler: (type: BoosterType) => void): void;
    Select(type: BoosterType): void;
    ClearSelection(): void;
    PlayUnavailable(type: BoosterType): void;
}
