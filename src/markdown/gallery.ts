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

export interface GalleryToken {
    type: 'gallery';
    raw: string;
    title: string;
    rawContent?: string;
    images?: Array<{
        alt: string;
        src: string;
    }>;
}

/**
 * 解析图片内容
 */
function parseImages(content: string): Array<{ alt: string; src: string }> {
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: Array<{ alt: string; src: string }> = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
        let alt = match[1] || '';
        let src = match[2].trim();

        // 处理图片尺寸参数（例如：image.jpg|200x150）
        const sizeMatch = src.match(/^(.+?)(?:\|(\d+(?:x\d+)?|\d+%))?$/);
        if (sizeMatch) {
            src = sizeMatch[1];
        }

        images.push({ alt, src });
    }

    return images;
}

/**
 * 渲染图片画廊
 */
function renderGallery(token: GalleryToken, renderer: any): string {
    // 使用临时标记，然后在 postprocess 中替换
    if (token.rawContent) {
        // 生成画廊容器，并在其中插入临时标记
        return `
            <section style="margin: 1.5em 8px 2em; padding: 16px; background: linear-gradient(135deg, rgba(200, 100, 66, 0.02), rgba(250, 249, 245, 0.95)); border: 1px solid rgba(200, 100, 66, 0.15); border-radius: 12px; box-shadow: 0 3px 12px rgba(200, 100, 66, 0.08); position: relative; overflow: hidden;">
                <section style="margin: 0; padding: 0; box-sizing: border-box;">
                    <section style="display: inline-block; width: 100%; vertical-align: top; overflow-x: auto; scroll-snap-type: x mandatory; overflow-y: hidden; padding-right: 3px; padding-left: 3px; box-sizing: border-box;">
                        <section style="width: 100%; min-width: 100%; box-sizing: border-box; display: flex; justify-content: center; align-items: center;">
                            <!—gallery-content-start—>${token.rawContent}<!—gallery-content-end—>
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
    if (!token.images || token.images.length === 0) {
        return '';
    }

    // 生成图片HTML，解析本地图片路径
    const imageHtml = token.images.map((img, index) => {
        let imageSrc = img.src;
        let imageAlt = img.alt;

        // 如果是本地图片，尝试解析路径
        if (renderer && renderer.assetsManager && !imageSrc.match(/^https?:\/\//)) {
            const resourcePath = renderer.assetsManager.getResourcePath(imageSrc);
            if (resourcePath && resourcePath.resUrl) {
                imageSrc = resourcePath.resUrl;
            }
        }

        return `
            <div style="display: inline-block; width: 100%; vertical-align: middle; box-sizing: border-box; flex: 0 0 auto; min-width: 280px; max-width: 350px;">
                <section style="box-sizing: border-box;">
                    <section style="text-align: center; margin: 0 8px;">
                        <img src="${imageSrc}" alt="${imageAlt}" style="width: 100%; height: auto; max-height: 400px; object-fit: contain; border-radius: 8px; display: block; margin: 0 auto;">
                    </section>
                </section>
            </div>
        `;
    }).join('');

    // 生成完整的画廊容器
    return `
        <section style="margin: 1.5em 8px 2em; padding: 16px; background: linear-gradient(135deg, rgba(200, 100, 66, 0.02), rgba(250, 249, 245, 0.95)); border: 1px solid rgba(200, 100, 66, 0.15); border-radius: 12px; box-shadow: 0 3px 12px rgba(200, 100, 66, 0.08); position: relative; overflow: hidden;">
            <section style="margin: 0; padding: 0; box-sizing: border-box;">
                <section style="display: inline-block; width: 100%; vertical-align: top; overflow-x: auto; scroll-snap-type: x mandatory; overflow-y: hidden; padding-right: 3px; padding-left: 3px; box-sizing: border-box;">
                    <section style="width: auto; min-width: 100%; box-sizing: border-box; display: flex; justify-content: flex-start; align-items: center; gap: 8px; flex-wrap: nowrap; overflow-x: auto;">
                        ${imageHtml}
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

export class GalleryRenderer extends Extension {
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
                name: 'gallery',
                level: 'block',
                start(src: string) {
                    return src.match(/^:::\s*gallery/m) ? src.match(/^:::\s*gallery/m)?.index ?? -1 : -1;
                },
                tokenizer(src: string) {
                    const rule = /^:::\s*gallery(?:\s*\[([^\]]+)\])?\n([\s\S]*?)\n:::/;
                    const match = src.match(rule);

                    if (match) {
                        const token: GalleryToken = {
                            type: 'gallery',
                            raw: match[0],
                            title: match[1] || '',
                            rawContent: match[2]
                        };

                        return token;
                    }
                    return undefined;
                },
                renderer(token: GalleryToken) {
                    return renderGallery(token, this);
                }
            }]
        };
    }

    async postprocess(html: string): Promise<string> {
        // 替换临时标记为实际内容
        const matches = html.match(/<!—gallery-content-start—>([\s\S]*?)<!—gallery-content-end—>/g);
        if (!matches) return html;

        let result = html;
        for (const match of matches) {
            const contentMatch = match.match(/<!—gallery-content-start—>([\s\S]*?)<!—gallery-content-end—>/);
            if (!contentMatch) continue;

            const content = contentMatch[1];
            try {
                // 解析内容
                const parsed = await this.marked.parse(content);
                // 提取所有 img 标签
                const imgMatches = parsed.match(/<img[^>]+>/g);
                if (imgMatches && imgMatches.length > 0) {
                    // 生成图片HTML
                    const imageHtml = imgMatches.map((imgTag: string) => {
                        // 包装图片到容器中并添加样式
                        const styledImageHtml = imgTag.replace(
                            /<img([^>]+)>/,
                            `<img$1 style="width: 100%; height: auto; max-height: 400px; object-fit: contain; border-radius: 8px; display: block; margin: 0 auto;">`
                        );

                        return `
                            <div style="display: inline-block; width: 100%; vertical-align: middle; box-sizing: border-box; flex: 0 0 auto; min-width: 280px; max-width: 350px;">
                                <section style="box-sizing: border-box;">
                                    <section style="text-align: center; margin: 0 8px;">
                                        ${styledImageHtml}
                                    </section>
                                </section>
                            </div>
                        `;
                    }).join('');

                    const replacement = `
                        <section style="display: inline-block; width: 100%; vertical-align: top; overflow-x: auto; scroll-snap-type: x mandatory; overflow-y: hidden; padding-right: 3px; padding-left: 3px; box-sizing: border-box;">
                            <section style="width: auto; min-width: 100%; box-sizing: border-box; display: flex; justify-content: flex-start; align-items: center; gap: 8px; flex-wrap: nowrap; overflow-x: auto;">
                                ${imageHtml}
                            </section>
                        </section>
                    `;
                    result = result.replace(match, replacement);
                }
            } catch (error) {
                console.error('Error processing gallery content:', error);
            }
        }

        return result;
    }
}
