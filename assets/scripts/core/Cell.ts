import { Tile } from './Tile';

export enum CeilType {
    Normal = 0,
    Blocked
}

export interface ICell {
    Row: number;
    Col: number;
    Type: CeilType;
    Tile: Tile | null;
}

export class Cell {
    public static Create(row: number, col: number, type: CeilType = CeilType.Normal, tile: Tile | null = null): ICell {
        return { Row: row, Col: col, Type: type, Tile: tile };
    }

    public static Same(first: ICell, second: ICell): boolean {
        return first.Row === second.Row && first.Col === second.Col;
    }

    public static Key(row: number, col: number, columns: number): number {
        return row * columns + col;
    }

    public static CanHoldType(type: CeilType): boolean {
        switch (type) {
            case CeilType.Normal:
                return true;
            case CeilType.Blocked:
                return false;
            default:
                return false;
        }
    }

    public static CanHoldTile(cell: ICell): boolean {
        return Cell.CanHoldType(cell.Type);
    }
}
