#!/usr/bin/env node
/**
 * Готовит статический артефакт для GitHub Pages: build/web-mobile -> docs/.
 *
 * - пересоздаёт docs/ с нуля;
 * - отбрасывает служебные файлы (.runtime-bridge, .DS_Store);
 * - добавляет .nojekyll (чтобы Pages не прогонял файлы через Jekyll);
 * - проверяет, что в index.html не осталось неразвёрнутых плейсхолдеров Cocos.
 *
 * Пути в сборке относительные, поэтому она работает и из подпапки
 * https://<user>.github.io/<repo>/.
 */
import { cp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'build', 'web-mobile');
const outDir = path.join(root, 'docs');
const IGNORED = new Set(['.runtime-bridge', '.DS_Store', 'Thumbs.db', '__MACOSX']);

function dirSize(dir) {
    let total = 0;
    let files = 0;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const inner = dirSize(full);
            total += inner.total;
            files += inner.files;
        } else {
            total += statSync(full).size;
            files += 1;
        }
    }

    return { total, files };
}

async function main() {
    try {
        await stat(path.join(srcDir, 'index.html'));
    } catch {
        throw new Error(
            `Нет web-сборки в ${srcDir}. Сначала выполните "npm run build:web" (нужен Cocos Creator 2.4.15).`
        );
    }

    await rm(outDir, { recursive: true, force: true });
    await cp(srcDir, outDir, {
        recursive: true,
        filter: (source) => !IGNORED.has(path.basename(source)),
    });
    await writeFile(path.join(outDir, '.nojekyll'), '');

    const html = await readFile(path.join(outDir, 'index.html'), 'utf8');
    if (/<%=\s*\w+\s*%>/.test(html)) {
        throw new Error('index.html содержит неразвёрнутые плейсхолдеры Cocos — сборка неполная');
    }

    const { total, files } = dirSize(outDir);
    console.log(`GitHub Pages артефакт: ${outDir}`);
    console.log(`Файлов: ${files}, объём: ${(total / 1024 / 1024).toFixed(2)} МБ`);
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
