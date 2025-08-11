export PATH := "./node_modules/.bin:" + env_var('PATH')

dev:
  vite dev

build:
  vite build

deploy target: build
  rsync -av --delete --progress build {{target}}:~/npanel/
