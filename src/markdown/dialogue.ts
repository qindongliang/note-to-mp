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
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Tokens, MarkedExtension } from "marked";
import { Extension } from "./extension";
import { App } from "obsidian";
import { NMPSettings } from "src/settings";
import AssetsManager from "../assets";
import { MDRendererCallback } from "./extension";

export interface DialogueToken {
    type: 'dialogue';
    raw: string;
    title?: string;
    messages: Array<{
        speaker: string;
        content: string;
    }>;
}

/**
 * 解析对话内容
 */
function parseDialogue(content: string): Array<{ speaker: string; content: string }> {
    const messages: Array<{ speaker: string; content: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // 匹配对话格式：角色名: 内容 或 角色名：内容
        // 支持中英文冒号
        const match = trimmed.match(/^([^:：]+)\s*[:：]\s*(.+)$/);
        if (match) {
            const speaker = match[1].trim();
            const content = match[2].trim();
            messages.push({ speaker, content });
        }
    }

    return messages;
}

/**
 * 渲染对话
 */
function renderDialogue(token: DialogueToken): string {
    if (!token.messages || token.messages.length === 0) {
        return '';
    }

    // 生成对话HTML
    const messageHtml = token.messages.map((msg, index) => {
        // 判断是左侧还是右侧（交替显示）
        const isLeft = index % 2 === 0;

        if (isLeft) {
            // 左侧消息（白色气泡）
            return `
                <section style="display: flex; justify-content: flex-start; align-items: flex-start; margin: 12px 0; box-sizing: border-box;">
                    <section style="flex: 0 0 auto; margin-right: 10px; box-sizing: border-box;">
                        <section style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold; box-sizing: border-box;">
                            ${msg.speaker.charAt(0).toUpperCase()}
                        </section>
                    </section>
                    <section style="flex: 0 1 auto; max-width: 70%; box-sizing: border-box;">
                        <section style="font-size: 12px; color: rgba(100, 100, 100, 0.7); margin: 0 0 4px 8px; font-family: 'PingFang SC', -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif; box-sizing: border-box;">
                            ${msg.speaker}
                        </section>
                        <section style="padding: 10px 14px; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); position: relative; word-wrap: break-word; box-sizing: border-box;">
                            <span style="font-size: 15px; color: #333; line-height: 1.6; font-family: 'PingFang SC', -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif;">${msg.content}</span>
                            <section style="position: absolute; left: -6px; top: 12px; width: 0; height: 0; border-right: 8px solid #ffffff; border-top: 6px solid transparent; border-bottom: 6px solid transparent; box-sizing: border-box;"></section>
                        </section>
                    </section>
                </section>
            `;
        } else {
            // 右侧消息（绿色气泡）
            return `
                <section style="display: flex; justify-content: flex-end; align-items: flex-start; margin: 12px 0; box-sizing: border-box;">
                    <section style="flex: 0 1 auto; max-width: 70%; box-sizing: border-box;">
                        <section style="font-size: 12px; color: rgba(100, 100, 100, 0.7); margin: 0 8px 4px 0; text-align: right; font-family: 'PingFang SC', -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif; box-sizing: border-box;">
                            ${msg.speaker}
                        </section>
                        <section style="padding: 10px 14px; background: linear-gradient(135deg, #07C160 0%, #06AE56 100%); border-radius: 8px; box-shadow: 0 2px 8px rgba(7, 193, 96, 0.2); position: relative; word-wrap: break-word; box-sizing: border-box; margin-left: auto;">
                            <span style="font-size: 15px; color: #fff; line-height: 1.6; font-family: 'PingFang SC', -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif;">${msg.content}</span>
                            <section style="position: absolute; right: -6px; top: 12px; width: 0; height: 0; border-left: 8px solid #07C160; border-top: 6px solid transparent; border-bottom: 6px solid transparent; box-sizing: border-box;"></section>
                        </section>
                    </section>
                    <section style="flex: 0 0 auto; margin-left: 10px; box-sizing: border-box;">
                        <section style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold; box-sizing: border-box;">
                            ${msg.speaker.charAt(0).toUpperCase()}
                        </section>
                    </section>
                </section>
            `;
        }
    }).join('');

    // 生成完整的对话容器
    return `
        <section style="margin: 1.5em 8px 2em; padding: 20px; background: linear-gradient(135deg, rgba(246, 246, 246, 0.5) 0%, rgba(255, 255, 255, 0.95) 100%); border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 12px; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.06); position: relative; overflow: hidden; box-sizing: border-box;">
            ${token.title ? `
                <section style="text-align: center; margin: 0 0 20px 0; padding: 12px; background: linear-gradient(135deg, rgba(7, 193, 96, 0.08), rgba(7, 193, 96, 0.12)); border-radius: 10px; border: 1px solid rgba(7, 193, 96, 0.2); box-sizing: border-box;">
                    <p style="margin: 0; font-size: 16px; color: #07C160; font-weight: 600; font-family: 'PingFang SC', -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif; box-sizing: border-box;">
                        ${token.title}
                    </p>
                </section>
            ` : ''}
            <section style="padding: 10px 0; box-sizing: border-box;">
                ${messageHtml}
            </section>
        </section>
    `;
}

export class DialogueRenderer extends Extension {
    constructor(
        app: App,
        settings: NMPSettings,
        assetsManager: AssetsManager,
        callback: MDRendererCallback
    ) {
        super(app, settings, assetsManager, callback);
    }

    markedExtension(): MarkedExtension {
        return {
            extensions: [{
                name: 'dialogue',
                level: 'block',
                start(src: string) {
                    return src.match(/^:::\s*dialogue/m) ? src.match(/^:::\s*dialogue/m)?.index ?? -1 : -1;
                },
                tokenizer(src: string) {
                    const rule = /^:::\s*dialogue(?:\s*\[([^\]]+)\])?\n([\s\S]*?)\n:::/;
                    const match = src.match(rule);

                    if (match) {
                        const token: DialogueToken = {
                            type: 'dialogue',
                            raw: match[0],
                            title: match[1] || '',
                            messages: []
                        };

                        // 解析内部内容中的对话
                        const content = match[2];
                        token.messages = parseDialogue(content);

                        return token;
                    }
                    return undefined;
                },
                renderer(token: DialogueToken) {
                    return renderDialogue(token);
                }
            }]
        };
    }
}
