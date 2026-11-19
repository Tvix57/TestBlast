export enum SceneType {
    MainScene = 0
}

export interface ISceneManager {
    OpenScene(sceneType: SceneType, layout: number): cc.Node;
    CloseScene(): boolean;
    CloseAllScenes(): void;
    GetCurrentSceneType(): SceneType;
    GetCurrentSceneNode(): cc.Node;
}
