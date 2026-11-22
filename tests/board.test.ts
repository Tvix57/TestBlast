import { Random } from '../assets/scripts/core/Random';
import { TileType } from '../assets/scripts/core/Tile';
import {
    checkerboard, countTiles, createBoard, fillColors, loadGameConfig, setBoard, withCells
} from './helpers';

describe('Board: матрица поля', () => {
    const config = loadGameConfig();

    it('Fill создаёт columns*rows тайлов только из палитры конфига', () => {
        const board = createBoard(config);
        expect(board.CellGapRatio).toBe(config.board.cellGapRatio);
        board.Fill();
        expect(countTiles(board)).toBe(config.board.columns * config.board.rows);
        for (let row = 0; row < board.Rows; row++) {
            for (let col = 0; col < board.Columns; col++) {
                expect(config.board.colors).toContain(board.GetTile(row, col).Type);
            }
        }
    });

    it('тайл живёт в клетке: GetTile читает ICell.Tile, Clear оставляет сами клетки', () => {
        const board = createBoard(config);
        board.Fill();
        const cell = board.GetCell(0, 0);

        expect(cell.Tile).toBe(board.GetTile(0, 0));

        board.Clear();

        expect(board.GetCell(0, 0)).toBe(cell);
        expect(cell.Tile).toBeNull();
        expect(board.GetTile(0, 0)).toBeNull();
    });

    it('GetTile и IsInside корректно работают за границами поля', () => {
        const board = createBoard(config);
        board.Fill();
        expect(board.IsInside(-1, 0)).toBe(false);
        expect(board.IsInside(0, config.board.columns)).toBe(false);
        expect(board.IsInside(0, 0)).toBe(true);
        expect(board.GetTile(-1, 0)).toBeNull();
        expect(board.GetTile(0, config.board.columns)).toBeNull();
    });

    it('CreateRandomTile детерминирован при одинаковом сиде', () => {
        const board = createBoard(config, 42);
        const firstColors = new Array(20).fill('').map(() => board.CreateRandomTile().Type);
        Random.Reset(42);
        const secondColors = new Array(20).fill('').map(() => board.CreateRandomTile().Type);
        expect(firstColors).toEqual(secondColors);
    });

    it('CreateTile выдаёт уникальные Id и указанный тип', () => {
        const board = createBoard(config);

        const first = board.CreateTile(TileType.Blue);
        const second = board.CreateTile(TileType.Red);

        expect(first.Type).toBe(TileType.Blue);
        expect(second.Type).toBe(TileType.Red);
        expect(first.Id).not.toBe(second.Id);
    });

    it('CreateRandomTile с типом вне палитры выбирает любой допустимый тип', () => {
        const board = createBoard(config);

        for (let index = 0; index < 20; index++) {
            expect(config.board.colors).toContain(board.CreateRandomTile('unknown' as TileType).Type);
        }
    });

    it('SetTile за границами игнорируется, Clear очищает поле', () => {
        const board = createBoard(config);
        board.Fill();

        board.SetTile(-1, 0, board.CreateTile(TileType.Red));
        board.SetTile(0, config.board.columns, board.CreateTile(TileType.Red));
        expect(countTiles(board)).toBe(config.board.rows * config.board.columns);

        board.Clear();
        expect(countTiles(board)).toBe(0);
    });

    it('Fill заполняет только пустые клетки и возвращает только новые размещения', () => {
        const board = createBoard(config);
        board.Fill();
        const fixed = board.GetTile(3, 3);
        board.SetTile(0, 0, null);
        board.SetTile(config.board.rows - 1, config.board.columns - 1, null);

        const placements = board.Fill();

        expect(placements).toHaveLength(2);
        expect(board.GetTile(3, 3)).toBe(fixed);
        expect(countTiles(board)).toBe(config.board.rows * config.board.columns);
    });
});

