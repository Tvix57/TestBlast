import { ICell } from '../core/Cell';
import { Tile } from '../core/Tile';
import { ITileSize, TileUtil } from './TileUtil';

const { ccclass, property } = cc._decorator;

@ccclass
export class TileView extends cc.Component {
    @property(cc.Sprite)
    public body: cc.Sprite | null = null;

    @property(cc.SpriteAtlas)
    public atlas: cc.SpriteAtlas | null = null;

    public ClickHandler: (cell: ICell) => void = null;

    private _cell: ICell = null;
    private _tile: Tile = null;
    /** Резолвер текущей анимации: отмена твина должна завершать промис, иначе ход зависнет. */
    private _animationResolve: (() => void) | null = null;
    /** Натуральный размер арта: снимается один раз, до первой подгонки узла. */
    private _artSize: ITileSize = null;

    public get Cell(): ICell {
        return this._cell;
    }

    public get Tile(): Tile {
        return this._tile;
    }

    protected onLoad(): void {
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.CancelAnimations();
    }

    public CancelAnimations(): void {
        if (this.node && this.node.isValid) {
            cc.Tween.stopAllByTarget(this.node);
        }
        this.finishAnimation();
    }

    public ResetVisual(): void {
        this.CancelAnimations();
        this.node.opacity = 255;
        this.node.scale = 1;
        this.node.active = true;
    }

    public SetTile(tile: Tile, cell: ICell): void {
        this._tile = tile;
        this._cell = cell;
        this.ResetVisual();
        this.applyFrame(TileUtil.FrameName(tile));
    }

    public SetCellSize(cellSize: number): void {
        if (!(cellSize > 0)) {
            return;
        }
        const size = TileUtil.Fit(this.captureArtSize(), cellSize);
        this.node.setContentSize(size.width, size.height);
    }

    public SetCell(cell: ICell): void {
        this._cell = cell;
    }

    public PlaceAt(x: number, y: number): void {
        this.node.setPosition(x, y, 0);
    }

    public ClearBinding(): void {
        this._tile = null;
        this._cell = null;
    }

    private applyFrame(frameName: string): void {
        if (!this.body || !frameName) {
            return;
        }
        const atlas = this.resolveAtlas();
        const frame = atlas ? atlas.getSpriteFrame(frameName) : null;
        if (frame) {
            this.body.spriteFrame = frame;
        } else {
            cc.warn('TileView: кадр "' + frameName + '" не найден в атласе');
        }
    }

    private resolveAtlas(): cc.SpriteAtlas {
        if (this.atlas) {
            return this.atlas;
        }
        return this.body ? (this.body as any)._atlas || null : null;
    }

    private captureArtSize(): ITileSize {
        if (!this._artSize) {
            const size = this.node.getContentSize();
            this._artSize = {
                width: size.width > 0 ? size.width : 1,
                height: size.height > 0 ? size.height : 1
            };
        }
        return this._artSize;
    }

    public MoveTo(x: number, y: number, duration: number, easing: string = 'quadOut'): Promise<void> {
        if (duration <= 0) {
            this.CancelAnimations();
            this.PlaceAt(x, y);
            return Promise.resolve();
        }
        return this.playTween(() => cc.tween(this.node)
            .to(duration, { position: cc.v3(x, y, 0) }, { easing: easing }));
    }

    public PlayBlast(duration: number, delay: number, scaleUp: number): Promise<void> {
        return this.playTween(() => {
            const startScale = this.node.scale;
            return cc.tween(this.node)
                .delay(delay)
                .to(duration * 0.35, { scale: startScale * scaleUp, opacity: 220 }, { easing: 'quadOut' })
                .to(duration * 0.65, { scale: 0.05, opacity: 0 }, { easing: 'quadIn' });
        });
    }

    public PlaySpawnFall(x: number, y: number, duration: number, delay: number): Promise<void> {
        return this.playTween(() => {
            this.node.scale = 0.85;
            return cc.tween(this.node)
                .delay(delay)
                .to(duration, { position: cc.v3(x, y, 0), scale: 1 }, { easing: 'quadIn' });
        });
    }

    public PlayAppear(duration: number, delay: number): Promise<void> {
        return this.playTween(() => {
            this.node.scale = 0;
            return cc.tween(this.node)
                .delay(delay)
                .to(duration, { scale: 1 }, { easing: 'backOut' });
        });
    }

    public PlayInvalid(duration: number, offset: number): Promise<void> {
        return this.playTween(() => {
            const startX = this.node.x;
            const step = duration / 3;
            return cc.tween(this.node)
                .by(step, { position: cc.v3(offset, 0, 0) })
                .by(step, { position: cc.v3(-offset * 2, 0, 0) })
                .by(step, { position: cc.v3(offset, 0, 0) })
                .call(() => {
                    this.node.x = startX;
                });
        });
    }

    public PlayShuffleMove(x: number, y: number, duration: number): Promise<void> {
        return this.playTween(() => {
            this.node.scale = 0.9;
            return cc.tween(this.node)
                .to(duration, { position: cc.v3(x, y, 0), scale: 1 }, { easing: 'quadInOut' });
        });
    }

    private playTween(build: () => cc.Tween): Promise<void> {
        this.CancelAnimations();
        return new Promise<void>((resolve) => {
            this._animationResolve = resolve;
            build().call(() => this.finishAnimation()).start();
        });
    }

    private finishAnimation(): void {
        const resolve = this._animationResolve;
        this._animationResolve = null;
        if (resolve) {
            resolve();
        }
    }

    private onTouchEnd(): void {
        if (this.ClickHandler && this._cell) {
            this.ClickHandler(this._cell);
        }
    }
}
