const { ccclass, property } = cc._decorator;

@ccclass
export class TileView extends cc.Component {
    @property(cc.Sprite)
    public body: cc.Sprite | null = null;

    @property(cc.SpriteAtlas)
    public atlas: cc.SpriteAtlas | null = null;

}