describe('Board: вероятность повтора цвета', () => {
    it('repeatChance = 1 — каждый следующий тайл повторяет предыдущий', () => {
        const colors = fillColors(1, 11);

        expect(new Set(colors).size).toBe(1);
    });

    it('repeatChance = 0 — следующий тайл не повторяет предыдущий', () => {
        const colors = fillColors(0, 12);

        colors.forEach((color, index) => {
            if (index > 0) {
                expect(color).not.toBe(colors[index - 1]);
            }
        });
    });

    it('доля повторов при repeatChance = 0.5 близка к половине', () => {
        const colors = fillColors(0.5, 13);
        const repeats = colors.filter((color, index) => index > 0 && color === colors[index - 1]).length;

        expect(repeats / (colors.length - 1)).toBeGreaterThan(0.35);
        expect(repeats / (colors.length - 1)).toBeLessThan(0.65);
    });

    it('Refill продолжает цепочку предыдущего цвета', () => {
        const config = loadGameConfig();
        config.board.repeatChance = 1;
        const board = createBoard(config, 14);
        board.Fill();
        board.SetTile(0, 0, null);
        board.SetTile(0, 1, null);

        const spawns = board.Refill();

        expect(spawns).toHaveLength(2);
        expect(spawns[1].Tile.Type).toBe(spawns[0].Tile.Type);
    });

    it('repeatChance вне [0, 1] и NaN приводятся к допустимым значениям', () => {
        expect(new Set(fillColors(2, 21)).size).toBe(1);

        fillColors(-1, 22).forEach((color, index, colors) => {
            if (index > 0) {
                expect(color).not.toBe(colors[index - 1]);
            }
        });

        fillColors(NaN, 23).forEach((color, index, colors) => {
            if (index > 0) {
                expect(color).not.toBe(colors[index - 1]);
            }
        });
    });
});

describe('Board: поиск группы', () => {
    const config = loadGameConfig();

    it('FindGroup собирает крест из 5 тайлов одного цвета', () => {
        const board = createBoard(config);
        setBoard(board, withCells(checkerboard(), [
            [4, 4, 'B'], [3, 4, 'B'], [5, 4, 'B'], [4, 3, 'B'], [4, 5, 'B']
        ]));
        const group = board.FindGroup(4, 4);
        expect(group).toHaveLength(5);
        expect(group).toContainEqual(expect.objectContaining({ Row: 3, Col: 4 }));
        expect(group).toContainEqual(expect.objectContaining({ Row: 5, Col: 4 }));
    });

    it('FindGroup на одиночном тайле возвращает одну клетку', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());
        expect(board.FindGroup(4, 4)).toHaveLength(1);
    });

    it('FindGroup не смешивает разные цвета', () => {
        const board = createBoard(config);
        setBoard(board, withCells(checkerboard(), [
            [0, 0, 'B'], [0, 1, 'B'], [1, 0, 'R'], [1, 1, 'R']
        ]));
        expect(board.FindGroup(0, 0)).toHaveLength(2);
        expect(board.FindGroup(1, 0)).toHaveLength(2);
    });

    it('HasGroup учитывает minGroupSize', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());
        expect(board.HasGroup(2)).toBe(false);
        board.SetTile(0, 0, board.CreateTile(TileType.Red));
        board.SetTile(0, 1, board.CreateTile(TileType.Red));
        expect(board.HasGroup(2)).toBe(true);
        expect(board.HasGroup(3)).toBe(false);
        expect(board.FindFirstGroup(2).length).toBeGreaterThanOrEqual(2);
    });

    it('FindGroup на пустой клетке и за границами возвращает пустой список', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());
        board.SetTile(0, 0, null);

        expect(board.FindGroup(0, 0)).toEqual([]);
        expect(board.FindGroup(-1, 0)).toEqual([]);
        expect(board.FindGroup(0, config.board.columns)).toEqual([]);
    });

    it('FindFirstGroup возвращает пустой список, если групп нужного размера нет', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());

        expect(board.FindFirstGroup(config.board.minGroupSize)).toEqual([]);
        expect(board.HasGroup(config.board.minGroupSize)).toBe(false);
    });
});

describe('Board: доступность хода', () => {
    const config = loadGameConfig();

    it('HasClickableSuper различает супер-тайл и обычные цвета', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());

        expect(board.HasClickableSuper()).toBe(false);

        board.SetTile(0, 0, board.CreateTile(TileType.Bomb));

        expect(board.HasClickableSuper()).toBe(true);
        expect(board.HasAvailableMove(config.board.minGroupSize)).toBe(true);
    });

    it('HasAvailableMove учитывает и цветную группу', () => {
        const board = createBoard(config);
        setBoard(board, withCells(checkerboard(), [[4, 3, 'B'], [4, 4, 'B'], [4, 5, 'B']]));

        expect(board.HasClickableSuper()).toBe(false);
        expect(board.HasAvailableMove(config.board.minGroupSize)).toBe(true);
    });

    it('HasAvailableMove ложно на шахматке без групп и суперов', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());

        expect(board.HasAvailableMove(config.board.minGroupSize)).toBe(false);
    });
});
