/*
 * Copyright (c) 2024-2025 Sun Booshi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { requestUrl, RequestUrlParam, getBlobArrayBuffer } from "obsidian";

const PluginHost = 'https://obplugin.sunboshi.tech';
const DEFAULT_SSH_TOKEN_PROXY_LOCAL_URL = 'http://127.0.0.1:8787/token';
export const WX_TOKEN_PROXY_WHITELIST_IPS = ['59.110.112.211', '154.8.198.218'];
export type WxTokenSource = 'direct' | 'pluginHost' | 'customProxy' | 'sshProxy';

function stringifyWxResponse(data: any) {
    if (!data) {
        return '空响应';
    }
    try {
        return JSON.stringify(data);
    } catch (e) {
        return String(data);
    }
}

export function wxIsApiError(data: any) {
    const code = data?.errcode ?? data?.code;
    return code !== undefined && code !== null && String(code) !== '0';
}

function hasSshProxy(sshProxyCommand: string = '') {
    return sshProxyCommand.trim().length > 0;
}

function execShell(command: string) {
    const { exec } = require('child_process');
    return new Promise<void>((resolve, reject) => {
        exec(command, { timeout: 15000 }, (error: any, stdout: string, stderr: string) => {
            if (error) {
                const output = `${stderr || ''}${stdout || ''}`.trim();
                reject(new Error(output || error.message));
                return;
            }
            resolve();
        });
    });
}

export function wxGetTokenSource(authkey: string = '', tokenProxyUrl: string = '', sshProxyCommand: string = ''): WxTokenSource {
    if (hasSshProxy(sshProxyCommand)) {
        return 'sshProxy';
    }
    if (tokenProxyUrl) {
        return 'customProxy';
    }
    if (authkey) {
        return 'pluginHost';
    }
    return 'direct';
}

export function wxTokenErrorMessage(data: any, source: WxTokenSource = 'direct') {
    const code = data?.errcode ?? data?.code;
    const message = data?.errmsg || data?.message || data?.msg || data?.error || '';
    const codeText = code !== undefined && code !== null ? `（错误码：${code}）` : '';
    const wxMessage = message ? `\n微信返回：${message}` : `\n原始响应：${stringifyWxResponse(data)}`;

    switch (Number(code)) {
        case 40164:
            if (source === 'pluginHost') {
                return `IP 地址不在公众号白名单中${codeText}。\n当前通过订阅服务获取 token，请在公众号后台「IP 白名单」添加：${WX_TOKEN_PROXY_WHITELIST_IPS.join('、')}。${wxMessage}`;
            }
            if (source === 'customProxy') {
                return `IP 地址不在公众号白名单中${codeText}。\n当前通过自定义 Token 代理获取 token，请确认公众号后台「IP 白名单」已添加该代理服务器的公网出口 IP。${wxMessage}`;
            }
            if (source === 'sshProxy') {
                return `IP 地址不在公众号白名单中${codeText}。\n当前通过 SSH 按需代理获取 token，请确认公众号后台「IP 白名单」已添加 VPS 的公网出口 IP。${wxMessage}`;
            }
            return `IP 地址不在公众号白名单中${codeText}。\n当前直接从 Obsidian 访问微信 API，请把这台电脑当前网络的公网出口 IP 添加到公众号后台「IP 白名单」。${wxMessage}`;
        case 40125:
            return `AppSecret 错误${codeText}。请检查插件设置里的 AppSecret，必要时在公众号后台重置。${wxMessage}`;
        case 40013:
            return `AppID 无效${codeText}。请检查插件设置里的公众号 AppID。${wxMessage}`;
        case 50002:
            return `公众号账号受限${codeText}。可能是公众号被冻结或注销，请联系微信客服处理。${wxMessage}`;
        default:
            return message
                ? `获取 token 失败${codeText}：${message}`
                : `获取 token 失败：微信接口未返回 access_token。${wxMessage}`;
    }
}

// 获取token
export async function wxGetToken(authkey:string, appid:string, secret:string, tokenProxyUrl:string = '', sshProxyCommand:string = '', sshProxyCloseCommand:string = '') {
    const useSshProxy = hasSshProxy(sshProxyCommand);
    const proxyUrl = useSshProxy ? DEFAULT_SSH_TOKEN_PROXY_LOCAL_URL : tokenProxyUrl;
    if (useSshProxy) {
        await execShell(sshProxyCommand);
    }
    if (proxyUrl) {
        try {
            const res = await requestUrl({
                url: proxyUrl,
                method: 'POST',
                throw: false,
                contentType: 'application/json',
                body: JSON.stringify({ appid, secret })
            });
            return res;
        } finally {
            if (useSshProxy && sshProxyCloseCommand.trim()) {
                await execShell(sshProxyCloseCommand).catch(() => undefined);
            }
        }
    }
    // 如果authkey为空，直接调用微信API获取token
    if (!authkey) {
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
        const res = await requestUrl({
            url,
            method: 'GET',
            throw: false
        });
        return res;
    }
    // 否则使用插件主机的API
    const url = PluginHost + '/v1/wx/token';
    const body = {
        authkey,
        appid,
        secret
    }
    const res = await requestUrl({
        url,
        method: 'POST',
        throw: false,
        contentType: 'application/json',
        body: JSON.stringify(body)
    });
    return res;
}

export async function wxEncrypt(authkey:string, wechat:any[]) {
    const url = PluginHost + '/v1/wx/encrypt';
    const body =  JSON.stringify({
        authkey,
        wechat
    });
    const res = await requestUrl({
        url: url,
        method: 'POST',
        throw: false,
        contentType: 'application/json',
        body: body
    });
    return res
}

export async function wxKeyInfo(authkey:string) {
    const url = PluginHost + '/v1/wx/info/' + authkey;
    const res = await requestUrl({
        url: url,
        method: 'GET',
        throw: false,
        contentType: 'application/json',
    });
    return res
}

export async function wxWidget(authkey: string, params: string) {
    const host = 'https://obplugin.sunboshi.tech';
    const path = '/math/widget';
    const url = `${host}${path}`;
    try {
        const res = await requestUrl({
            url,
            throw: false,
            method: 'POST',
            contentType: 'application/json',
            headers: {
                authkey
            },
            body: params
        })
        if (res.status === 200) {
            return res.json.content;
        }
        return res.json.msg;
    } catch (error) {
        console.log(error);
        return error.message;
    }
}

// 上传图片
export async function wxUploadImage(data: Blob, filename: string, token: string, type?: string) {
    let url = '';
    if (type == null || type === '') {
        url = 'https://api.weixin.qq.com/cgi-bin/media/uploadimg?access_token=' + token;
    } else {
        url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=${type}`
    }

    const N = 16 // The length of our random boundry string
    const randomBoundryString = "djmangoBoundry" + Array(N+1).join((Math.random().toString(36)+'00000000000000000').slice(2, 18)).slice(0, N) 
    
    // Construct the form data payload as a string
    const pre_string = `------${randomBoundryString}\r\nContent-Disposition: form-data; name="media"; filename="${filename}"\r\nContent-Type: "application/octet-stream"\r\n\r\n`;
    const post_string = `\r\n------${randomBoundryString}--`
    
    // Convert the form data payload to a blob by concatenating the pre_string, the file data, and the post_string, and then return the blob as an array buffer
    const pre_string_encoded = new TextEncoder().encode(pre_string);
    // const data = file;
    const post_string_encoded = new TextEncoder().encode(post_string);
    const concatenated = await new Blob([pre_string_encoded, await getBlobArrayBuffer(data), post_string_encoded]).arrayBuffer()

    // Now that we have the form data payload as an array buffer, we can pass it to requestURL
    // We also need to set the content type to multipart/form-data and pass in the boundry string
    const options: RequestUrlParam = {
        method: 'POST',
        url: url,
        contentType: `multipart/form-data; boundary=----${randomBoundryString}`,
        body: concatenated
    };

    const res = await requestUrl(options);
    const resData = await res.json;
    return {
        url: resData.url || '',
        media_id: resData.media_id || '',
        errcode: resData.errcode || 0,
        errmsg: resData.errmsg || '',
    }
}

// 新建草稿
export interface DraftArticle {
    title: string;
    author?: string;
    digest?: string;
    cover?: string;
    content: string;
    content_source_url?: string;
    thumb_media_id: string;
    need_open_comment?: number;
    only_fans_can_comment?: number;
    pic_crop_235_1?: string;
    pic_crop_1_1?: string;
    appid?: string;
    theme?: string;
    highlight?: string;
}

export async function wxAddDraft(token: string, data: DraftArticle) {
    const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
    const body = {articles:[{
        title: data.title,
        content: data.content,
        digest: data.digest,
        thumb_media_id: data.thumb_media_id,
        ... data.pic_crop_235_1 && {pic_crop_235_1: data.pic_crop_235_1},
        ... data.pic_crop_1_1 && {pic_crop_1_1: data.pic_crop_1_1},
        ... data.content_source_url && {content_source_url: data.content_source_url},
        ... data.need_open_comment !== undefined && {need_open_comment: data.need_open_comment},
        ... data.only_fans_can_comment !== undefined && {only_fans_can_comment: data.only_fans_can_comment},
        ... data.author && {author: data.author},
    }]};

    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });

    return res;
}

export interface DraftImageMediaId {
    image_media_id: string;
}

export interface DraftImageInfo {
    image_list: DraftImageMediaId[];
}

export interface DraftImages {
    article_type: string;
    title: string;
    content: string;
    need_open_commnet: number;
    only_fans_can_comment: number;
    image_info: DraftImageInfo;
}

export async function wxAddDraftImages(token: string, data: DraftImages) {
    const url = 'https://api.weixin.qq.com/cgi-bin/draft/add?access_token=' + token;
    const body = {articles:[data]};

    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });

    return res;
}

export async function wxBatchGetMaterial(token: string, type: string, offset: number = 0, count: number = 10) {
    const url = 'https://api.weixin.qq.com/cgi-bin/material/batchget_material?access_token=' + token;
    const body = {
        type,
        offset,
        count
    };

    const res = await requestUrl({
        method: 'POST',
        url: url,
        throw: false,
        body: JSON.stringify(body)
    });

    return await res.json;
}
