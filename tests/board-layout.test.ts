import { BoardLayout, IBoardLayoutOptions } from '../assets/scripts/game/layout/BoardLayout';

function options(overrides: Partial<IBoardLayoutOptions> = {}): IBoardLayoutOptions {
    return {
        gapRatio: 0,
        paddingRatio: 0,
        innerPaddingRatio: 0.35,
        frameBorderRatio: 0.4,
        hasFrame: false,
        hasInner: false,
        ...overrides
    };
}

describe('BoardLayout: чистая раскладка поля', () => {
    it('квадратная ячейка вписывается по ограничивающей стороне зоны', () => {
        const metrics = BoardLayout.Metrics(2, 2, { width: 100, height: 200 }, options());

        expect(metrics.cellSize).toBe(50);
        expect(metrics.step).toBe(50);
        expect(metrics.boardWidth).toBe(100);
        expect(metrics.boardHeight).toBe(100);
    });

    it('промежуток между тайлами добавляется к шагу сетки', () => {
        const metrics = BoardLayout.Metrics(2, 2, { width: 220, height: 220 }, options({ gapRatio: 0.2 }));

        expect(metrics.cellSize).toBeCloseTo(100, 8);
        expect(metrics.step).toBeCloseTo(120, 8);
        expect(metrics.boardWidth).toBeCloseTo(220, 8);
        expect(metrics.boardHeight).toBeCloseTo(220, 8);
    });

    it('отступ зоны уменьшает доступную площадь', () => {
        const metrics = BoardLayout.Metrics(2, 2, { width: 100, height: 100 }, options({ paddingRatio: 0.1 }));

        expect(metrics.cellSize).toBe(40);
        expect(metrics.step).toBe(40);
        expect(metrics.boardWidth).toBe(80);
        expect(metrics.boardHeight).toBe(80);
    });

    it('рамка и подложка резервируют место в долях ячейки', () => {
        const metrics = BoardLayout.Metrics(2, 2, { width: 100, height: 100 }, options({
            hasFrame: true,
            hasInner: true
        }));

        expect(metrics.cellSize).toBeCloseTo(100 / 3.5, 8);
        expect(metrics.boardWidth).toBeCloseTo(200 / 3.5, 8);
        expect(metrics.boardHeight).toBeCloseTo(200 / 3.5, 8);
    });

    it('Fit вписывает сетку без декора и отступов в готовый прямоугольник', () => {
        const metrics = BoardLayout.Fit(2, 2, { width: 100, height: 200 }, 0);

        expect(metrics.cellSize).toBe(50);
        expect(metrics.step).toBe(50);
        expect(metrics.boardWidth).toBe(100);
        expect(metrics.boardHeight).toBe(100);
    });

    it('позиция центрирована, Y инвертирован, шаг одинаков по осям', () => {
        expect(BoardLayout.Position(9, 9, 10, 4, 4)).toEqual({ x: 0, y: 0 });
        expect(BoardLayout.Position(9, 9, 10, 0, 0)).toEqual({ x: -40, y: 40 });
        expect(BoardLayout.Position(9, 9, 10, 8, 8)).toEqual({ x: 40, y: -40 });
    });

    it('нечисловые и отрицательные размеры не дают NaN и отрицательную ячейку', () => {
        const metrics = BoardLayout.Metrics(2, 2, { width: -100, height: NaN }, options({ gapRatio: -1 }));

        expect(metrics.cellSize).toBe(0);
        expect(metrics.step).toBe(0);
        expect(metrics.boardWidth).toBe(0);
        expect(metrics.boardHeight).toBe(0);
    });
});
