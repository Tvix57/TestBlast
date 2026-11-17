const { ccclass, property } = cc._decorator;

@ccclass
export class BoostersView extends cc.Component {
    @property(cc.Prefab)
    public buttonPrefab: cc.Prefab | null = null;

    @property(cc.Node)
    public boosterLayout: cc.Node | null = null;
}
