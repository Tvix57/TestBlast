import { checkerboard, countTiles, createBoard, loadGameConfig, setBoard } from './helpers';

describe('Board: падение и дозаполнение', () => {
    const config = loadGameConfig();

    it('DropTiles опускает тайлы над дыркой на одну клетку', () => {
        const board = createBoard(config);
        board.Fill();
        const fallingId = board.GetTile(0, 0).Id;
        board.SetTile(4, 0, null);

        const moves = board.DropTiles();

        expect(moves).toHaveLength(4);
        expect(board.GetTile(1, 0).Id).toBe(fallingId);
        expect(board.GetTile(0, 0)).toBeNull();
        expect(moves[0].To).toEqual({ Row: 4, Col: 0 });
    });

    it('DropTiles на полном поле не возвращает перемещений', () => {
        const board = createBoard(config);
        board.Fill();
        expect(board.DropTiles()).toEqual([]);
    });

    it('DropTiles опускает несколько тайлов и описывает каждое перемещение', () => {
        const board = createBoard(config);
        board.Fill();
        const topId = board.GetTile(0, 1).Id;
        const middleId = board.GetTile(1, 1).Id;
        board.SetTile(2, 1, null);
        board.SetTile(3, 1, null);

        const moves = board.DropTiles();

        expect(moves).toHaveLength(2);
        expect(board.GetTile(2, 1).Id).toBe(topId);
        expect(board.GetTile(3, 1).Id).toBe(middleId);
        expect(board.GetTile(0, 1)).toBeNull();
        expect(moves.map((move) => move.To.Row).sort()).toEqual([2, 3]);
        moves.forEach((move) => {
            expect(move.From.Col).toBe(1);
            expect(move.To.Col).toBe(1);
            expect(move.To.Row).toBeGreaterThan(move.From.Row);
        });
    });

    it('Refill заполняет пустые клетки сверху и сообщает позицию спавна', () => {
        const board = createBoard(config);
        board.Fill();
        board.SetTile(0, 2, null);
        board.SetTile(1, 2, null);

        const spawns = board.Refill();

        expect(spawns).toHaveLength(2);
        expect(countTiles(board)).toBe(config.board.columns * config.board.rows);
        spawns.forEach((spawn) => expect(spawn.FromRow).toBeLessThan(0));
        expect(spawns.map((spawn) => spawn.Cell)).toEqual([
            { Row: 0, Col: 2 },
            { Row: 1, Col: 2 }
        ]);
    });

    it('Swap обменивает тайлы, сохраняя их идентичность', () => {
        const board = createBoard(config);
        board.Fill();
        const firstId = board.GetTile(0, 0).Id;
        const secondId = board.GetTile(0, 1).Id;

        board.Swap({ Row: 0, Col: 0 }, { Row: 0, Col: 1 });

        expect(board.GetTile(0, 0).Id).toBe(secondId);
        expect(board.GetTile(0, 1).Id).toBe(firstId);
    });
});

describe('Board: перемешивание', () => {
    const config = loadGameConfig();

    it('Shuffle сохраняет набор тайлов', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());
        const before = board.GetPlacements().map((placement) => placement.Tile.Id).sort();

        board.Shuffle();

        const after = board.GetPlacements().map((placement) => placement.Tile.Id).sort();
        expect(after).toEqual(before);
        expect(countTiles(board)).toBe(config.board.columns * config.board.rows);
    });

    it('GetPlacements возвращает по элементу на каждый тайл', () => {
        const board = createBoard(config);
        board.Fill();
        expect(board.GetPlacements()).toHaveLength(countTiles(board));
    });

    it('Shuffle сохраняет пустые клетки и не меняет их количество', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());
        board.SetTile(0, 0, null);
        board.SetTile(4, 4, null);

        board.Shuffle();

        expect(board.GetTile(0, 0)).toBeNull();
        expect(board.GetTile(4, 4)).toBeNull();
        expect(countTiles(board)).toBe(config.board.rows * config.board.columns - 2);
    });

    it('GetPlacements отдаёт координаты, совпадающие с непустыми клетками', () => {
        const board = createBoard(config);
        setBoard(board, checkerboard());
        board.SetTile(0, 0, null);

        const placements = board.GetPlacements();

        placements.forEach((placement) => {
            expect(board.GetTile(placement.Cell.Row, placement.Cell.Col)).toBe(placement.Tile);
        });
        expect(placements).toHaveLength(countTiles(board));
    });
});
