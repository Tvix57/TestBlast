/** Единственный тип тайла: обычный цвет или супер-тайл. */
export enum TileType {
    Blue = 'blue',
    Red = 'red',
    Green = 'green',
    Yellow = 'yellow',
    Purple = 'purple',
    Bomb = 'bomb',
    BombMax = 'bomb_max',
    HorizontalBlast = 'horizontal_blast',
    VerticalBlast = 'vertical_blast'
}

/** Обычные цвета: из них собирается палитра поля (`board.colors`). */
export const COLOR_TILE_TYPES: TileType[] = [
    TileType.Blue,
    TileType.Red,
    TileType.Green,
    TileType.Yellow,
    TileType.Purple
];

/** Супер-тайлы: эффект берётся из `superTiles.effects` по значению типа. */
export const SUPER_TILE_TYPES: TileType[] = [
    TileType.Bomb,
    TileType.BombMax,
    TileType.HorizontalBlast,
    TileType.VerticalBlast
];

/** Тайл поля. Тип один: либо цвет, либо супер-тайл; супер-тайл в обычные группы не входит. */
export class Tile {
    public readonly Id: number;
    public readonly Type: TileType;

    constructor(id: number, type: TileType) {
        this.Id = id;
        this.Type = type;
    }

    public get IsSuper(): boolean {
        return SUPER_TILE_TYPES.indexOf(this.Type) !== -1;
    }

    public get IsMatchable(): boolean {
        return !this.IsSuper;
    }
}
