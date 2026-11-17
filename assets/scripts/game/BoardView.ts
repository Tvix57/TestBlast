const { ccclass, property } = cc._decorator;

/** Поле на сцене: сетка TileView, раскладка по конфигу и проигрывание шагов хода твинами. */
@ccclass
export class BoardView extends cc.Component {

    @property(cc.Node)
    public boardNode: cc.Node | null = null

    @property(cc.Prefab)
    public tilePrefab: cc.Prefab | null = null;

}


