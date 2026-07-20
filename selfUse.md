
## cloudflare部署（推荐）
```sh
npm install -g wrangler

wrangler login
```

### 部署 Pages（静态站点）
```sh
# 首次创建
wrangler pages project create rp-hub --production-branch main
# 部署
wrangler pages deploy . --project-name rp-hub --branch main
```

### 部署 CORS 代理 Worker（解决opencode api跨域问题）
```sh
wrangler deploy proxy-worker.js --name rp-hub-proxy --compatibility-date YYYY-MM-DD
```


## pinme部署

```sh
# 安装pinme
npm install -g pinme
# 登陆
pinme login
# 部署上线
pinme upload .
```
## 桌面端打包

```sh
pnpm install -g pake-cli

nativefier 'web.whatsapp.com'


pake https://github.com --name GitHub
pake https://weekly.tw93.fun --name Weekly --icon https://cdn.tw93.fun/pake/weekly.icns --width 1200 --height 800 --hide-title-bar

```

