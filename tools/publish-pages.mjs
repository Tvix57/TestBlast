#!/usr/bin/env node
/**
 * Публикует готовый артефакт docs/ в ветку GitHub Pages (по умолчанию build).
 *
 * GitHub Pages в этом репозитории настроен на ветку `build`, её КОРЕНЬ.
 * Поэтому артефакт кладётся в корень ветки, а не в подпапку docs/:
 * так https://<user>.github.io/<repo>/ сразу отдаёт index.html игры.
 *
 * История ветки сохраняется: новый коммит создаётся поверх текущего origin/<branch>,
 * содержимое полностью заменяется файлами из docs/ (старые файлы удаляются).
 * Рабочая копия и текущая ветка не затрагиваются — используется отдельный git-индекс.
 *
 * Имя ветки можно переопределить переменной PAGES_BRANCH.
 */
import { execFileSync } from 'node:child_process';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'docs');
const gitDir = path.join(root, '.git');
const branch = process.env.PAGES_BRANCH || 'build';

function git(args, env = {}) {
    return execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        env: { ...process.env, ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

function pagesUrl() {
    const remote = git(['remote', 'get-url', 'origin']);
    const match = /github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i.exec(remote);
    if (!match) {
        return null;
    }
    const [, owner, repo] = match;
    const name = repo.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '' : `${repo}/`;
    return `https://${owner.toLowerCase()}.github.io/${name}`;
}

async function main() {
    try {
        await access(path.join(docsDir, 'index.html'));
    } catch {
        throw new Error('Нет docs/index.html. Сначала выполните "npm run pages:prepare".');
    }

    console.log(`Ветка Pages: ${branch}`);
    git(['fetch', 'origin', branch]);

    let parent = null;
    try {
        parent = git(['rev-parse', '--verify', `origin/${branch}`]);
    } catch {
        console.log(`origin/${branch} отсутствует — создаю ветку с нуля`);
    }

    const tmp = await mkdtemp(path.join(tmpdir(), 'pages-publish-'));
    // Отдельный индекс и work-tree=docs дают дерево с путями от корня (index.html, assets/...).
    const env = { GIT_DIR: gitDir, GIT_WORK_TREE: docsDir, GIT_INDEX_FILE: path.join(tmp, 'index') };

    try {
        execFileSync('git', ['add', '-A', '-f', '.'], {
            cwd: docsDir,
            env: { ...process.env, ...env },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        const tree = git(['write-tree'], env);
        const files = git(['ls-tree', '-r', '--name-only', tree]).split('\n');
        if (!files.includes('index.html') || !files.includes('.nojekyll')) {
            throw new Error('В дереве артефакта нет index.html или .nojekyll');
        }

        const message = `publish: web build ${new Date().toISOString()}`;
        const args = ['commit-tree', tree, '-m', message];
        if (parent) {
            args.push('-p', parent);
        }
        const commit = git(args, env);

        git(['push', 'origin', `${commit}:refs/heads/${branch}`]);
        console.log(`Опубликовано: ${commit.slice(0, 7)} (${files.length} файлов)`);

        const current = git(['branch', '--show-current']);
        if (current !== branch) {
            git(['fetch', 'origin', `${branch}:${branch}`, '--force']);
        }

        const url = pagesUrl();
        console.log(url ? `Сайт: ${url} (Pages пересоберётся в течение минуты)` : 'Ветка запушена');
    } finally {
        await rm(tmp, { recursive: true, force: true });
    }
}

main().catch((error) => {
    const details = error.stderr ? String(error.stderr).trim() : '';
    console.error(error.message);
    if (details) {
        console.error(details);
    }
    process.exit(1);
});
