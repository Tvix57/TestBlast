const { ccclass, property } = cc._decorator;

@ccclass
export class HudView extends cc.Component {
    @property(cc.Label)
    public scoreLabel: cc.Label | null = null;

    @property(cc.Label)
    public movesLabel: cc.Label | null = null;

    @property(cc.Label)
    public timeLabel: cc.Label | null = null;

    /** Узел с кругом ходов: скрывается, если лимита ходов нет. */
    @property(cc.Node)
    public movesNode: cc.Node | null = null;

    @property(cc.Node)
    public timerRoot: cc.Node | null = null;

}
