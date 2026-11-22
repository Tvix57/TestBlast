import { Tile } from '../assets/scripts/core/Tile';
import { TileUtil } from '../assets/scripts/game/TileUtil';

function tile(color: string): Tile {
    return new Tile(1, color);
}

describe('TileUtil: кадр и вписывание без `cc`', () => {
    it('имя кадра берётся из атласа по цвету', () => {
        expect(TileUtil.FrameName(tile('blue'))).toBe('block_blue');
        expect(TileUtil.FrameName(tile('red'))).toBe('block_red');
        expect(TileUtil.FrameName(tile('green'))).toBe('block_green');
        expect(TileUtil.FrameName(tile('yellow'))).toBe('block_yellow');
        expect(TileUtil.FrameName(tile('purple'))).toBe('block_purpure');
    });

    it('неизвестный цвет и отсутствующий тайл не дают кадра', () => {
        expect(TileUtil.FrameName(tile('orange'))).toBe('');
        expect(TileUtil.FrameName(tile(''))).toBe('');
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
