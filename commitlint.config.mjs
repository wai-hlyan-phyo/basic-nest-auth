import { defineConfig } from 'cz-git';

const commitTypes = [
  { value: 'feat', name: 'feat:     A new feature' },
  { value: 'fix', name: 'fix:      A bug fix' },
  { value: 'docs', name: 'docs:     Documentation only changes' },
  { value: 'style', name: 'style:    Changes that do not affect the meaning of the code' },
  { value: 'refactor', name: 'refactor: A code change that neither fixes a bug nor adds a feature' },
  { value: 'perf', name: 'perf:     A code change that improves performance' },
  { value: 'test', name: 'test:     Adding missing tests or correcting existing tests' },
  { value: 'build', name: 'build:    Changes that affect the build system or external dependencies' },
  { value: 'ci', name: 'ci:       Changes to CI configuration files and scripts' },
  { value: 'chore', name: 'chore:    Other changes that do not modify src or test files' },
  { value: 'revert', name: 'revert:   Reverts a previous commit' },
];

export default defineConfig({
  extends: ['@commitlint/config-conventional'],
  prompt: {
    types: commitTypes,
    scopes: ['app', 'auth', 'prisma', 'user', 'libs', 'test'],
    allowCustomScopes: true,
    allowEmptyScopes: true,
    useEmoji: false,
  },
});
