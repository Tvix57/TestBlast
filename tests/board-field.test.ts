import { CeilType } from '../assets/scripts/core/Cell';
import { countTiles, createFieldBoard, createGame, fieldFromMask, setBoard } from './helpers';

/** Колонка из четырёх ячеек: блок во второй строке делит её на два отрезка. */
const SPLIT_COLUMN = ['...', '###', '...', '...'];

/** Поле 5×5: вертикальный блок, горизонтальная полоса и два блока снизу. */
const MASK = [
    '..#..',
    '..#..',
    '#####',
    '..#..',
    '..#..'
];

describe('Board: кастомная форма поля', () => {
    it('Fill заполняет только рабочие ячейки', () => {
        const board = createFieldBoard(MASK);

        const placements = board.Fill();

        expect(countTiles(board)).toBe(16);
        expect(placements).toHaveLength(16);
        expect(board.GetTile(0, 2)).toBeNull();
        expect(board.GetCell(0, 2).Tile).toBeNull();
        expect(board.GetTile(2, 0)).toBeNull();
        expect(board.IsPlayable(0, 2)).toBe(false);
        expect(board.IsPlayable(0, 0)).toBe(true);
    });

    it('SetTile и Swap не ставят тайлы в клетки, которые их не держат', () => {
        const board = createFieldBoard(MASK);
        board.Fill();
        const neighborId = board.GetTile(0, 1).Id;

        board.SetTile(0, 2, board.CreateTile('blue'));
        board.Swap(board.GetCell(0, 1), board.GetCell(0, 2));

        expect(board.GetTile(0, 2)).toBeNull();
        expect(board.GetTile(0, 1).Id).toBe(neighborId);
        expect(board.IsInside(0, 2)).toBe(true);
        expect(board.GetCell(0, 2).Type).toBe(CeilType.Blocked);
        expect(board.GetCell(0, 0).Type).toBe(CeilType.Normal);
    });

    it('DropTiles останавливает тайлы на «полке» над блоком', () => {
        const board = createFieldBoard(SPLIT_COLUMN);
        board.Fill();
        const topId = board.GetTile(0, 0).Id;
        board.SetTile(3, 0, null);

        const moves = board.DropTiles();

        expect(moves).toHaveLength(1);
        expect(moves[0].From).toMatchObject({ Row: 2, Col: 0 });
        expect(moves[0].To).toMatchObject({ Row: 3, Col: 0 });
        expect(board.GetTile(0, 0).Id).toBe(topId);
    });

    it('DropTiles не переносит тайл из верхнего отрезка в нижний', () => {
        const board = createFieldBoard(SPLIT_COLUMN);
        board.Fill();
        board.SetTile(0, 0, null);

        const moves = board.DropTiles();

        expect(moves).toEqual([]);
        expect(board.GetTile(2, 0)).not.toBeNull();
        expect(board.GetTile(3, 0)).not.toBeNull();
    });

    it('Refill заполняет каждый отрезок колонки и считает спавн от его верха', () => {
        const board = createFieldBoard(SPLIT_COLUMN);
        board.Fill();
        board.SetTile(0, 0, null);
        board.SetTile(2, 0, null);
        board.SetTile(3, 0, null);

        const spawns = board.Refill();

        expect(spawns.map((spawn) => spawn.Cell.Row)).toEqual([0, 2, 3]);
        expect(spawns.map((spawn) => spawn.FromRow)).toEqual([-1, 0, 1]);
        expect(countTiles(board)).toBe(9);
        expect(board.GetTile(1, 0)).toBeNull();
    });

    it('группа не собирается через заблокированную ячейку', () => {
        const board = createFieldBoard(['.#.', '###']);
        setBoard(board, ['G#G', '###']);

        expect(board.FindGroup(0, 0)).toHaveLength(1);
        expect(board.FindGroup(0, 2)).toHaveLength(1);
        expect(board.HasGroup(2)).toBe(false);
    });

    it('Shuffle не трогает заблокированные ячейки и сохраняет набор тайлов', () => {
        const board = createFieldBoard(MASK);
        board.Fill();
        const before = board.GetPlacements().map((placement) => placement.Tile.Id).sort();

        board.Shuffle();

        expect(board.GetTile(0, 2)).toBeNull();
        expect(board.GetTile(4, 2)).toBeNull();
        expect(board.GetPlacements().map((placement) => placement.Tile.Id).sort()).toEqual(before);
    });

    it('матч на кастомном поле: заполнены только рабочие ячейки, клик по блоку отклонён', () => {
        const game = createGame({ targetScore: 100000, field: fieldFromMask(MASK) });
        game.Start();

        expect(countTiles(game.Board)).toBe(16);
        expect(game.ClickCell(0, 2).Accepted).toBe(false);
        expect(game.ClickCell(2, 0).Accepted).toBe(false);
    });
});
