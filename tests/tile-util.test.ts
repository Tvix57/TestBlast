import { Tile, TileType } from '../assets/scripts/core/Tile';
import { TileUtil } from '../assets/scripts/game/TileUtil';

function tile(type: TileType): Tile {
    return new Tile(1, type);
}

describe('TileUtil: кадр и вписывание без `cc`', () => {
    it('имя кадра берётся из атласа по типу', () => {
        expect(TileUtil.FrameName(tile(TileType.Blue))).toBe('block_blue');
        expect(TileUtil.FrameName(tile(TileType.Red))).toBe('block_red');
        expect(TileUtil.FrameName(tile(TileType.Green))).toBe('block_green');
        expect(TileUtil.FrameName(tile(TileType.Yellow))).toBe('block_yellow');
        expect(TileUtil.FrameName(tile(TileType.Purple))).toBe('block_purpure');
    });

    it('супер-тайл получает кадр по типу из `superTiles.effects`', () => {
        expect(TileUtil.FrameName(tile(TileType.Bomb))).toBe('block_bomb');
        expect(TileUtil.FrameName(tile(TileType.BombMax))).toBe('block_bomb_max');
        expect(TileUtil.FrameName(tile(TileType.HorizontalBlast))).toBe('horizontal_blast');
        expect(TileUtil.FrameName(tile(TileType.VerticalBlast))).toBe('vertical_blast');
        expect(TileUtil.FrameName(tile('unknown' as TileType))).toBe('');
    });

    it('отсутствующий тайл не даёт кадра', () => {
        expect(TileUtil.FrameName(null)).toBe('');
    });

    it('широкий арт вписывается по ширине ячейки', () => {
        expect(TileUtil.Fit({ width: 200, height: 100 }, 50)).toEqual({ width: 50, height: 25 });
    });

    it('высокий арт вписывается по высоте ячейки', () => {
        expect(TileUtil.Fit({ width: 100, height: 200 }, 50)).toEqual({ width: 25, height: 50 });
    });

    it('квадратный арт занимает всю ячейку', () => {
        expect(TileUtil.Fit({ width: 100, height: 100 }, 50)).toEqual({ width: 50, height: 50 });
    });

    it('нулевые и нечисловые размеры не дают NaN и деления на ноль', () => {
        expect(TileUtil.Fit({ width: 100, height: 50 }, 0)).toEqual({ width: 0, height: 0 });
        expect(TileUtil.Fit({ width: 100, height: 50 }, NaN)).toEqual({ width: 0, height: 0 });
        expect(TileUtil.Fit({ width: 0, height: 0 }, 30)).toEqual({ width: 30, height: 30 });
        expect(TileUtil.Fit(null, 30)).toEqual({ width: 30, height: 30 });
    });
});
