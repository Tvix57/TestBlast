import { Cell, ICell } from './Cell';
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
    private _tiles: (Tile | null)[][] = [];
    private _visited: boolean[][] = [];
    private _nextTileId: number = 0;
    private _config: IBoardConfig;
    private _repeatChance: number;

    constructor(config: IBoardConfig) {
        this._config = config;
        const chance = config.repeatChance;
        this._repeatChance = isFinite(chance) ? Math.max(0, Math.min(1, chance)) : 0;
        for (let row = 0; row < config.rows; row++) {
            const line: (Tile | null)[] = [];
            const visitedLine: boolean[] = [];
            for (let col = 0; col < config.columns; col++) {
                line.push(null);
                visitedLine.push(false);
            }
            this._tiles.push(line);
            this._visited.push(visitedLine);
        }
    }

    public get Columns(): number {
        return this._config.columns;
    }

    public get Rows(): number {
        return this._config.rows;
    }

    public IsInside(row: number, col: number): boolean {
        return row >= 0 && row < this.Rows && col >= 0 && col < this.Columns;
    }

    public GetTile(row: number, col: number): Tile {
        if (!this.IsInside(row, col)) {
            return null;
        }
        return this._tiles[row][col];
    }

    public SetTile(row: number, col: number, tile: Tile): void {
        if (!this.IsInside(row, col)) {
            return;
        }
        this._tiles[row][col] = tile;
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
                this._tiles[row][col] = null;
            }
        }
    }

    public Fill(): ITilePlacement[] {
        const placements: ITilePlacement[] = [];
        let previousColor = '';
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                if (!this._tiles[row][col]) {
                    const tile = this.CreateRandomTile(previousColor);
                    previousColor = tile.Color;
                    this._tiles[row][col] = tile;
                    placements.push({ Tile: tile, Cell: Cell.Create(row, col) });
                }
            }
        }
        return placements;
    }

    public FindGroup(row: number, col: number): ICell[] {
        const start = this.GetTile(row, col);
        if (!start) {
            return [];
        }
        this.resetVisited();
        const result: ICell[] = [];
        const queue: ICell[] = [Cell.Create(row, col)];
        while (queue.length > 0) {
            const cell = queue.shift();
            if (this._visited[cell.Row][cell.Col]) {
                continue;
            }
            const tile = this.GetTile(cell.Row, cell.Col);
            if (!tile || tile.Color !== start.Color) {
                continue;
            }
            this._visited[cell.Row][cell.Col] = true;
            result.push(cell);
            this.pushNeighbour(queue, cell.Row - 1, cell.Col);
            this.pushNeighbour(queue, cell.Row + 1, cell.Col);
            this.pushNeighbour(queue, cell.Row, cell.Col - 1);
            this.pushNeighbour(queue, cell.Row, cell.Col + 1);
        }
        return result;
    }

    public HasGroup(minGroupSize: number): boolean {
        return this.FindFirstGroup(minGroupSize).length > 0;
    }

    public FindFirstGroup(minGroupSize: number): ICell[] {
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                const tile = this._tiles[row][col];
                if (!tile) {
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
                const tile = this._tiles[row][col];
                if (!tile) {
                    continue;
                }
                if (row !== writeRow) {
                    this._tiles[writeRow][col] = tile;
                    this._tiles[row][col] = null;
                    moves.push({
                        Tile: tile,
                        From: Cell.Create(row, col),
                        To: Cell.Create(writeRow, col)
                    });
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
            let emptyCount = 0;
            for (let row = 0; row < this.Rows; row++) {
                if (!this._tiles[row][col]) {
                    emptyCount++;
                }
            }
            if (emptyCount === 0) {
                continue;
            }
            for (let row = 0; row < this.Rows; row++) {
                if (this._tiles[row][col]) {
                    continue;
                }
                const tile = this.CreateRandomTile(previousColor);
                previousColor = tile.Color;
                this._tiles[row][col] = tile;
                spawns.push({
                    Tile: tile,
                    Cell: Cell.Create(row, col),
                    FromRow: row - emptyCount
                });
            }
        }
        return spawns;
    }

    public Swap(first: ICell, second: ICell): void {
        const firstTile = this.GetTile(first.Row, first.Col);
        const secondTile = this.GetTile(second.Row, second.Col);
        this.SetTile(first.Row, first.Col, secondTile);
        this.SetTile(second.Row, second.Col, firstTile);
    }

    public Shuffle(): void {
        const cells: ICell[] = [];
        const tiles: Tile[] = [];
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                const tile = this._tiles[row][col];
                if (tile) {
                    cells.push(Cell.Create(row, col));
                    tiles.push(tile);
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
            this._tiles[cells[i].Row][cells[i].Col] = tiles[i];
        }
    }

    public GetPlacements(): ITilePlacement[] {
        const placements: ITilePlacement[] = [];
        for (let row = 0; row < this.Rows; row++) {
            for (let col = 0; col < this.Columns; col++) {
                const tile = this._tiles[row][col];
                if (tile) {
                    placements.push({ Tile: tile, Cell: Cell.Create(row, col) });
                }
            }
        }
        return placements;
    }

    private resetVisited(): void {
        for (let row = 0; row < this.Rows; row++) {
            const line = this._visited[row];
            for (let col = 0; col < this.Columns; col++) {
                line[col] = false;
            }
        }
    }

    private pushNeighbour(queue: ICell[], row: number, col: number): void {
        if (!this.IsInside(row, col) || this._visited[row][col]) {
            return;
        }
        queue.push(Cell.Create(row, col));
    }
}
