const { ccclass, property } = cc._decorator;

@ccclass
export class BoosterButtonView extends cc.Component {
    @property(cc.Sprite)
    public icon: cc.Sprite = null;

    @property(cc.Label)
    public countLabel: cc.Label = null;

    @property(cc.SpriteFrame)
    public bombIcon: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    public teleportIcon: cc.SpriteFrame = null;

}
