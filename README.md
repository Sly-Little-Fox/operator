# Operator
> Operator is my new bot. It has auto-moderation, sandbox for executing JavaScript, and a couple of other features.

> This README only covers self-hosting and some things in the code. Check [./docs/](docs) and command descriptions for bot documentation.

> Hosted version: https://top.gg/bot/972148654410448896

## Installation
### From `production` branch
1. `git clone https://github.com/Sly-Little-Fox/operator`
2. `git switch production`
3. `tsc`
4.  Copy .env.example to .env and fill values.
5. `[DOCKER_BUILDKIT=1] docker-compose build`
6. `docker-compose up --compatibility [-d]`

### From `main` branch
> :warning: This branch is barely tested. Unless you really want it, use `production`.
1. `git clone https://github.com/Sly-Little-Fox/operator`
2.  Copy .env.example to .env and fill values.
3.  `tsc`
4.  You may want to remove `import "@sapphire/plugin-hmr/register"` from `src/index.ts`.
5. `[DOCKER_BUILDKIT=1] docker-compose build`
6. `docker-compose up --compatibility [-d]`

## Updating
Just run `git pull` followed by `docker-compose build`, it should update everything for you.<br>
If you get merge conflicts (you shouldn't if you haven't modified the code), this is probably the easiest way to fix them:
1. `git fetch --all`
2. `git reset --hard origin/\<branch-you-used-when-installing>`
or just clone it again :troll:

**Please note that this restores all tracked files to their state in the repository, discarding local changes.**
