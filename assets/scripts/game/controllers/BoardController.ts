import { Board } from '../../core/Board';
import { ICell } from '../../core/Cell';
import { IAnimationConfig } from '../../core/Config';
import { Tile } from '../../core/Tile';
import { IDropTilesStep, IRefillStep, IShuffleStep } from '../../core/TurnResult';
import { ITurnStep, TurnStepType } from '../../core/TurnStepType';
import { IBoardStage } from '../IBoardStage';
import { BoardLayout, IBoardMetrics, IBoardPosition } from '../layout/BoardLayout';
import { TileView } from '../TileView';

/** Активность поля: ввод и раскладка ждут, пока поле не вернётся в `Idle`. */
enum BoardActivity {
    Idle,
    Building,
    Playing,
    Invalid
}

/**
 * Контроллер поля: модель, индексы видов, раскладка и цепочки шагов хода — без `cc`.
 *
 * Вид (`BoardView`) остаётся тонким адаптером: даёт контроллеру порты отрисовки
 * (`IBoardStage`), а `IBoardView` транслирует наружу его публичные вызовы.
 * Один индекс клеток заменяет вторую карту «тайл → вид»: поиск по тайлу идёт
 * по той же матрице (поле ≤ 81 клетки). Вместо трёх токенов и трёх флагов
 * анимации — одно поколение действий и одно состояние активности.
 */
export class BoardController {
    private _stage: IBoardStage;
    private _board: Board = null;
    private _animation: IAnimationConfig = null;
    private _clickHandler: (cell: ICell) => void = null;
    /** Индекс вью по клеткам: матрица rows × columns, повторяет форму поля. */
    private _views: (TileView | null)[][] = [];
    /** Сторона квадратной ячейки и шаг сетки в локальных координатах поля. */
    private _metrics: IBoardMetrics = { cellSize: 0, step: 0, boardWidth: 0, boardHeight: 0 };
    private _activity: BoardActivity = BoardActivity.Idle;
    /** Поколение действий: Build/PlaySteps/PlayInvalid обрывают незавершённые цепочки. */
    private _token: number = 0;

    constructor(stage: IBoardStage, board: Board, animation: IAnimationConfig) {
        this._stage = stage;
        this._board = board;
        this._animation = animation;
        this._views = this.createCellIndex();
    }

    public SetClickHandler(handler: (cell: ICell) => void): void {
        this._clickHandler = handler;
    }

    /** Ход анимации: ввод закрыт до `Unlock`. */
    public Lock(): void {
        this._activity = BoardActivity.Playing;
    }

    public Unlock(): void {
        if (this._activity !== BoardActivity.Playing) {
            return;
        }
        this.finishActivity();
    }

    /** Клик тайла: пока идёт появление/ход/отказ, ввод игнорируется. */
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
    }

    /** Полная пересборка поля по состоянию модели (старт матча). */
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
                return this.blastCells(step.Primary);
            case TurnStepType.DropTiles:
                return this.playDropTiles(step);
            case TurnStepType.Refill:
                return this.playRefill(step);
            case TurnStepType.Shuffle:
                return this.playShuffle(step);
            default:
                return Promise.resolve();
        }
    }

    private blastCells(cells: ICell[]): Promise<void> {
        const animation = this._animation;
        const token = this._token;
        const promises: Promise<void>[] = [];
        cells.forEach((cell, index) => {
            const view = this.getViewByCell(cell);
            if (!view) {
                return;
            }
            promises.push(view.PlayBlast(animation.blastDuration, index * animation.blastStagger, animation.blastScale));
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

    private clearViews(): void {
        this._views = this.createCellIndex();
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
        for (let row = 0; row < this._views.length; row++) {
            const line = this._views[row];
            for (let col = 0; col < line.length; col++) {
                const view = line[col];
                if (view && view.Tile === tile) {
                    return view;
                }
            }
        }
        return null;
    }

    private destroyView(view: TileView): void {
        if (!view || !view.isValid) {
            return;
        }
        if (view.Cell) {
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
