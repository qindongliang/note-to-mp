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

import { Tokens, MarkedExtension } from "marked";
import { Extension } from "./extension";

export class LinkRenderer extends Extension {
    allLinks:string[] = [];
    async prepare() {
       this.allLinks = [];
    }

    async postprocess(html: string) {
        if (this.settings.linkStyle !== 'footnote'
            || this.allLinks.length == 0) {
            return html;
        }
        
        const links = this.allLinks.map((href, i) => {
            return `<li>${href}&nbsp;↩</li>`;
        });
        return `${html}<seciton class="footnotes"><hr><ol>${links.join('')}</ol></section>`;
    }

    markedExtension(): MarkedExtension {
        return {
            extensions: [{
                name: 'link',
                level: 'inline',
                renderer: (token: Tokens.Link) => {
                    if (token.href.startsWith('mailto:')) {
                        return token.text;
                    }

                    // 检查是否是微信链接（直接显示）
                    if ((token.href.indexOf('https://mp.weixin.qq.com/mp') === 0)
                        || (token.href.indexOf('https://mp.weixin.qq.com/s') === 0)) {
                        return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}</a>`;
                    }

                    // 检查链接文本是否就是URL（如果是这样，直接显示为链接）
                    if (token.text === token.href) {
                        // 如果不是脚注模式，直接渲染为链接
                        if (this.settings.linkStyle !== 'footnote') {
                            return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}</a>`;
                        }
                        // 如果是脚注模式，添加到脚注列表
                        this.allLinks.push(token.href);
                        return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}<sup>[${this.allLinks.length}]</sup></a>`;
                    }

                    // 其他情况：根据设置决定渲染方式
                    if (this.settings.linkStyle === 'footnote') {
                        // 脚注模式：添加到脚注列表，返回带脚注的链接
                        this.allLinks.push(token.href);
                        const index = this.allLinks.length;
                        return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}<sup>[${index}]</sup></a>`;
                    } else {
                        // 普通模式：直接渲染为链接（不显示URL）
                        return `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.text}</a>`;
                    }
                }
            }]
        }
    }
}