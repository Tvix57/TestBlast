import { Cell, ICell } from '../Cell';

export interface IBoardShape {
    Columns: number;
    Rows: number;
    IsInside(row: number, col: number): boolean;
}

export interface IBoardEffect {
    GetCells(board: IBoardShape, center: ICell, radius: number): ICell[];
}

export class RowEffect implements IBoardEffect {
    public GetCells(board: IBoardShape, center: ICell, _radius: number): ICell[] {
        const cells: ICell[] = [];
        for (let col = 0; col < board.Columns; col++) {
            if (board.IsInside(center.Row, col)) {
                cells.push(Cell.Create(center.Row, col));
            }
        }
        return cells;
    }
}

export class ColumnEffect implements IBoardEffect {
    public GetCells(board: IBoardShape, center: ICell, _radius: number): ICell[] {
        const cells: ICell[] = [];
        for (let row = 0; row < board.Rows; row++) {
            if (board.IsInside(row, center.Col)) {
                cells.push(Cell.Create(row, center.Col));
            }
        }
        return cells;
    }
}

export class SquareRadiusEffect implements IBoardEffect {
    public GetCells(board: IBoardShape, center: ICell, radius: number): ICell[] {
        const cells: ICell[] = [];
        for (let row = center.Row - radius; row <= center.Row + radius; row++) {
            for (let col = center.Col - radius; col <= center.Col + radius; col++) {
                if (board.IsInside(row, col)) {
                    cells.push(Cell.Create(row, col));
                }
            }
        }
        return cells;
    }
}

export class CircleRadiusEffect implements IBoardEffect {
    public GetCells(board: IBoardShape, center: ICell, radius: number): ICell[] {
        const cells: ICell[] = [];
        const square = radius * radius;
        for (let row = center.Row - radius; row <= center.Row + radius; row++) {
            for (let col = center.Col - radius; col <= center.Col + radius; col++) {
                const dRow = row - center.Row;
                const dCol = col - center.Col;
                if (dRow * dRow + dCol * dCol > square) {
                    continue;
                }
                if (board.IsInside(row, col)) {
                    cells.push(Cell.Create(row, col));
                }
            }
        }
        return cells;
    }
}

export class WholeBoardEffect implements IBoardEffect {
    public GetCells(board: IBoardShape, _center: ICell, _radius: number): ICell[] {
        const cells: ICell[] = [];
        for (let row = 0; row < board.Rows; row++) {
            for (let col = 0; col < board.Columns; col++) {
                cells.push(Cell.Create(row, col));
            }
        }
        return cells;
    }
}

export class EffectFactory {
    private static _effects: { [shape: string]: IBoardEffect } = {
        row: new RowEffect(),
        column: new ColumnEffect(),
        square: new SquareRadiusEffect(),
        circle: new CircleRadiusEffect(),
        board: new WholeBoardEffect()
    };

    public static Register(shape: string, effect: IBoardEffect): void {
        EffectFactory._effects[shape] = effect;
    }

    public static Create(shape: string): IBoardEffect {
        const effect = EffectFactory._effects[shape];
        if (!effect) {
            throw new Error('Unknown booster effect shape: ' + shape);
        }
        return effect;
    }
}
