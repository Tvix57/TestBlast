import { Cell, ICell } from '../assets/scripts/core/Cell';
import {
    CircleRadiusEffect, ColumnEffect, EffectFactory, IBoardShape, RowEffect,
    SquareRadiusEffect, WholeBoardEffect
} from '../assets/scripts/core/effects/BoardEffect';

class FakeBoard implements IBoardShape {
    constructor(public Columns: number = 9, public Rows: number = 9) {}

    public IsInside(row: number, col: number): boolean {
        return row >= 0 && row < this.Rows && col >= 0 && col < this.Columns;
    }
}

describe('Эффекты зоны сгорания', () => {
    const board = new FakeBoard(9, 9);

    it('RowEffect отдаёт всю строку', () => {
        const cells = new RowEffect().GetCells(board, Cell.Create(4, 0), 0);
        expect(cells).toHaveLength(9);
        cells.forEach((cell) => expect(cell.Row).toBe(4));
    });

    it('ColumnEffect отдаёт весь столбец', () => {
        const cells = new ColumnEffect().GetCells(board, Cell.Create(0, 6), 0);
        expect(cells).toHaveLength(9);
        cells.forEach((cell) => expect(cell.Col).toBe(6));
    });

    it('SquareRadiusEffect считает квадрат и обрезается границами поля', () => {
        const center = new SquareRadiusEffect().GetCells(board, Cell.Create(4, 4), 1);
        const corner = new SquareRadiusEffect().GetCells(board, Cell.Create(0, 0), 2);
        expect(center).toHaveLength(9);
        expect(corner).toHaveLength(9);
    });

    it('CircleRadiusEffect считает круг, а не квадрат', () => {
        const cells = new CircleRadiusEffect().GetCells(board, Cell.Create(4, 4), 2);
        // dRow^2 + dCol^2 <= 4: 1 + 4 + 4 + 4 = 13 клеток
        expect(cells).toHaveLength(13);
        expect(cells).toContainEqual(expect.objectContaining({ Row: 4, Col: 6 }));
        expect(cells).not.toContainEqual(expect.objectContaining({ Row: 2, Col: 6 }));
    });

    it('WholeBoardEffect отдаёт всё поле', () => {
        expect(new WholeBoardEffect().GetCells(board, Cell.Create(0, 0), 0)).toHaveLength(81);
    });

    it('EffectFactory создаёт известные формы и падает на неизвестной', () => {
        expect(EffectFactory.Create('row')).toBeInstanceOf(RowEffect);
        expect(EffectFactory.Create('circle')).toBeInstanceOf(CircleRadiusEffect);
        expect(() => EffectFactory.Create('spiral')).toThrow(/Unknown booster effect shape/);
    });

    it('EffectFactory.Register добавляет новую форму без правки игры', () => {
        const custom = {
            GetCells: (_board: IBoardShape, center: ICell): ICell[] => [Cell.Create(center.Row, center.Col)]
        };
        EffectFactory.Register('single', custom);
        expect(EffectFactory.Create('single').GetCells(board, Cell.Create(3, 3), 0)).toHaveLength(1);
    });
});
