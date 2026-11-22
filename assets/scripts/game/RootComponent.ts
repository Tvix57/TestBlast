import { IBoosterConfigFile, IFieldConfigFile, IGameConfig } from '../core/Config';
import { DialogManagerComponent } from './dialogs/DialogManagerComponent';
import { Root } from './Root';
import { SceneManagerComponent } from './scenes/SceneManagerComponent';

const { ccclass, property } = cc._decorator;

@ccclass
export class RootComponent extends cc.Component {
    @property({ type: cc.JsonAsset, visible: true })
    public gameConfigAsset!: cc.JsonAsset;

    @property({ type: cc.JsonAsset, visible: true })
    public boosterConfigAsset!: cc.JsonAsset;

    @property({ type: cc.JsonAsset, visible: true })
    public fieldConfigAsset!: cc.JsonAsset;

    @property({ type: SceneManagerComponent, visible: true })
    public sceneManager!: SceneManagerComponent;

    @property({ type: DialogManagerComponent, visible: true })
    public dialogManager!: DialogManagerComponent;

    protected onLoad(): void {
        Root.Instance.Initialize(
            this.gameConfigAsset.json as IGameConfig,
            this.boosterConfigAsset.json as IBoosterConfigFile,
            this.fieldConfigAsset.json as IFieldConfigFile,
            this.dialogManager,
            this.sceneManager
        );
    }
}

