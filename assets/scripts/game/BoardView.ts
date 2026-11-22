import { Board } from '../core/Board';
import { ICell } from '../core/Cell';
import { IAnimationConfig } from '../core/Config';
import { ITurnStep } from '../core/TurnStepType';
import { BoardController } from './controllers/BoardController';
import { IBoardStage } from './IBoardStage';
import { IBoardView } from './IBoardView';
import { IBoardZoneSize } from './layout/BoardLayout';
import { TileView } from './TileView';

const { ccclass, property } = cc._decorator;

/**
 * Поле на сцене: Cocos-адаптер контроллера.
 *
 * Вид держит только ссылки префаба, события размеров и пул нод; решения, индексы
 * видов, раскладка и цепочки анимаций — в `BoardController`. Геометрию зоны, рамки
 * и подложки задают `cc.Widget` в префабе BoardZone: размер ноды Board — это уже
 * готовый прямоугольник сетки, без отступов. `GetGridSize`/`GetScale` отдают его
 * контроллеру в единицах зоны, а при изменении размера окна раскладка пересобирается.
 */
@ccclass
export class BoardView extends cc.Component implements IBoardView, IBoardStage {

    @property({ type: cc.Node, visible: true })
    public boardNode!: cc.Node;

    @property({ type: cc.Prefab, visible: true })
    public tilePrefab!: cc.Prefab;

    private _controller: BoardController = null;
    private _pool: cc.NodePool = new cc.NodePool();
    private _resizeScheduled: boolean = false;
    private _onResizeFrame: () => void = () => {
        this._resizeScheduled = false;
        this.refreshLayout();
    };

    protected onLoad(): void {
        this.node.on(cc.Node.EventType.SIZE_CHANGED, this.onZoneResized, this);
        if (this.boardNode) {
            this.boardNode.on(cc.Node.EventType.SIZE_CHANGED, this.onZoneResized, this);
        }
    }

    protected onEnable(): void {
        this.refreshLayout();
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.SIZE_CHANGED, this.onZoneResized, this);
        if (this.boardNode) {
            this.boardNode.off(cc.Node.EventType.SIZE_CHANGED, this.onZoneResized, this);
        }
        this.unschedule(this._onResizeFrame);
        this.disposeController();
        this._pool.clear();
    }

    public Init(board: Board, animation: IAnimationConfig): void {
        if (!board || !animation || !this.boardNode || !this.tilePrefab) {
            cc.error('BoardView: Init требует board, animation, boardNode и tilePrefab');
            return;
        }
        if (this.boardNode === this.node) {
            cc.error('BoardView: boardNode должен быть отдельной нодой внутри зоны, а не самой зоной');
            return;
        }
        this.disposeController();
        this._controller = new BoardController(this, board, animation);
    }

    public SetClickHandler(handler: (cell: ICell) => void): void {
        if (this._controller) {
            this._controller.SetClickHandler(handler);
        }
    }

    public SetSelected(cell: ICell | null): void {
        if (this._controller) {
            this._controller.SetSelected(cell);
        }
    }

    public Lock(): void {
        if (this._controller) {
            this._controller.Lock();
        }
    }

    public Unlock(): void {
        if (this._controller) {
            this._controller.Unlock();
        }
    }

    public Build(): Promise<void> {
        if (!this._controller) {
            cc.error('BoardView: Build вызван до Init');
            return Promise.resolve();
        }
        return this._controller.Build();
    }

    public PlaySteps(steps: ITurnStep[]): Promise<void> {
        return this._controller ? this._controller.PlaySteps(steps) : Promise.resolve();
    }

    public PlayInvalid(cell: ICell): Promise<void> {
        return this._controller ? this._controller.PlayInvalid(cell) : Promise.resolve();
    }

    public CreateTileView(): TileView | null {
        let node = this._pool.get();
        if (!node) {
            node = cc.instantiate(this.tilePrefab);
        }
        if (!node) {
            return null;
        }
        this.boardNode.addChild(node);
        const view = node.getComponent(TileView);
        if (!view) {
            cc.error('BoardView: в tilePrefab нет компонента TileView');
            node.destroy();
            return null;
        }
        view.ClickHandler = (cell: ICell) => this.forwardTileClick(cell);
        return view;
    }

    public ReleaseTileView(view: TileView): void {
        if (!view || !view.isValid) {
            return;
        }
        view.CancelAnimations();
        view.ClickHandler = null;
        view.ClearBinding();
        this._pool.put(view.node);
    }

    public ClearTiles(): void {
        if (!this.boardNode) {
            return;
        }
        this.boardNode.children.slice().forEach((child) => {
            const view = child.getComponent(TileView);
            if (view) {
                this.ReleaseTileView(view);
                return;
            }
            child.destroy();
        });
    }

    public GetGridSize(): IBoardZoneSize {
        const size = this.boardNode ? this.boardNode.getContentSize() : null;
        if (size && size.width > 0 && size.height > 0) {
            const scale = this.GetScale();
            return { width: size.width * scale, height: size.height * scale };
        }
        const zone = this.node.getContentSize();
        if (zone.width > 0 && zone.height > 0) {
            return { width: zone.width, height: zone.height };
        }
        const visible = cc.view.getVisibleSize();
        return { width: visible.width, height: visible.height };
    }

    public GetScale(): number {
        let scale = 1;
        let node = this.boardNode;
        while (node && node !== this.node) {
            scale *= node.scaleX;
            node = node.parent;
        }
        return isFinite(scale) && scale > 0 ? scale : 1;
    }

    public ReportError(message: string): void {
        cc.error(message);
    }

    private forwardTileClick(cell: ICell): void {
        if (this._controller) {
            this._controller.OnTileClick(cell);
        }
    }

    private refreshLayout(): void {
        if (this._controller) {
            this._controller.RefreshLayout();
        }
    }

    private onZoneResized(): void {
        if (this._resizeScheduled) {
            return;
        }
        this._resizeScheduled = true;
        this.scheduleOnce(this._onResizeFrame, 0);
    }

    private disposeController(): void {
        if (!this._controller) {
            return;
        }
        this._controller.Dispose();
        this._controller = null;
    }
}
