import { BoosterType } from '../../core/BoosterRules';

const { ccclass, property } = cc._decorator;

@ccclass
export class BoosterButtonView extends cc.Component {
    @property(cc.Sprite)
    public icon: cc.Sprite = null;

    @property(cc.Label)
    public countLabel: cc.Label = null;

    @property(cc.SpriteFrame)
    public bombIcon: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    public teleportIcon: cc.SpriteFrame = null;

    private _type: BoosterType | null = null;
    private _clickHandler: (type: BoosterType) => void = null;
    private _selectedScale: number = 1.08;

    public get Type(): BoosterType | null {
        return this._type;
    }

    public Setup(type: BoosterType, clickHandler: (type: BoosterType) => void): void {
        this._type = type;
        this._clickHandler = clickHandler;
        if (this.icon) {
            const frame = this.resolveIcon(type);
            if (frame) {
                this.icon.spriteFrame = frame;
            }
        }
        this.SetSelected(false);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    public SetCount(count: number): void {
        if (this.countLabel) {
            this.countLabel.string = String(count);
        }
        this.node.opacity = count > 0 ? 255 : 130;
    }

    public SetSelected(selected: boolean): void {
        cc.Tween.stopAllByTarget(this.node);
        cc.tween(this.node).to(0.12, { scale: selected ? this._selectedScale : 1 }, { easing: 'quadOut' }).start();
    }

    public PlayUnavailable(): void {
        const startX = this.node.x;
        cc.tween(this.node)
            .by(0.06, { position: cc.v3(8, 0, 0) })
            .by(0.06, { position: cc.v3(-16, 0, 0) })
            .by(0.06, { position: cc.v3(8, 0, 0) })
            .call(() => {
                this.node.x = startX;
            })
            .start();
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    private resolveIcon(type: BoosterType): cc.SpriteFrame {
        if (type === BoosterType.Bomb) {
            return this.bombIcon;
        }
        if (type === BoosterType.Teleport) {
            return this.teleportIcon;
        }
        return null;
    }

    private onTouchEnd(): void {
        if (this._type !== null && this._clickHandler) {
            this._clickHandler(this._type);
        }
    }
}
