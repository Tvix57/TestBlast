import { BoardView } from './BoardView';
import { BoostersView } from './views/BoostersView';
import { HudView } from './views/HudView';

const { ccclass, property } = cc._decorator;

@ccclass
export class MainSceneComponent extends cc.Component {
    @property(BoardView)
    public boardView: BoardView = null;

    @property(HudView)
    public hudView: HudView = null;

    @property(BoostersView)
    public boostersView: BoostersView = null;
}
