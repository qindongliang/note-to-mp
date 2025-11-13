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
import { Extension, MDRendererCallback } from "./extension";
import { App } from "obsidian";
import { NMPSettings } from "src/settings";
import AssetsManager from "src/assets";

export class SeqtitleRenderer extends Extension {
  private cache: Map<string, string>;

  constructor(app: App, settings: NMPSettings, assetsManager: AssetsManager, callback: MDRendererCallback) {
    super(app, settings, assetsManager, callback);
    this.cache = new Map<string, string>();
  }

  markedExtension(): MarkedExtension {
    return {
      extensions: [{
        name: 'seqtitle',
        level: 'block',
        start(src: string) {
          // 快速定位开始位置，借鉴Dialogue模式
          return src.indexOf(':::seqtitle');
        },
        tokenizer(src: string) {
          // 借鉴Callouts和Dialogue的分步解析模式，避免复杂正则
          const startMarker = ':::seqtitle';
          const endMarker = ':::';

          // 1. 检查开始标记
          if (!src.startsWith(startMarker)) {
            return;
          }

          // 2. 查找结束位置
          const contentStart = startMarker.length;
          const endIndex = src.indexOf(endMarker, contentStart);
          if (endIndex === -1) {
            return; // 未找到结束标记
          }

          // 3. 提取内容并分割
          const content = src.substring(contentStart, endIndex).trim();
          const dollarIndex = content.indexOf('$');
          if (dollarIndex === -1) {
            return; // 未找到分隔符
          }

          const seq = content.substring(0, dollarIndex).trim();
          const title = content.substring(dollarIndex + 1).trim();

          // 4. 验证非空
          if (!seq || !title) {
            return;
          }

          return {
            type: "seqtitle",
            raw: src.substring(0, endIndex + endMarker.length),
            seq: seq,
            title: title
          };
        },
        renderer: (token: Tokens.Generic) => {
          // 借鉴Math的缓存机制，避免重复渲染
          const cacheKey = `${token.seq}-${token.title}`;

          if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
          }

          const html = `<section class="seqtitle-container">
                    <div class="seqtitle-seq">${token.seq}</div>
                    <div class="seqtitle-title">${token.title}</div>
                  </section>`;

          this.cache.set(cacheKey, html);
          return html;
        }
      }]
    }
  }

  /**
   * 清理缓存，在需要时可以调用
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
