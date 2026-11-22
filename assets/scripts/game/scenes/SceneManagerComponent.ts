import { DefaultSceneLayout, ISceneManager, SceneType } from './ISceneManager';
import { NodeUtil } from '../ui/NodeUtil';

const { ccclass, property } = cc._decorator;

interface ISceneEntry {
    Type: SceneType;
    Layout: number;
    Node: cc.Node;
}

@ccclass
export class SceneManagerComponent extends cc.Component implements ISceneManager {
    @property({ type: [cc.Prefab], visible: true })
    public scenePrefabs!: cc.Prefab[];

    @property({ type: cc.Enum(SceneType), visible: true })
    public startScene: SceneType = SceneType.MainScene;

    @property({ type: cc.Integer, visible: true })
    public startLayout: number = DefaultSceneLayout(SceneType.MainScene);

    private _sceneStack: ISceneEntry[] = [];

    protected start(): void {
        this.OpenScene(this.startScene, this.startLayout);
    }

    protected onDestroy(): void {
        this.CloseAllScenes();
    }

    public OpenScene(sceneType: SceneType, layout: number): cc.Node {
        const prefab = this.scenePrefabs ? this.scenePrefabs[sceneType] : null;
        if (!prefab) {
            cc.error('SceneManagerComponent: не задан префаб для SceneType ' + sceneType);
            return null;
        }
        const node = cc.instantiate(prefab);
        node.setPosition(0, 0, 0);
        this.closeByLayout(layout);
        this.node.addChild(node);
        this._sceneStack.push({ Type: sceneType, Layout: layout, Node: node });
        return node;
    }

    public CloseScene(): boolean {
        const entry = this._sceneStack.pop();
        if (!entry) {
            return false;
        }
        NodeUtil.Destroy(entry.Node);
        return true;
    }

    public CloseAllScenes(): void {
        while (this._sceneStack.length > 0) {
            this.CloseScene();
        }
    }

    public GetCurrentSceneType(): SceneType {
        return this._sceneStack.length > 0 ? this._sceneStack[this._sceneStack.length - 1].Type : null;
    }

    public GetCurrentSceneNode(): cc.Node {
        return this._sceneStack.length > 0 ? this._sceneStack[this._sceneStack.length - 1].Node : null;
    }

    private closeByLayout(layout: number): void {
        while (this._sceneStack.length > 0) {
            const top = this._sceneStack[this._sceneStack.length - 1];
            if (top.Layout > layout) {
                return;
            }
            this.CloseScene();
        }
    }
}
