# SportMates Matchup Platform · 同好会

面向手机浏览器的运动搭子匹配平台：用户填写兴趣、水平、活动范围和空闲时间，系统生成邀约，管家协助完成场地预订与人工收退款。

本仓库开源的是**新版手机网站**，不是原生微信小程序，也不包含原线上网站的账号或数据库。代码采用 [MIT License](LICENSE)。

## 功能

- 手机号与密码注册、登录；个人资料、出生日期计算年龄区间、性别、虚拟头像。
- 运动水平、多区域、活动半径、每周空闲与例外日期；共同时间多选与匹配邀约。
- 邀约、场地选择、人工预订、付款登记、取消、退款和活动结束状态。
- 独立管理员登录，人工核实收款和退款凭据，管理活动与账务。
- 可选 Seedream 自拍头像生成；原图只在请求内处理，生成头像存储在私有 R2 中。
- `/demo` 提供虚构用户与模拟流程，不连接真实账号，不产生真实付款。

## 技术与目录

React 19 + TypeScript + Vinext / Vite + Tailwind CSS；Cloudflare Worker、D1、R2；Drizzle 迁移。

```text
app/             手机网站、管理员页、演示页、API 路由
components/      界面组件
lib/             匹配规则、账号、账务、头像与位置逻辑
db/              数据表结构
drizzle/         空数据库迁移（不含用户种子）
tests/           规则、权限、并发和 API 测试
worker.ts        HTTP 与定时任务入口
```

## 本地运行

需要 Node.js 22.13 或更高版本及 pnpm。

```sh
git clone https://github.com/owenmao-builder/SportMates-Matchup-Platform.git
cd SportMates-Matchup-Platform
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
pnpm dev
```

打开终端打印的本地地址。`/demo` 可直接体验虚构流程。真实账号入口 `/` 需要先初始化本地 D1；请使用下述命令，仅对**空的本地数据库**执行一次：

```sh
pnpm build
pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0000_chief_swordsman.sql
pnpm exec wrangler d1 execute DB --local --persist-to .wrangler/state --config dist/server/wrangler.json --file drizzle/0001_nice_lethal_legion.sql
pnpm dev
```

应用不会在 HTTP 请求内自动建表。不要把这些初始化命令用于已有线上数据库。后续 schema 变更应通过版本化迁移处理。

### 服务端配置

只在本机忽略的 `.dev.vars` 或部署平台的服务端 secrets 中填写真实值。

| 配置 | 用途 |
| --- | --- |
| `APP_ORIGIN` | 浏览器访问的完整来源地址，无末尾斜杠，例如本地 `http://localhost:3000`；端口必须一致 |
| `ADMIN_PASSWORD_HASH` | 自设强密码的 bcrypt 散列，成本参数 12；空值时不能登录后台 |
| `JOB_SECRET` | 可选独立调度器调用 `/api/club/jobs` 的 Bearer 密钥 |
| `ARK_API_KEY` | 可选火山方舟头像生成密钥，可能产生费用 |
| `AVATAR_IMAGE_MODEL` | 自己账号已开通的图像模型 ID，不要假定示例或默认模型对所有账号可用 |

`DB` 与 `BUCKET` 是 Worker 的 D1/R2 绑定，不是要粘贴到前端的密钥。生产环境需配置自己的资源。

人工预订联系人在 `lib/manual-booking.ts` 配置；默认没有二维码。若启用，使用你有权公开的**微信好友二维码**，不要用登录码或收款码代替。`public/contact/` 默认被 Git 忽略，防止误把私人二维码提交进开源库。

### 部署说明

- 当前构建保留 Sites / Cloudflare 的适配层，但 `.openai/hosting.json` 已移除原项目 ID。需要为自己的部署创建独立项目与资源，不能直接发布到原网站。
- `vite.config.ts` 中 D1 ID 和资源名是本地开发占位配置，不是线上凭据。自行部署 Cloudflare 时须配置自己的 D1、R2、域名、secrets 和迁移。
- `worker.ts` 导出定时任务，配置声明每分钟触发状态检查；是否真正注册 Cron 取决于部署平台。必须检查后台的最近调度时间，不要把页面刷新当作后台定时任务。
- 可选使用 `JOB_SECRET` 保护的 `POST /api/club/jobs` 接入独立调度器。本仓库不包含原项目的调度器凭据。

## 验证

```sh
pnpm test
pnpm typecheck
pnpm build
```

API 测试使用内存 SQLite 模拟 D1、虚构账号及本地 mock，不需要真实用户或付费模型。演示数据和测试密码不是部署账号。

## 使用边界

- 手机号仅校验格式，**尚未短信验证手机归属**。
- 收退款是**人工登记与核实**，并未接入微信支付或自动转账接口；不得把登记成功视为已实际收款。
- 商圈/半径和用户主动提供的定位用于粗略匹配，未集成地图地址搜索或反向地理编码。
- 社区业务状态目前保存在 D1 单行，通过 revision 控制并发；扩大规模前需要将活动和历史流水分表。
- 开源不意味着无需部署配置或安全审计。对外运营前请阅读 [SECURITY.md](SECURITY.md)，完善账号验证、隐私说明、备份、权限和运营流程。

## 许可

项目原创代码遵循 [MIT](LICENSE)。第三方依赖遵循各自许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；不要把第三方服务、商标、用户肖像或个人二维码视为由本项目授予使用权。
