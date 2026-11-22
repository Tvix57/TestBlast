import { Board } from '../../core/Board';
import { Cell, ICell } from '../../core/Cell';
import { IAnimationConfig } from '../../core/Config';
import { Tile } from '../../core/Tile';
import { IBlastStep, IDropTilesStep, IRefillStep, IShuffleStep, ISuperSpawn, ISwapStep } from '../../core/TurnResult';
import { ITurnStep } from '../../core/TurnResult';
import { TurnStepType } from '../../core/TurnStepType';
import { IBoardStage } from '../IBoardStage';
import { BoardLayout, IBoardMetrics, IBoardPosition } from '../layout/BoardLayout';
import { TileView } from '../TileView';

enum BoardActivity {
    Idle,
    Building,
    Playing,
    Invalid
}

export class BoardController {
    private _stage: IBoardStage;
    private _board: Board = null;
    private _animation: IAnimationConfig = null;
    private _clickHandler: (cell: ICell) => void = null;
    private _views: (TileView | null)[][] = [];
    private _byTileId: Map<number, TileView> = new Map();
    private _metrics: IBoardMetrics = { cellSize: 0, step: 0, boardWidth: 0, boardHeight: 0 };
    private _activity: BoardActivity = BoardActivity.Idle;
    private _token: number = 0;
    private _selectedCell: ICell = null;

    constructor(stage: IBoardStage, board: Board, animation: IAnimationConfig) {
        this._stage = stage;
        this._board = board;
        this._animation = animation;
        this._views = this.createCellIndex();
    }

    public SetClickHandler(handler: (cell: ICell) => void): void {
        this._clickHandler = handler;
    }

    public Lock(): void {
        this._activity = BoardActivity.Playing;
    }

    public Unlock(): void {
        if (this._activity !== BoardActivity.Playing) {
            return;
        }
        this.finishActivity();
    }

    public SetSelected(cell: ICell | null): void {
        const previous = this._selectedCell;
        this._selectedCell = cell;
        if (previous && (!cell || !Cell.Same(previous, cell))) {
            const view = this.getViewByCell(previous);
            if (view && view.isValid) {
                view.PlaySelected(false);
            }
        }
        if (!cell) {
            return;
        }
        const view = this.getViewByCell(cell);
        if (view && view.isValid) {
            view.PlaySelected(true);
        }
    }

    public OnTileClick(cell: ICell): void {
        if (this.isBusy || !this._clickHandler) {
            return;
        }
        this._clickHandler(cell);
    }

    public Dispose(): void {
        this._token++;
        this._activity = BoardActivity.Idle;
        this._clickHandler = null;
        this._views = [];
        this._byTileId.clear();
    }

    public Build(): Promise<void> {
        const token = ++this._token;
        this._activity = BoardActivity.Idle;

        if (!this._board || !this._animation) {
            this._stage.ReportError('BoardController: Build вызван до Init');
            return Promise.resolve();
        }

        this.clearViews();
        this.updateMetrics();
        this._activity = BoardActivity.Building;

        const appear: Promise<void>[] = [];
        const stagger = this._animation.boardAppearStagger;
        try {
            this._board.GetPlacements().forEach((placement) => {
                const cell = placement.Cell;
                const view = this.spawnView(placement.Tile, cell, cell.Row);
                if (!view) {
                    return;
                }
                const delay = (cell.Row + cell.Col) * stagger;
                appear.push(view.PlayAppear(this._animation.boardAppearDuration, delay));
            });
        } catch (error) {
            this._activity = BoardActivity.Idle;
            this._stage.ReportError('BoardController: не удалось собрать поле: ' + error);
            return Promise.resolve();
        }

        return Promise.all(appear).then(() => {
            if (token !== this._token || this._activity !== BoardActivity.Building) {
                return;
            }
            this.finishActivity();
        });
    }

    public PlaySteps(steps: ITurnStep[]): Promise<void> {
        const token = ++this._token;
        let chain: Promise<void> = Promise.resolve();
        steps.forEach((step) => {
            chain = chain.then(() => token === this._token ? this.playStep(step) : undefined);
        });
        return chain;
    }

    public PlayInvalid(cell: ICell): Promise<void> {
        if (this.isBusy || !this._animation) {
            return Promise.resolve();
        }
        const view = this.getViewByCell(cell);
        if (!view) {
            return Promise.resolve();
        }
        const token = ++this._token;
        this._activity = BoardActivity.Invalid;
        const done = () => {
            if (token !== this._token || this._activity !== BoardActivity.Invalid) {
                return;
            }
            this.finishActivity();
        };
        return view.PlayInvalid(this._animation.invalidShakeDuration, this._animation.invalidShakeOffset).then(done, done);
    }

