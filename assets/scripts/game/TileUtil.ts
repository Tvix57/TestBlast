import { Tile } from '../core/Tile';

const COLOR_FRAMES: { [color: string]: string } = {
    blue: 'block_blue',
    red: 'block_red',
    green: 'block_green',
    yellow: 'block_yellow',
    purple: 'block_purpure'
};

export interface ITileSize {
    width: number;
    height: number;
}

export class TileUtil {
    public static FrameName(tile: Tile): string {
        if (!tile) {
            return '';
        }
        return COLOR_FRAMES[tile.Color] || '';
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
