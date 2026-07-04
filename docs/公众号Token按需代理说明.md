# 公众号 Token 按需代理说明

## 背景

微信公众号接口获取 `access_token` 时会校验调用方公网出口 IP。Tunnelblick VPN、公司网络、家庭网络切换后，本机出口 IP 会变化，容易触发微信错误码 `40164`。

本方案将获取 `access_token` 的请求固定从 VPS 发出。插件每次需要发送草稿或测试公众号时，临时拉起一条 SSH 本地端口转发，请求完成后立即关闭隧道，不在本地保留常驻 SSH 连接。

## 当前行为

- VPS 上运行 `wechat-token-proxy.service`，监听 `127.0.0.1:8787`。
- 插件本地默认通过 SSH 将 `127.0.0.1:8787` 临时转发到 VPS 的 `127.0.0.1:8787`。
- 插件调用本地 `http://127.0.0.1:8787/token` 获取 token。
- VPS 代理使用 VPS 本机配置的公众号密钥向微信请求 `access_token`。
- 请求结束后，插件执行关闭命令，断开本地 SSH 隧道。

因此，本机是否开启 VPN、当前处于公司网络还是家庭网络，都不影响微信接口看到的出口 IP。公众号后台白名单只需要添加 VPS 公网 IP。

## 公众号白名单

需要在公众号后台「开发」相关页面的 IP 白名单中添加：

```text
107.173.86.206
```

## 本地插件配置

默认已内置 SSH 按需代理命令，一般不需要在设置页手动填写。

内置启动命令会先尝试关闭同名旧控制连接并清理控制文件，再创建新的本地转发：

```bash
ssh -p 22222 -S /tmp/notetomp-wx-token-ctl -O exit qindongliang@107.173.86.206 >/dev/null 2>&1 || true; rm -f /tmp/notetomp-wx-token-ctl; ssh -p 22222 -f -N -M -S /tmp/notetomp-wx-token-ctl -L 8787:127.0.0.1:8787 qindongliang@107.173.86.206
```

内置关闭命令：

```bash
ssh -p 22222 -S /tmp/notetomp-wx-token-ctl -O exit qindongliang@107.173.86.206
```

## VPS 服务

代理脚本：

```text
/home/qindongliang/.local/bin/wechat-token-proxy.py
```

systemd user service：

```text
/home/qindongliang/.config/systemd/user/wechat-token-proxy.service
```

公众号密钥通过 VPS 上的环境文件提供：

```text
/home/qindongliang/.config/wechat-token-proxy.env
```

这个文件权限应为 `600`，且不进入 Git 仓库。

常用检查命令：

```bash
ssh -p 22222 qindongliang@107.173.86.206 'systemctl --user status wechat-token-proxy.service'
ssh -p 22222 qindongliang@107.173.86.206 'curl -s http://127.0.0.1:8787/health'
```

## 故障判断

- `40164 invalid ip`：公众号后台没有加入 VPS 公网 IP，或请求没有走按需 SSH 代理。
- `40125 invalid appsecret`：VPS 上保存的公众号密钥不正确，需在 VPS 环境文件里更新密钥后重启服务。
- `connect ECONNREFUSED 127.0.0.1:8787`：SSH 隧道未拉起，或 VPS 代理服务未运行。
- `ssh` 相关错误：本机到 VPS 的 SSH 登录不可用，先用 `ssh -p 22222 qindongliang@107.173.86.206` 验证。

## 安全说明

本地插件不需要依赖本地保存的 AppSecret 来获取 token。启用默认 SSH 按需代理后，真正用于请求微信接口的 AppSecret 来自 VPS 环境文件。

仓库里只保存代理脚本、服务模板和默认 SSH 命令，不保存公众号 AppSecret。
