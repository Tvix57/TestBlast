import { TileView } from './TileView';
import { IBoardZoneSize } from './layout/BoardLayout';

export interface IBoardStage {
    CreateTileView(): TileView | null;
    ReleaseTileView(view: TileView): void;
    ClearTiles(): void;
    GetGridSize(): IBoardZoneSize;
    GetScale(): number;
    ReportError(message: string): void;
}
