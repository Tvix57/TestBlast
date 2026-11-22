import { BoosterInventory } from '../../core/BoosterInventory';
import { BoosterRules, BoosterType } from '../../core/BoosterRules';
import { IBoostersView } from '../IBoostersView';
import { BoostersController } from '../controllers/BoostersController';
import { BoosterButtonView } from './BoosterButtonView';

const { ccclass, property } = cc._decorator;

@ccclass
export class BoostersView extends cc.Component implements IBoostersView {
    @property(cc.Prefab)
    public buttonPrefab: cc.Prefab | null = null;

    @property(cc.Node)
    public boosterLayout: cc.Node | null = null;

    private _buttons: Map<BoosterType, BoosterButtonView> = new Map();
    private _controller: BoostersController | null = null;
    private _clickHandler: (type: BoosterType) => void = null;

    public SetClickHandler(handler: (type: BoosterType) => void): void {
        this._clickHandler = handler;
    }

    public Bind(inventory: BoosterInventory, rules: BoosterRules): void {
        this.dispose();
        this.clearButtons();
        if (!this.buttonPrefab) {
            cc.error('BoostersView: не задан buttonPrefab');
            return;
        }
        const boosters = rules.GetBoosters();
        const container = this.getContainer();
        boosters.forEach((booster) => {
            const node = cc.instantiate(this.buttonPrefab);
            container.addChild(node);
            const view = node.getComponent(BoosterButtonView);
            if (!view) {
                cc.error('BoostersView: в buttonPrefab нет BoosterButtonView');
                return;
            }
            view.Setup(booster.type, (type: BoosterType) => this.onButtonClick(type));
            this._buttons.set(booster.type, view);
        });
        this._controller = new BoostersController(this, inventory);
        inventory.Configure(rules.GetBoosters());
    }

    public SetCount(type: BoosterType, count: number): void {
        const view = this._buttons.get(type);
        if (view) {
            view.SetCount(count);
        }
    }

    public Select(type: BoosterType): void {
        this._buttons.forEach((view, key) => {
            view.SetSelected(key === type);
        });
    }

    public ClearSelection(): void {
        this._buttons.forEach((view) => {
            view.SetSelected(false);
        });
    }

    public PlayUnavailable(type: BoosterType): void {
        const view = this._buttons.get(type);
        if (view) {
            view.PlayUnavailable();
        }
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private onButtonClick(type: BoosterType): void {
        if (this._clickHandler) {
            this._clickHandler(type);
        }
    }

    private clearButtons(): void {
        this._buttons.forEach((view) => {
            if (view && view.node && view.node.isValid) {
                view.node.destroy();
            }
        });
        this._buttons.clear();
    }

    private getContainer(): cc.Node {
        return this.boosterLayout ? this.boosterLayout : this.node;
    }

    private dispose(): void {
        if (this._controller) {
            this._controller.Dispose();
            this._controller = null;
        }
    }
}
