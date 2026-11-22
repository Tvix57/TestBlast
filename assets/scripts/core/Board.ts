import { Cell, CeilType, ICell } from './Cell';
import { IBoardConfig } from './Config';
import { Random } from './Random';
import { Tile } from './Tile';

export interface ITileMove {
    Tile: Tile;
    From: ICell;
    To: ICell;
}

export interface ITileSpawn {
    Tile: Tile;
    Cell: ICell;
    FromRow: number;
}

export interface ITilePlacement {
    Tile: Tile;
    Cell: ICell;
}

export class Board {
    private _cells: ICell[][] = [];
    private _nextTileId: number = 0;
    private _config: IBoardConfig;
    private _repeatChance: number;

    constructor(config: IBoardConfig) {
        this._config = config;
        const chance = config.repeatChance;
        this._repeatChance = isFinite(chance) ? Math.max(0, Math.min(1, chance)) : 0;
        const types = config.cells || [];
        for (let row = 0; row < config.rows; row++) {
            const cellLine: ICell[] = [];
            for (let col = 0; col < config.columns; col++) {
                const type = types[row] && types[row][col] !== undefined ? types[row][col] : CeilType.Normal;
                cellLine.push(Cell.Create(row, col, type));
            }
            this._cells.push(cellLine);
        }
    }

    public get Columns(): number {
        return this._config.columns;
    }

    public get Rows(): number {
        return this._config.rows;
    }

    public get CellGapRatio(): number {
        return this._config.cellGapRatio;
    }

    public IsInside(row: number, col: number): boolean {
        return row >= 0 && row < this.Rows && col >= 0 && col < this.Columns;
    }

    public GetCell(row: number, col: number): ICell {
        if (!this.IsInside(row, col)) {
            return null;
        }
        return this._cells[row][col];
    }

    public IsPlayable(row: number, col: number): boolean {
        const cell = this.GetCell(row, col);
        return !!cell && Cell.CanHoldTile(cell);
    }

    public GetTile(row: number, col: number): Tile {
        const cell = this.GetCell(row, col);
        return cell ? cell.Tile : null;
    }

    public SetTile(row: number, col: number, tile: Tile): void {
        const cell = this.GetCell(row, col);
        if (!cell || !Cell.CanHoldTile(cell)) {
            return;
        }
        cell.Tile = tile;
    }

    public CreateTile(color: string): Tile {
        this._nextTileId++;
        return new Tile(this._nextTileId, color);
    }

    public CreateRandomTile(previousColor: string = ''): Tile {
        return this.CreateTile(this.pickColor(previousColor));
    }

    private pickColor(previousColor: string): string {
        const colors = this._config.colors;
        if (!previousColor || colors.length < 2 || colors.indexOf(previousColor) < 0) {
            return colors[Random.NextInt(colors.length)];
        }
        const otherChance = (1 - this._repeatChance) / (colors.length - 1);
        let roll = Random.Next();
        for (let index = 0; index < colors.length; index++) {
            roll -= colors[index] === previousColor ? this._repeatChance : otherChance;
            if (roll < 0) {
                return colors[index];
            }
        }
        return colors[colors.length - 1];
    }

