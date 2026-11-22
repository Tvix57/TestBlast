import { Board } from './Board';
import { BoosterRules } from './BoosterRules';
import { Cell, ICell } from './Cell';
import { Random } from './Random';
import { ISuperSpawn } from './TurnResult';
import { TileType } from './Tile';

export class SuperTileSpawner {
    constructor(private _board: Board, private _rules: BoosterRules) {}

    public PickType(groupSize: number): TileType | null {
        const types = this._rules.GetSpawnTypes(groupSize);
        if (types.length === 0) {
            return null;
        }
        return types[Random.NextInt(types.length)];
    }

    public Spawn(row: number, col: number, type: TileType | null): ISuperSpawn | null {
        if (!type) {
            return null;
        }
        const tile = this._board.CreateTile(type);
        this._board.SetTile(row, col, tile);
        return { Cell: Cell.Create(row, col), Tile: tile, Type: type };
    }

    public ResolveSpawnCell(largestCells: ICell[], preferred: ICell): ICell {
        const contains = largestCells.some((item) => Cell.Same(item, preferred));
        if (contains) {
            return preferred;
        }
        return largestCells.length > 0 ? largestCells[0] : preferred;
    }
}
