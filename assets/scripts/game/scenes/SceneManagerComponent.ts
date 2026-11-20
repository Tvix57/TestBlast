import { ISceneManager, SceneType } from './ISceneManager';
import { MainSceneComponent } from '../MainSceneComponent';

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
    public startLayout: number = MainSceneComponent.LAYOUT;

    private _sceneStack: ISceneEntry[] = [];

    protected start(): void {
        this.OpenScene(this.startScene, this.startLayout);
    }

    protected onDestroy(): void {
        this.CloseAllScenes();
    }

    public OpenScene(sceneType: SceneType, layout: number): cc.Node {
        const node = cc.instantiate(this.scenePrefabs[sceneType]);
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
        this.destroyNode(entry.Node);
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

    private destroyNode(node: cc.Node): void {
        if (!node || !node.isValid) {
            return;
        }
        if (node.parent) {
            node.removeFromParent();
        }
        node.destroy();
    }
}