    public Clear(): void {
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                this._cells[row][col].Tile = null;
            }
        }
    }

    public Fill(): ITilePlacement[] {
        const placements: ITilePlacement[] = [];
        let previousColor = '';
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                const cell = this._cells[row][col];
                if (!Cell.CanHoldTile(cell) || cell.Tile) {
                    continue;
                }
                const tile = this.CreateRandomTile(previousColor);
                previousColor = tile.Color;
                cell.Tile = tile;
                placements.push({ Tile: tile, Cell: cell });
            }
        }
        return placements;
    }

    public FindGroup(row: number, col: number): ICell[] {
        const start = this.GetCell(row, col);
        if (!start || !Cell.CanHoldTile(start) || !start.Tile) {
            return [];
        }
        const color = start.Tile.Color;
        const visited = new Set<number>();
        const result: ICell[] = [];
        const queue: ICell[] = [start];
        while (queue.length > 0) {
            const cell = queue.shift();
            const key = cell.Row * this.Columns + cell.Col;
            if (visited.has(key) || !cell.Tile || cell.Tile.Color !== color) {
                continue;
            }
            visited.add(key);
            result.push(cell);
            this.pushNeighbour(queue, visited, cell.Row - 1, cell.Col);
            this.pushNeighbour(queue, visited, cell.Row + 1, cell.Col);
            this.pushNeighbour(queue, visited, cell.Row, cell.Col - 1);
            this.pushNeighbour(queue, visited, cell.Row, cell.Col + 1);
        }
        return result;
    }

    public HasGroup(minGroupSize: number): boolean {
        return this.FindFirstGroup(minGroupSize).length > 0;
    }

    public FindFirstGroup(minGroupSize: number): ICell[] {
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                if (!this._cells[row][col].Tile) {
                    continue;
                }
                const group = this.FindGroup(row, col);
                if (group.length >= minGroupSize) {
                    return group;
                }
            }
        }
        return [];
    }

    public DropTiles(): ITileMove[] {
        const moves: ITileMove[] = [];
        for (let col = 0; col < this.Columns; col++) {
            let writeRow = this.Rows - 1;
            for (let row = this.Rows - 1; row >= 0; row--) {
                const cell = this._cells[row][col];
                if (!Cell.CanHoldTile(cell)) {
                    writeRow = row - 1;
                    continue;
                }
                const tile = cell.Tile;
                if (!tile) {
                    continue;
                }
                if (row !== writeRow) {
                    const target = this._cells[writeRow][col];
                    target.Tile = tile;
                    cell.Tile = null;
                    moves.push({ Tile: tile, From: cell, To: target });
                }
                writeRow--;
            }
        }
        return moves;
    }

    public Refill(): ITileSpawn[] {
        const spawns: ITileSpawn[] = [];
        let previousColor = '';
        for (let col = 0; col < this.Columns; col++) {
            let segmentTop = 0;
            for (let row = 0; row <= this.Rows; row++) {
                if (row < this.Rows && Cell.CanHoldTile(this._cells[row][col])) {
                    continue;
                }
                previousColor = this.refillSegment(spawns, col, segmentTop, row - 1, previousColor);
                segmentTop = row + 1;
            }
        }
        return spawns;
    }

    private refillSegment(spawns: ITileSpawn[], col: number, top: number, bottom: number, previousColor: string): string {
        let emptyCount = 0;
        for (let row = top; row <= bottom; row++) {
            if (!this._cells[row][col].Tile) {
                emptyCount++;
            }
        }
        if (emptyCount === 0) {
            return previousColor;
        }
        let lastColor = previousColor;
        for (let row = top; row <= bottom; row++) {
            const cell = this._cells[row][col];
            if (cell.Tile) {
                continue;
            }
            const tile = this.CreateRandomTile(lastColor);
            lastColor = tile.Color;
            cell.Tile = tile;
            spawns.push({
                Tile: tile,
                Cell: cell,
                FromRow: row - emptyCount
            });
        }
        return lastColor;
    }

    public Swap(first: ICell, second: ICell): void {
        if (!this.IsPlayable(first.Row, first.Col) || !this.IsPlayable(second.Row, second.Col)) {
            return;
        }
        const firstCell = this._cells[first.Row][first.Col];
        const secondCell = this._cells[second.Row][second.Col];
        const tile = firstCell.Tile;
        firstCell.Tile = secondCell.Tile;
        secondCell.Tile = tile;
    }

    public Shuffle(): void {
        const cells: ICell[] = [];
        const tiles: Tile[] = [];
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                const cell = this._cells[row][col];
                if (cell.Tile && Cell.CanHoldTile(cell)) {
                    cells.push(cell);
                    tiles.push(cell.Tile);
                }
            }
        }
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Random.NextInt(i + 1);
            const swap = tiles[i];
            tiles[i] = tiles[j];
            tiles[j] = swap;
        }
        for (let i = 0; i < cells.length; i++) {
            cells[i].Tile = tiles[i];
        }
    }

    public GetPlacements(): ITilePlacement[] {
        const placements: ITilePlacement[] = [];
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                const cell = this._cells[row][col];
                if (cell.Tile) {
                    placements.push({ Tile: cell.Tile, Cell: cell });
                }
            }
        }
        return placements;
    }

    private pushNeighbour(queue: ICell[], visited: Set<number>, row: number, col: number): void {
        const cell = this.GetCell(row, col);
        if (!cell || !Cell.CanHoldTile(cell) || visited.has(row * this.Columns + col)) {
            return;
        }
        queue.push(cell);
    }
}