    public RefreshLayout(): void {
        if (!this._board || this.isBusy) {
            return;
        }
        this.updateMetrics();
        if (!(this._metrics.cellSize > 0)) {
            return;
        }
        this._views.forEach((line) => {
            line.forEach((view) => {
                if (view && view.isValid && view.Cell) {
                    this.placeView(view);
                }
            });
        });
    }

    private get isBusy(): boolean {
        return this._activity !== BoardActivity.Idle;
    }

    private finishActivity(): void {
        this._activity = BoardActivity.Idle;
        this.RefreshLayout();
    }

    private playStep(step: ITurnStep): Promise<void> {
        switch (step.Type) {
            case TurnStepType.Blast:
                return this.playBlast(step);
            case TurnStepType.DropTiles:
                return this.playDropTiles(step);
            case TurnStepType.Refill:
                return this.playRefill(step);
            case TurnStepType.Shuffle:
                return this.playShuffle(step);
            case TurnStepType.Swap:
                return this.playSwap(step);
            default:
                return Promise.resolve();
        }
    }

    private playBlast(step: IBlastStep): Promise<void> {
        const token = this._token;
        return this.blastCells(step.Primary, 0)
            .then(() => {
                if (token !== this._token) {
                    return undefined;
                }
                return this.blastCells(step.Chain || [], 0.03);
            })
            .then(() => {
                if (token !== this._token) {
                    return undefined;
                }
                return this.spawnSuper(step.Spawned);
            });
    }

    private spawnSuper(spawn: ISuperSpawn): Promise<void> {
        if (!spawn) {
            return Promise.resolve();
        }
        const view = this.spawnView(spawn.Tile, spawn.Cell, spawn.Cell.Row);
        if (!view) {
            return Promise.resolve();
        }
        return view.PlaySuperSpawn(this._animation.superSpawnDuration);
    }

    private blastCells(cells: ICell[], startDelay: number): Promise<void> {
        const animation = this._animation;
        const token = this._token;
        const promises: Promise<void>[] = [];
        cells.forEach((cell, index) => {
            const view = this.getViewByCell(cell);
            if (!view) {
                return;
            }
            promises.push(view.PlayBlast(animation.blastDuration, startDelay + index * animation.blastStagger, animation.blastScale));
        });
        return Promise.all(promises).then(() => {
            if (token !== this._token) {
                return;
            }
            cells.forEach((cell) => this.destroyView(this.getViewByCell(cell)));
        });
    }

    private playDropTiles(step: IDropTilesStep): Promise<void> {
        const animation = this._animation;
        const promises: Promise<void>[] = [];
        step.Moves.forEach((move) => {
            const view = this.findViewByTile(move.Tile);
            if (!view) {
                return;
            }
            this.moveView(view, move.To);
            const target = this.positionOf(move.To.Row, move.To.Col);
            promises.push(view.MoveTo(target.x, target.y, animation.fallDuration, animation.fallEasing));
        });
        return Promise.all(promises).then(() => undefined);
    }

    private playRefill(step: IRefillStep): Promise<void> {
        const animation = this._animation;
        const promises: Promise<void>[] = [];
        step.Spawns.forEach((spawn) => {
            const view = this.spawnView(spawn.Tile, spawn.Cell, spawn.FromRow);
            if (!view) {
                return;
            }
            const target = this.positionOf(spawn.Cell.Row, spawn.Cell.Col);
            promises.push(view.PlaySpawnFall(target.x, target.y, animation.spawnDuration, 0));
        });
        return Promise.all(promises).then(() => undefined);
    }

    private playShuffle(step: IShuffleStep): Promise<void> {
        const animation = this._animation;
        const promises: Promise<void>[] = [];
        step.Placements.forEach((placement) => {
            const view = this.findViewByTile(placement.Tile);
            if (!view) {
                return;
            }
            this.moveView(view, placement.Cell);
            const target = this.positionOf(placement.Cell.Row, placement.Cell.Col);
            promises.push(view.PlayShuffleMove(target.x, target.y, animation.shuffleDuration));
        });
        return Promise.all(promises).then(() => undefined);
    }

