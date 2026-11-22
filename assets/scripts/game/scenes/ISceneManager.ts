export enum SceneType {
    MainScene = 0
}

export const SCENE_LAYOUTS: { [type: number]: number } = {
    [SceneType.MainScene]: 1
};

export function DefaultSceneLayout(sceneType: SceneType): number {
    const layout = SCENE_LAYOUTS[sceneType];
    return typeof layout === 'number' ? layout : 1;
}

export interface ISceneManager {
    OpenScene(sceneType: SceneType, layout: number): cc.Node;
    CloseScene(): boolean;
    CloseAllScenes(): void;
    GetCurrentSceneType(): SceneType;
    GetCurrentSceneNode(): cc.Node;
}
