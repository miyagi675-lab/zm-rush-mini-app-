import assert from 'node:assert/strict';
import {copyFile, lstat, mkdir, readdir, writeFile} from 'node:fs/promises';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {modelAssetPaths} from '../asset-loader.js';
import {entries, playerModels} from '../catalog.js';
import {modelPreview} from '../model-groups.js';
import {weapons} from '../weapon-catalog.js';

const source = fileURLToPath(new URL('../', import.meta.url));
assert(process.argv.length === 3, 'Usage: node scripts/build-pages.mjs <empty output directory>');
const destination = resolve(process.argv[2]);
const allowedPath = /^[\w-]+(?:\/[\w-]+)*\.[\w.]+$/;
const files = new Set(['index.html', 'logo.svg']);

function add(file) {
  assert.match(file, allowedPath, 'Unsafe Pages file path: ' + file);
  files.add(file);
}

for (const file of await readdir(source, {withFileTypes:true})) {
  if (file.isFile() && /\.(?:js|css)$/.test(file.name)) add(file.name);
}
for (const file of await readdir(join(source, 'vendor'), {withFileTypes:true})) {
  if (file.isFile()) add('vendor/' + file.name);
}

function addModel(file, preview) {
  const {packed, raw} = modelAssetPaths(file);
  add(packed);
  if (raw) add(raw);
  add(preview);
}

for (const {id} of entries) addModel('hats/' + id + '.mdl', 'assets/previews-v2/' + id + '.webp');
for (const {id, file} of playerModels) addModel(file, modelPreview(id));
for (const {id} of weapons) addModel('weapons-v1/' + id + '.mdl', 'assets/weapons-v1/' + id + '.webp');

let bytes = 0;
for (const file of files) {
  const stat = await lstat(join(source, file));
  assert(stat.isFile(), 'Expected a regular Pages file: ' + file);
  bytes += stat.size;
}

await mkdir(destination, {recursive:true});
assert.equal((await readdir(destination)).length, 0, 'Pages output directory must be empty');
const directories = new Set([destination]);
for (const file of files) {
  const output = join(destination, file);
  const directory = dirname(output);
  if (!directories.has(directory)) {
    await mkdir(directory, {recursive:true});
    directories.add(directory);
  }
  await copyFile(join(source, file), output);
}
const commit = process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA;
if (commit && /^[a-f0-9]{40}$/.test(commit)) {
  await writeFile(join(destination, 'release.json'), JSON.stringify({commit}) + '\n');
}
console.log('Built Pages with ' + files.size + ' files and ' + (bytes / 1e6).toFixed(1) + ' MB');