    private playSwap(step: ISwapStep): Promise<void> {
        const animation = this._animation;
        const firstView = this.getViewByCell(step.First);
        const secondView = this.getViewByCell(step.Second);
        if (!firstView && !secondView) {
            return Promise.resolve();
        }
        if (firstView) {
            this.removeCellEntry(step.First, firstView);
        }
        if (secondView) {
            this.removeCellEntry(step.Second, secondView);
        }
        if (firstView) {
            firstView.SetCell(step.Second);
            this.setViewByCell(step.Second, firstView);
        }
        if (secondView) {
            secondView.SetCell(step.First);
            this.setViewByCell(step.First, secondView);
        }
        const promises: Promise<void>[] = [];
        if (firstView) {
            const target = this.positionOf(step.Second.Row, step.Second.Col);
            promises.push(firstView.MoveTo(target.x, target.y, animation.swapDuration, 'quadInOut'));
        }
        if (secondView) {
            const target = this.positionOf(step.First.Row, step.First.Col);
            promises.push(secondView.MoveTo(target.x, target.y, animation.swapDuration, 'quadInOut'));
        }
        return Promise.all(promises).then(() => undefined);
    }

    private clearViews(): void {
        this._selectedCell = null;
        this._views = this.createCellIndex();
        this._byTileId.clear();
        this._stage.ClearTiles();
    }

    private createCellIndex(): (TileView | null)[][] {
        const index: (TileView | null)[][] = [];
        const rows = this._board ? this._board.Rows : 0;
        const columns = this._board ? this._board.Columns : 0;
        for (let row = 0; row < rows; row++) {
            const line: (TileView | null)[] = [];
            for (let col = 0; col < columns; col++) {
                line.push(null);
            }
            index.push(line);
        }
        return index;
    }

    private updateMetrics(): void {
        const board = this._board;
        if (!board) {
            return;
        }
        const scale = this._stage.GetScale();
        const metrics = BoardLayout.Fit(board.Rows, board.Columns, this._stage.GetGridSize(), board.CellGapRatio);
        this._metrics = {
            cellSize: metrics.cellSize / scale,
            step: metrics.step / scale,
            boardWidth: metrics.boardWidth / scale,
            boardHeight: metrics.boardHeight / scale
        };
    }

    private positionOf(row: number, col: number): IBoardPosition {
        const rows = this._board ? this._board.Rows : 1;
        const columns = this._board ? this._board.Columns : 1;
        return BoardLayout.Position(rows, columns, this._metrics.step, row, col);
    }

    private spawnView(tile: Tile, cell: ICell, fromRow: number): TileView {
        const view = this._stage.CreateTileView();
        if (!view) {
            return null;
        }
        view.SetTile(tile, cell);
        view.SetCellSize(this._metrics.cellSize);
        const position = this.positionOf(fromRow, cell.Col);
        view.PlaceAt(position.x, position.y);
        this.setViewByCell(cell, view);
        if (tile) {
            this._byTileId.set(tile.Id, view);
        }
        return view;
    }

    private moveView(view: TileView, cell: ICell): void {
        const previous = view.Cell;
        if (previous) {
            this.removeCellEntry(previous, view);
        }
        view.SetCell(cell);
        this.setViewByCell(cell, view);
    }

    private placeView(view: TileView): void {
        const cell = view.Cell;
        if (!cell) {
            return;
        }
        view.SetCellSize(this._metrics.cellSize);
        const position = this.positionOf(cell.Row, cell.Col);
        view.PlaceAt(position.x, position.y);
    }

    private findViewByTile(tile: Tile): TileView {
        if (!tile) {
            return null;
        }
        return this._byTileId.get(tile.Id) || null;
    }

    private destroyView(view: TileView): void {
        if (!view || !view.isValid) {
            return;
        }
        if (view.Tile) {
            this._byTileId.delete(view.Tile.Id);
        }
        if (view.Cell) {
            if (this._selectedCell && Cell.Same(this._selectedCell, view.Cell)) {
                this._selectedCell = null;
            }
            this.removeCellEntry(view.Cell, view);
        }
        this._stage.ReleaseTileView(view);
    }

    private removeCellEntry(cell: ICell, view: TileView): void {
        if (this.getViewByCell(cell) === view) {
            this.setViewByCell(cell, null);
        }
    }

    private getViewByCell(cell: ICell): TileView {
        if (!cell || !this.isInsideIndex(cell)) {
            return null;
        }
        return this._views[cell.Row][cell.Col] || null;
    }

    private setViewByCell(cell: ICell, view: TileView): void {
        if (!cell || !this.isInsideIndex(cell)) {
            return;
        }
        this._views[cell.Row][cell.Col] = view;
    }

    private isInsideIndex(cell: ICell): boolean {
        const line = this._views[cell.Row];
        return !!line && cell.Col >= 0 && cell.Col < line.length;
    }
}
