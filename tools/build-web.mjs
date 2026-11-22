#!/usr/bin/env node
/**
 * Сборка web-версии (web-mobile) через CLI Cocos Creator 2.4.15.
 * Результат: build/web-mobile (debug=false, md5Cache=true).
 *
 * Путь к редактору можно переопределить переменной окружения COCOS_CREATOR_BIN.
 */
import { spawn } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build', 'web-mobile');

const BUILD_OPTIONS = [
    'platform=web-mobile',
    'debug=false',
    'md5Cache=true',
    'buildPath=build',
    'outputName=web-mobile',
].join(';');

async function exists(file) {
    try {
        await access(file);
        return true;
    } catch {
        return false;
    }
}

async function resolveCreatorBin(version) {
    const candidates = [
        process.env.COCOS_CREATOR_BIN,
        `/Applications/Cocos/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
        `/Applications/CocosCreator/Creator/${version}/CocosCreator.app/Contents/MacOS/CocosCreator`,
        `C:\\ProgramData\\cocos\\editors\\Creator\\${version}\\CocosCreator.exe`,
        `C:\\Program Files\\Cocos\\Creator\\${version}\\CocosCreator.exe`,
    ].filter(Boolean);

    for (const candidate of candidates) {
        if (await exists(candidate)) {
            return candidate;
        }
    }

    throw new Error(
        `Не найден Cocos Creator ${version}. Укажите путь в COCOS_CREATOR_BIN.\n` +
            `Проверены пути:\n  ${candidates.join('\n  ')}`
    );
}

async function main() {
    const project = JSON.parse(await readFile(path.join(root, 'project.json'), 'utf8'));
    const version = project.version || '2.4.15';
    const creatorBin = await resolveCreatorBin(version);

    console.log(`Cocos Creator ${version}: ${creatorBin}`);
    console.log(`Сборка ${BUILD_OPTIONS}`);

    const exitCode = await new Promise((resolve, reject) => {
        const child = spawn(creatorBin, ['--path', root, '--build', BUILD_OPTIONS], {
            cwd: root,
            stdio: 'inherit',
        });
        const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error('Сборка не завершилась за 20 минут'));
        }, 20 * 60 * 1000);

        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        child.on('close', (code) => {
            clearTimeout(timeout);
            resolve(code);
        });
    });

    const indexPath = path.join(buildDir, 'index.html');
    if (exitCode !== 0 || !(await exists(indexPath))) {
        throw new Error(`Сборка завершилась с кодом ${exitCode}, ${indexPath} не найден`);
    }

    console.log(`Готово: ${buildDir}`);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
