import { SceneManagerComponent } from '../assets/scripts/game/scenes/SceneManagerComponent';
import { SceneType } from '../assets/scripts/game/scenes/ISceneManager';

describe('SceneManagerComponent: защита от пустых ссылок', () => {
    it('OpenScene без префаба возвращает null и не падает', () => {
        const manager = new SceneManagerComponent();
        manager.scenePrefabs = [];

        expect(manager.OpenScene(SceneType.MainScene, 1)).toBeNull();
        expect(manager.GetCurrentSceneType()).toBeNull();
        expect(manager.CloseScene()).toBe(false);
    });

    it('OpenScene с undefined-списком префабов возвращает null', () => {
        const manager = new SceneManagerComponent();
        manager.scenePrefabs = undefined;

        expect(manager.OpenScene(SceneType.MainScene, 1)).toBeNull();
    });
});
