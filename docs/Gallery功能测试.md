# Gallery 功能测试用例

## 测试 1：基本画廊

```markdown
:::gallery[滑动浏览美景图片]
![山景图片](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600)
![海景图片](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600)
![城市图片](https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600)
:::
```

## 测试 2：无标题画廊

```markdown
:::gallery
![](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600)
![](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600)
![](https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600)
:::
```

## 测试 3：多张图片画廊

```markdown
:::gallery[风景摄影作品集]
![图片1](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600)
![图片2](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600)
![图片3](https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600)
![图片4](https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600)
![图片5](https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600)
:::
```

## 测试 4：带尺寸参数的图片

```markdown
:::gallery[缩略图展示]
![图片1](https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600|300)
![图片2](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600|300)
![图片3](https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600|300)
:::
```

## 功能说明

### 语法格式

```
:::gallery[可选标题]
![图片描述](图片URL|可选尺寸)
![图片描述](图片URL|可选尺寸)
![图片描述](图片URL|可选尺寸)
:::
```

### 支持功能

1. ✅ **横向滚动**：图片可左右滑动查看
2. ✅ **标题支持**：可选的画廊标题
3. ✅ **图片尺寸**：支持 `|宽x高` 或 `|宽度` 格式
4. ✅ **响应式**：适配不同屏幕尺寸
5. ✅ **动画效果**：平滑滚动体验
6. ✅ **视觉优化**：圆角、阴影、渐变背景

### 视觉效果

- **布局**：三列等宽布局（每张图片占33.33%宽度）
- **高度**：统一200px高度，object-fit: cover裁剪
- **圆角**：8px圆角边框
- **阴影**：subtle shadow效果
- **滚动**：平滑滚动，scroll-snap-type对齐
- **背景**：淡橙色渐变，与极客杰尼主题匹配

### 使用场景

- 产品展示
- 摄影作品集
- 旅行攻略配图
- 教程步骤截图
- 任何需要多图展示的场景

### 兼容性

- ✅ 微信公众号编辑器
- ✅ NoteToMP 预览
- ✅ 导出HTML
- ✅ 所有主流浏览器
