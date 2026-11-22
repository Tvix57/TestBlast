import { CeilType } from '../assets/scripts/core/Cell';
import { FieldLayout } from '../assets/scripts/core/FieldLayout';
import { loadFieldConfig, loadGameConfig } from './helpers';

const BOARD = loadGameConfig().board;

describe('FieldLayout: проверенный конфиг поля → размеры и типы клеток', () => {
    it('конфиг проекта — стандартная сетка из game-config, матрицы типов нет', () => {
        const layout = FieldLayout.FromConfig(loadFieldConfig(), BOARD);

        expect(layout.Rows).toBe(BOARD.rows);
        expect(layout.Columns).toBe(BOARD.columns);
        expect(layout.Types).toBeNull();
    });

    it('без конфига поля работает обычная сетка из game-config', () => {
        const layout = FieldLayout.FromConfig(null, BOARD);

        expect(layout.Rows).toBe(BOARD.rows);
        expect(layout.Columns).toBe(BOARD.columns);
        expect(layout.Types).toBeNull();
    });

    it('custom: false берёт размеры из конфига поля и игнорирует board', () => {
        const layout = FieldLayout.FromConfig({
            version: 1,
            rows: 5,
            columns: 7,
            custom: false,
            board: [[CeilType.Blocked, CeilType.Blocked]]
        }, BOARD);

        expect(layout.Rows).toBe(5);
        expect(layout.Columns).toBe(7);
        expect(layout.Types).toBeNull();
    });

    it('custom: true собирает матрицу типов клеток из чисел enum CeilType', () => {
        const layout = FieldLayout.FromConfig({
            version: 1,
            rows: 3,
            columns: 4,
            custom: true,
            board: [
                [CeilType.Normal, CeilType.Normal, CeilType.Blocked, CeilType.Normal],
                [0, 0, 0, 0],
                [CeilType.Blocked, 0, 0, CeilType.Blocked]
            ]
        }, BOARD);

        expect(layout.Rows).toBe(3);
        expect(layout.Columns).toBe(4);
        expect(layout.Types).toEqual([
            [CeilType.Normal, CeilType.Normal, CeilType.Blocked, CeilType.Normal],
            [CeilType.Normal, CeilType.Normal, CeilType.Normal, CeilType.Normal],
            [CeilType.Blocked, CeilType.Normal, CeilType.Normal, CeilType.Blocked]
        ]);
    });

    it('enum CeilType задаёт числовые значения типов клеток', () => {
        expect(CeilType.Normal).toBe(0);
        expect(CeilType.Blocked).toBe(1);

        const layout = FieldLayout.FromConfig({
            version: 1, rows: 2, columns: 2, custom: true,
            board: [[1, 0], [0, 1]]
        }, BOARD);

        expect(layout.Types).toEqual([
            [CeilType.Blocked, CeilType.Normal],
            [CeilType.Normal, CeilType.Blocked]
        ]);
    });

    it('матрица типов копируется и не разделяет ссылки с конфигом', () => {
        const board = [[0, 1], [1, 0]];
        const layout = FieldLayout.FromConfig({
            version: 1, rows: 2, columns: 2, custom: true, board: board
        }, BOARD);

        board[0][0] = 1;

        expect(layout.Types).toEqual([
            [CeilType.Normal, CeilType.Blocked],
            [CeilType.Blocked, CeilType.Normal]
        ]);
        expect(layout.Types).not.toBe(board);
        expect(layout.Types[0]).not.toBe(board[0]);
    });

    it('Standard отдаёт обычную сетку без матрицы типов', () => {
        expect(FieldLayout.Standard(4, 6)).toEqual({ Rows: 4, Columns: 6, Types: null });
    });
});
