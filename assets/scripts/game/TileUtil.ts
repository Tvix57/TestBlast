import { Tile, TileType } from '../core/Tile';

/** Кадры всех типов тайлов в атласе game_obj: обычные цвета и супер-тайлы. */
const TILE_FRAMES = new Map<TileType, string>([
    [TileType.Blue, 'block_blue'],
    [TileType.Red, 'block_red'],
    [TileType.Green, 'block_green'],
    [TileType.Yellow, 'block_yellow'],
    [TileType.Purple, 'block_purpure'],
    [TileType.Bomb, 'block_bomb'],
    [TileType.BombMax, 'block_bomb_max'],
    [TileType.HorizontalBlast, 'horizontal_blast'],
    [TileType.VerticalBlast, 'vertical_blast']
]);

export interface ITileSize {
    width: number;
    height: number;
}

export class TileUtil {
    public static FrameName(tile: Tile): string {
        if (!tile) {
            return '';
        }
        return TILE_FRAMES.get(tile.Type) || '';
    }

    public static Fit(art: ITileSize, cellSize: number): ITileSize {
        const width = TileUtil.SafeSize(art ? art.width : 0);
        const height = TileUtil.SafeSize(art ? art.height : 0);
        const cell = typeof cellSize === 'number' && isFinite(cellSize) && cellSize > 0 ? cellSize : 0;
        const scale = cell > 0 ? Math.min(cell / width, cell / height) : 0;
        return { width: width * scale, height: height * scale };
    }

    private static SafeSize(value: number): number {
        return typeof value === 'number' && isFinite(value) && value > 0 ? value : 1;
    }
}
