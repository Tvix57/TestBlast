export interface ICell {
    Row: number;
    Col: number;
}

export class Cell {
    public static Create(row: number, col: number): ICell {
        return { Row: row, Col: col };
    }

    public static Same(first: ICell, second: ICell): boolean {
        return first.Row === second.Row && first.Col === second.Col;
    }
}
