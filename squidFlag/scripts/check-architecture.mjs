import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const workspaces = {
  '@squidflag/contracts': 'packages/contracts',
  '@squidflag/flag-engine': 'packages/flag-engine',
  '@squidflag/api': 'apps/api',
  '@squidflag/dashboard': 'apps/dashboard',
};
const allowedInternalDependencies = {
  '@squidflag/contracts': [],
  '@squidflag/flag-engine': ['@squidflag/contracts'],
  '@squidflag/api': ['@squidflag/contracts', '@squidflag/flag-engine'],
  '@squidflag/dashboard': ['@squidflag/contracts'],
};
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];
const errors = [];
async function readPackageJson(directory) {
  const filePath = path.join(root, directory, 'package.json');
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}
for (const [packageName, directory] of Object.entries(workspaces)) {
  let manifest;
  try {
    manifest = await readPackageJson(directory);
  } catch (error) {
    errors.push(`Cannot read ${directory}/package.json: ${error.message}`);
    continue;
  }
  if (manifest.name !== packageName) {
    errors.push(`${directory}/package.json must declare name "${packageName}".`);
    continue;
  }
  const allowed = new Set(allowedInternalDependencies[packageName]);
  for (const section of dependencySections) {
    const dependencies = manifest[section] ?? {};
    for (const dependencyName of Object.keys(dependencies)) {
      if (Object.hasOwn(workspaces, dependencyName) && !allowed.has(dependencyName)) {
        errors.push(
          `${packageName} declares forbidden internal dependency ` +
            `"${dependencyName}" in "${section}".`,
        );
      }
    }
  }
}
if (errors.length > 0) {
  console.error('Architecture checks failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log('Architecture checks passed.');
}
