dev:
  npm run dev

build:
  npm run build

deploy target: build
  rsync -av --delete --progress build package.json package-lock.json {{target}}:~/npanel/
  ssh {{target}} 'cd npanel; nvm use; npm ci --omit dev'
  ssh {{target}} 'systemctl restart npanel'
