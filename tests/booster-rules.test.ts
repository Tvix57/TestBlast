import { BoosterRules, BoosterTargeting, BoosterType } from '../assets/scripts/core/BoosterRules';
import { TileType } from '../assets/scripts/core/Tile';
import { loadBoosterConfig } from './helpers';

describe('BoosterRules: чтение конфига', () => {
    it('бустеры берутся из booster-config.json в порядке конфига', () => {
        const rules = new BoosterRules(loadBoosterConfig());

        expect(rules.GetBoosters().map((booster) => booster.type)).toEqual([
            BoosterType.Teleport, BoosterType.Bomb
        ]);
    });

    it('поиск бустера по типу и способу применения', () => {
        const rules = new BoosterRules(loadBoosterConfig());

        expect(rules.GetBooster(BoosterType.Bomb).targeting).toBe(BoosterTargeting.Cell);
        expect(rules.GetBooster(BoosterType.Teleport).targeting).toBe(BoosterTargeting.Pair);
        expect(rules.GetBooster('nope' as BoosterType)).toBeNull();
    });

    it('набор бустеров задаётся конфигом, а не кодом', () => {
        const config = loadBoosterConfig();
        config.boosters = [config.boosters[1]];

        expect(new BoosterRules(config).GetBoosters()).toHaveLength(1);
    });
});

describe('BoosterRules: супер-тайлы', () => {
    it('пороги появления супер-тайлов берутся из конфига', () => {
        const rules = new BoosterRules(loadBoosterConfig());

        expect(rules.GetSpawnTypes(4)).toEqual([]);
        expect(rules.GetSpawnTypes(5)).toEqual([TileType.Bomb]);
        expect(rules.GetSpawnTypes(7)).toEqual([TileType.HorizontalBlast, TileType.VerticalBlast]);
        expect(rules.GetSpawnTypes(9)).toEqual([TileType.BombMax]);
        expect(rules.GetSpawnTypes(20)).toEqual([TileType.BombMax]);
    });

    it('выбирается правило с наибольшим подходящим порогом', () => {
        const config = loadBoosterConfig();
        config.superTiles.spawnRules = [
            { minGroupSize: 3, types: [TileType.Bomb] },
            { minGroupSize: 6, types: [TileType.BombMax] },
            { minGroupSize: 10, types: [TileType.HorizontalBlast] }
        ];
        const rules = new BoosterRules(config);

        expect(rules.GetSpawnTypes(3)).toEqual([TileType.Bomb]);
        expect(rules.GetSpawnTypes(6)).toEqual([TileType.BombMax]);
        expect(rules.GetSpawnTypes(9)).toEqual([TileType.BombMax]);
        expect(rules.GetSpawnTypes(10)).toEqual([TileType.HorizontalBlast]);
    });

    it('эффект супер-тайла ищется по типу', () => {
        const rules = new BoosterRules(loadBoosterConfig());

        expect(rules.GetSuperEffect(TileType.Bomb).shape).toBe('square');
        expect(rules.GetSuperEffect(TileType.HorizontalBlast).shape).toBe('row');
        expect(rules.GetSuperEffect('nope' as TileType)).toBeNull();
    });

    it('без секции superTiles поиск не падает', () => {
        const config = loadBoosterConfig();
        delete (config as any).superTiles;
        const rules = new BoosterRules(config);

        expect(rules.GetSuperEffect(TileType.Bomb)).toBeNull();
        expect(rules.GetSpawnTypes(10)).toEqual([]);
    });
});
