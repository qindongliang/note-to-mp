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
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Tokens, MarkedExtension } from "marked";
import { Extension } from "./extension";
import { App } from "obsidian";
import { NMPSettings } from "src/settings";
import AssetsManager from "../assets";
import { MDRendererCallback } from "./extension";

export interface LongImageToken {
    type: 'longimage';
    raw: string;
    title: string;
    rawContent?: string;
    image?: {
        alt: string;
        src: string;
    };
}

/**
 * 解析长图内容
 */
function parseLongImage(content: string, assetsManager?: AssetsManager): { alt: string; src: string } {
    let alt = '';
    let src = '';

    // 首先尝试匹配标准 Markdown 图片语法：![alt](url)
    const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
    const markdownMatch = content.trim().match(markdownRegex);

    if (markdownMatch) {
        alt = markdownMatch[1] || '';
        src = markdownMatch[2].trim();

        // 处理图片尺寸参数
        const sizeMatch = src.match(/^(.+?)(?:\|(\d+(?:x\d+)?|\d+%))?$/);
        if (sizeMatch) {
            src = sizeMatch[1];
        }

        return { alt, src };
    }

    // 然后尝试匹配 Obsidian 嵌入语法：[[wikilink]]
    const obsidianRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/;
    const obsidianMatch = content.trim().match(obsidianRegex);

    if (obsidianMatch) {
        alt = obsidianMatch[2] || obsidianMatch[1] || '';
        let rawSrc = obsidianMatch[1].trim();

        // 处理图片尺寸参数
        const sizeMatch = rawSrc.match(/^(.+?)(?:\|(\d+(?:x\d+)?|\d+%))?$/);
        if (sizeMatch) {
            rawSrc = sizeMatch[1];
        }

        // 如果有 assetsManager，尝试解析路径
        if (assetsManager && !rawSrc.match(/^https?:\/\//)) {
            const resourcePath = assetsManager.getResourcePath(rawSrc);
            if (resourcePath && resourcePath.resUrl) {
                src = resourcePath.resUrl;
            } else {
                src = rawSrc;
            }
        } else {
            src = rawSrc;
        }

        return { alt, src };
    }

    return { alt: '', src: '' };
}

/**
 * 渲染长图
 */
function renderLongImage(token: LongImageToken, renderer: any): string {
    // 使用临时标记，然后在 postprocess 中替换
    if (token.rawContent) {
        // 生成长图容器，并在其中插入临时标记
        return `
            <section style="margin: 1.5em 8px 2em; padding: 16px; background: linear-gradient(135deg, rgba(200, 100, 66, 0.02), rgba(250, 249, 245, 0.95)); border: 1px solid rgba(200, 100, 66, 0.15); border-radius: 12px; box-shadow: 0 3px 12px rgba(200, 100, 66, 0.08); position: relative; overflow: hidden;">
                <section style="margin: 0; padding: 0; box-sizing: border-box;">
                    <section style="display: block; width: 100%; vertical-align: top; overflow-x: hidden; overflow-y: auto; max-height: 80vh; padding: 0; box-sizing: border-box; scroll-behavior: smooth;">
                        <section style="text-align: center; margin: 0; padding: 0; box-sizing: border-box;">
                            <!—longimage-content-start—>${token.rawContent}<!—longimage-content-end—>
                        </section>
                    </section>
                </section>
                ${token.title ? `
                    <section style="text-align: center; font-size: 12px; color: rgba(200, 100, 66, 0.9); margin: 12px 0 0; padding: 10px 16px; background: linear-gradient(135deg, rgba(200, 100, 66, 0.06), rgba(200, 100, 66, 0.12)); border: 1px solid rgba(200, 100, 66, 0.25); border-radius: 12px; font-family: 'PingFang SC', -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif; font-weight: 500; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(200, 100, 66, 0.1); backdrop-filter: blur(6px);">
                        <p style="margin: 0; text-align: center; box-sizing: border-box;">
                            <span style="font-size: 12px; color: inherit;">${token.title}</span>
                        </p>
                    </section>
                ` : ''}
            </section>
        `;
    }

    // 如果没有 rawContent，使用旧方法（向后兼容）
    if (!token.image || !token.image.src) {
        return '';
    }

    let imageSrc = token.image.src;
    let imageAlt = token.image.alt;

    // 如果是本地图片，尝试解析路径
    if (renderer && renderer.assetsManager && !imageSrc.match(/^https?:\/\//)) {
        const resourcePath = renderer.assetsManager.getResourcePath(imageSrc);
        if (resourcePath && resourcePath.resUrl) {
            imageSrc = resourcePath.resUrl;
        }
    }

    // 直接使用默认 img 标签
    const imageHtml = `<img src="${imageSrc}" alt="${imageAlt}">`;

    // 包装图片到容器中并添加样式
    const styledImageHtml = imageHtml.replace(
        /<img([^>]+)>/,
        `<img$1 style="width: 100%; height: auto; object-fit: contain; display: block; margin: 0 auto; border-radius: 8px;">`
    );

    // 生成长图容器
    return `
        <section style="margin: 1.5em 8px 2em; padding: 16px; background: linear-gradient(135deg, rgba(200, 100, 66, 0.02), rgba(250, 249, 245, 0.95)); border: 1px solid rgba(200, 100, 66, 0.15); border-radius: 12px; box-shadow: 0 3px 12px rgba(200, 100, 66, 0.08); position: relative; overflow: hidden;">
            <section style="margin: 0; padding: 0; box-sizing: border-box;">
                <section style="display: block; width: 100%; vertical-align: top; overflow-x: hidden; overflow-y: auto; max-height: 80vh; padding: 0; box-sizing: border-box; scroll-behavior: smooth;">
                    <section style="text-align: center; margin: 0; padding: 0; box-sizing: border-box;">
                        ${styledImageHtml}
                    </section>
                </section>
            </section>
            ${token.title ? `
                <section style="text-align: center; font-size: 12px; color: rgba(200, 100, 66, 0.9); margin: 12px 0 0; padding: 10px 16px; background: linear-gradient(135deg, rgba(200, 100, 66, 0.06), rgba(200, 100, 66, 0.12)); border: 1px solid rgba(200, 100, 66, 0.25); border-radius: 12px; font-family: 'PingFang SC', -apple-system-font, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif; font-weight: 500; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(200, 100, 66, 0.1); backdrop-filter: blur(6px);">
                    <p style="margin: 0; text-align: center; box-sizing: border-box;">
                        <span style="font-size: 12px; color: inherit;">${token.title}</span>
                    </p>
                </section>
            ` : ''}
        </section>
    `;
}

export class LongImageRenderer extends Extension {
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
                name: 'longimage',
                level: 'block',
                start(src: string) {
                    return src.match(/^:::\s*longimage/m) ? src.match(/^:::\s*longimage/m)?.index ?? -1 : -1;
                },
                tokenizer(src: string) {
                    const rule = /^:::\s*longimage(?:\s*\[([^\]]+)\])?\n([\s\S]*?)\n:::/;
                    const match = src.match(rule);

                    if (match) {
                        const token: LongImageToken = {
                            type: 'longimage',
                            raw: match[0],
                            title: match[1] || '',
                            image: { alt: '', src: '' }
                        };

                        // 保存原始内容，后续在渲染阶段处理
                        token.rawContent = match[2];

                        return token;
                    }
                    return undefined;
                },
                renderer(token: LongImageToken) {
                    return renderLongImage(token, this);
                }
            }]
        };
    }

    async postprocess(html: string): Promise<string> {
        // 替换临时标记为实际内容
        const matches = html.match(/<!—longimage-content-start—>([\s\S]*?)<!—longimage-content-end—>/g);
        if (!matches) return html;

        let result = html;
        for (const match of matches) {
            const contentMatch = match.match(/<!—longimage-content-start—>([\s\S]*?)<!—longimage-content-end—>/);
            if (!contentMatch) continue;

            const content = contentMatch[1];
            try {
                // 解析内容
                const parsed = await this.marked.parse(content);
                // 提取第一个 img 标签
                const imgMatch = parsed.match(/<img[^>]+>/);
                if (imgMatch) {
                    const imgTag = imgMatch[0];
                    // 包装样式
                    const styledImg = imgTag.replace(
                        /<img([^>]+)>/,
                        `<img$1 style="width: 100%; height: auto; object-fit: contain; display: block; margin: 0 auto; border-radius: 8px;">`
                    );
                    result = result.replace(match, styledImg);
                }
            } catch (error) {
                console.error('Error processing longimage content:', error);
            }
        }

        return result;
    }
}
