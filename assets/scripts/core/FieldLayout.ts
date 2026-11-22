import { CeilType } from './Cell';
import { IFieldConfig, IFieldDimensions } from './Config';

export interface IFieldLayout {
    Rows: number;
    Columns: number;
    Types: CeilType[][] | null;
}

export class FieldLayout {
    public static FromConfig(
        field: IFieldConfig | null,
        fallback: IFieldDimensions
    ): IFieldLayout {
        if (!field) {
            return FieldLayout.Standard(fallback.rows, fallback.columns);
        }
        if (!field.custom) {
            return FieldLayout.Standard(field.rows, field.columns);
        }
        return FieldLayout.Custom(field);
    }

    public static Standard(rows: number, columns: number): IFieldLayout {
        return { Rows: rows, Columns: columns, Types: null };
    }

    private static Custom(field: IFieldConfig): IFieldLayout {
        const board = field.board as number[][];
        return {
            Rows: field.rows,
            Columns: field.columns,
            Types: board.map((line) => line.slice())
        };
    }
}

