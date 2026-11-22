import * as fs from 'fs';
import * as path from 'path';

import { DefaultSceneLayout, SceneType } from '../assets/scripts/game/scenes/ISceneManager';
import {
    ASSETS_DIR, collectAssetUuids, collectScriptClasses, getAssetFiles,
    getAssetMetaFiles, readJson, serializedAssetTargets
} from './helpers';

const ASSETS = ASSETS_DIR;
const allFiles = getAssetFiles();
const metaFiles = getAssetMetaFiles();

describe('Сгенерированные ассеты', () => {
    const uuids = collectAssetUuids(metaFiles);
    const classes = collectScriptClasses(allFiles);

    it('все ссылки __uuid__ и __type__ в сцене и префабах разрешаются', () => {
        const problems: string[] = [];
        serializedAssetTargets().forEach((file) => {
            const data = readJson(file);
            data.forEach((object: any, index: number) => {
                Object.keys(object).forEach((key) => {
                    const value = object[key];
                    if (value && typeof value === 'object' && '__uuid__' in value && !uuids.has(value.__uuid__)) {
                        problems.push(`${path.basename(file)}[${index}].${key}: ${value.__uuid__}`);
                    }
                });
                const type = object.__type__;
                if (type && !type.startsWith('cc.') && !classes.has(type)) {
                    problems.push(`${path.basename(file)}[${index}]: ${type}`);
                }
            });
        });
        expect(problems).toEqual([]);
    });

    it('все ссылки __id__ указывают внутрь массива объектов', () => {
        const problems: string[] = [];
        serializedAssetTargets().forEach((file) => {
            const data = readJson(file);
            data.forEach((object: any, index: number) => {
                Object.keys(object).forEach((key) => {
                    const value = object[key];
                    if (value && typeof value === 'object' && '__id__' in value) {
                        if (value.__id__ < 0 || value.__id__ >= data.length) {
                            problems.push(`${path.basename(file)}[${index}].${key}: ${value.__id__}`);
                        }
                    }
                });
            });
        });
        expect(problems).toEqual([]);
    });

    it('каждый скрипт имеет meta с уникальным uuid', () => {
        const uuidsOfScripts = new Set<string>();
        allFiles.filter((file) => file.endsWith('.ts')).forEach((file) => {
            const meta = readJson(file + '.meta');
            expect(meta.importer).toBe('typescript');
            expect(uuidsOfScripts.has(meta.uuid)).toBe(false);
            uuidsOfScripts.add(meta.uuid);
        });
        expect(classes.size).toBeGreaterThan(20);
    });

    it('игровые view-компоненты присутствуют в сцене или префабах', () => {
        const attached = new Set<string>();
        serializedAssetTargets().forEach((file) => {
            readJson(file).forEach((object: any) => {
                const type = object.__type__;
                if (type && !type.startsWith('cc.')) {
                    attached.add(classes.get(type));
                }
            });
        });

        [
            'game/RootComponent.ts', 'game/MainSceneComponent.ts',
            'game/dialogs/DialogManagerComponent.ts', 'game/scenes/SceneManagerComponent.ts',
            'game/BoardView.ts', 'game/views/HudView.ts',
            'game/views/BoostersView.ts', 'game/views/BoosterButtonView.ts',
            'game/TileView.ts', 'game/dialogs/StartDialogView.ts', 'game/dialogs/EndDialogView.ts'
        ].forEach((expected) => expect(Array.from(attached)).toContain(expected));
    });

    it('префабы содержат ожидаемые классы компонентов', () => {
        const expected: { [prefab: string]: string } = {
            'Tile.prefab': 'game/TileView.ts',
            'BoosterButton.prefab': 'game/views/BoosterButtonView.ts',
            'StartDialog.prefab': 'game/dialogs/StartDialogView.ts',
            'EndDialog.prefab': 'game/dialogs/EndDialogView.ts'
        };
        Object.keys(expected).forEach((prefab) => {
            const data = readJson(path.join(ASSETS, 'prefabs', prefab));
            const attached = data
                .filter((object: any) => object.__type__ && !object.__type__.startsWith('cc.'))
                .map((object: any) => classes.get(object.__type__));
            expect(attached).toContain(expected[prefab]);
        });
    });

    it('отступы поля заданы cc.Widget в префабе BoardZone, а не в коде', () => {
        const data = readJson(path.join(ASSETS, 'prefabs', 'BoardZone.prefab'));
        const widgetOf = (name: string): any => {
            const node = data.find((object: any) => object.__type__ === 'cc.Node' && object._name === name);
            expect(node).toBeTruthy();
            const ids = node._components.map((component: any) => component.__id__);
            return data[ids.find((id: number) => data[id].__type__ === 'cc.Widget')];
        };

        const frame = widgetOf('BoardFrame');
        expect(frame._alignFlags).toBe(45);
        expect(frame._isAbsLeft).toBe(false);
        expect(frame._left).toBeCloseTo(0.05, 8);

        const inner = widgetOf('BoardInner');
        expect(inner._alignFlags).toBe(45);
        expect(inner._isAbsLeft).toBe(false);
        expect(inner._left).toBeCloseTo(0.04, 8);

        const board = widgetOf('Board');
        expect(board._alignFlags).toBe(45);
        expect(board._isAbsLeft).toBe(false);
        expect(board._left).toBeCloseTo(0.04, 8);

        const view = data.find((object: any) => object.boardNode && object.tilePrefab);
        expect(view).toBeTruthy();
        ['frameNode', 'innerNode', 'innerPaddingRatio', 'frameBorderRatio', 'zonePaddingRatio']
            .forEach((name) => expect(view[name]).toBeUndefined());
    });

    it('контейнер кнопок бустеров задан cc.Layout в префабах', () => {
        ['BoosterZone.prefab', 'MainScene.prefab'].forEach((prefab) => {
            const data = readJson(path.join(ASSETS, 'prefabs', prefab));
            const view = data.find((object: any) => object.boosterLayout);
            expect(view).toBeTruthy();

            const node = data[view.boosterLayout.__id__];
            expect(node.__type__).toBe('cc.Node');
            const componentTypes = node._components.map((component: any) => data[component.__id__].__type__);
            expect(componentTypes).toContain('cc.Layout');
        });
    });

    it('вложенный BoardZone в MainScene повторяет Widget-отступы из префаба', () => {
        const data = readJson(path.join(ASSETS, 'prefabs', 'MainScene.prefab'));
        const widgetOf = (name: string): any => {
            const node = data.find((object: any) => object.__type__ === 'cc.Node' && object._name === name);
            expect(node).toBeTruthy();
            const ids = node._components.map((component: any) => component.__id__);
            return data[ids.find((id: number) => data[id].__type__ === 'cc.Widget')];
        };

        ['BoardFrame', 'BoardInner', 'Board'].forEach((name) => {
            const widget = widgetOf(name);
            expect(widget).toBeTruthy();
            expect(widget._alignFlags).toBe(45);
            expect(widget._isAbsLeft).toBe(false);
            expect(widget._left).toBeGreaterThan(0);
        });
    });

    it('в BoardView нет коэффициентов отступов: геометрию задают cc.Widget', () => {
        const source = fs.readFileSync(path.join(ASSETS, 'scripts/game/BoardView.ts'), 'utf8');

        ['innerPaddingRatio', 'frameBorderRatio', 'zonePaddingRatio'].forEach((name) => {
            expect(source).not.toContain(`public ${name}:`);
            expect(source).not.toContain(`this.${name}`);
        });
    });

    it('якоря нод в префабах — только 0, 0.5 или 1', () => {
        const problems: string[] = [];
        serializedAssetTargets().forEach((file) => {
            readJson(file).forEach((object: any) => {
                if (object.__type__ !== 'cc.Node') {
                    return;
                }
                const anchor = object._anchorPoint || {};
                [anchor.x, anchor.y].forEach((value) => {
                    if ([0, 0.5, 1].indexOf(value) < 0) {
                        problems.push(`${path.basename(file)}: ${object._name} (${anchor.x}, ${anchor.y})`);
                    }
                });
            });
        });

        expect(problems).toEqual([]);
    });

    it('числа в cc.Widget и cc.Layout — не больше двух знаков после запятой', () => {
        const problems: string[] = [];
        const checkValue = (file: string, owner: string, key: string, value: any): void => {
            if (typeof value === 'boolean') {
                return;
            }
            if (typeof value === 'number' && !Number.isInteger(value) && Math.round(value * 100) / 100 !== value) {
                problems.push(`${path.basename(file)}: ${owner}.${key} = ${value}`);
            }
            if (value && typeof value === 'object') {
                Object.keys(value).forEach((child) => {
                    checkValue(file, owner, `${key}.${child}`, value[child]);
                });
            }
        };

        serializedAssetTargets().forEach((file) => {
            const data = readJson(file);
            data.forEach((object: any) => {
                if (object.__type__ !== 'cc.Widget' && object.__type__ !== 'cc.Layout') {
                    return;
                }
                const node = data[object.node.__id__];
                Object.keys(object).forEach((key) => {
                    checkValue(file, `${object.__type__}/${node._name}`, key, object[key]);
                });
            });
        });

        expect(problems).toEqual([]);
    });

    it('в сцене есть cc.Canvas с дизайн-разрешением 720x1280', () => {
        const scene = readJson(path.join(ASSETS, 'scenes/Game.fire'));
        const canvas = scene.find((object: any) => object.__type__ === 'cc.Canvas');

        expect(canvas._designResolution).toEqual({ __type__: 'cc.Size', width: 720, height: 1280 });
        expect(canvas._fitWidth).toBe(true);
        expect(canvas._fitHeight).toBe(true);
    });

    it('менеджер диалогов хранит массив префабов окон', () => {
        const scene = readJson(path.join(ASSETS, 'scenes/Game.fire'));
        const manager = scene.find((object: any) => Array.isArray(object.dialogPrefabs));

        expect(manager).toBeTruthy();
        expect(manager.dialogPrefabs.length).toBe(2);
        manager.dialogPrefabs.forEach((reference: any) => {
            expect(uuids.has(reference.__uuid__)).toBe(true);
        });
    });

    it('менеджер сцен хранит массив префабов сцен', () => {
        const scene = readJson(path.join(ASSETS, 'scenes/Game.fire'));
        const manager = scene.find((object: any) => Array.isArray(object.scenePrefabs));

        expect(manager).toBeTruthy();
        expect(manager.scenePrefabs.length).toBe(1);
        expect(manager.startLayout).toBe(DefaultSceneLayout(SceneType.MainScene));
        manager.scenePrefabs.forEach((reference: any) => {
            expect(uuids.has(reference.__uuid__)).toBe(true);
        });
    });

    it('RootComponent инициализирует только конфиги и базовые менеджеры', () => {
        const scene = readJson(path.join(ASSETS, 'scenes/Game.fire'));
        const root = scene.find((object: any) => object.gameConfigAsset);

        expect(root).toBeTruthy();
        expect(root.boosterConfigAsset).toBeTruthy();
        expect(uuids.has(root.gameConfigAsset.__uuid__)).toBe(true);
        expect(uuids.has(root.boosterConfigAsset.__uuid__)).toBe(true);

        const sceneManager = scene[root.sceneManager.__id__];
        const dialogManager = scene[root.dialogManager.__id__];
        expect(Array.isArray(sceneManager.scenePrefabs)).toBe(true);
        expect(sceneManager.startScene).toBe(0);
        expect(sceneManager.startLayout).toBe(1);
        expect(Array.isArray(dialogManager.dialogPrefabs)).toBe(true);
    });
});
