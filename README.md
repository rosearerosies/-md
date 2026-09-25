# 网页与视频转 Markdown

Chrome Manifest V3 插件。它提取当前网页的可见文章内容，或视频页面的标题、简介、章节和页面已提供的字幕，并下载为 Markdown。

## 安装

发布到扩展商店后，可以通过下面的入口直接安装：

- [安装到 Chrome](https://chromewebstore.google.com/)
- [安装到 Edge](https://microsoftedge.microsoft.com/addons/)

当前项目尚未发布到 Chrome Web Store 或 Microsoft Edge Add-ons。完成商店审核后，需要将上面两个链接替换为实际的扩展详情页地址。

在商店发布前，可以从 GitHub 下载源码并手动安装：

1. 下载仓库 ZIP 并解压。
2. 打开 `chrome://extensions` 或 `edge://extensions`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择解压后的项目目录。

GitHub 本身不能直接安装未上架的浏览器扩展，也不能通过普通网页链接绕过浏览器安全限制完成安装。

### 发布商店后替换链接

审核通过后，将上面的链接替换为实际详情页地址：

- Chrome：`https://chromewebstore.google.com/detail/扩展名称/扩展ID`
- Edge：`https://microsoftedge.microsoft.com/addons/detail/扩展名称/扩展ID`

用户点击详情页中的“添加至 Chrome”或“获取”按钮即可安装。

## 使用

打开文章或视频页面，点击扩展图标，按需勾选“生成 AI 摘要”，再点击“下载 Markdown”或“一图速览”。“后台管理设置”支持添加多组 OpenAI 兼容 API；填写地址和 Key 后点击“获取模型”，模型会显示在原生下拉框中。点击“测试”可验证当前 API 和模型。没有可访问字幕时，不会下载或转写音视频。

## 本地与开源

网页提取、Markdown 生成、一图速览和文件下载均在浏览器本地运行。AI 功能默认关闭；只有用户主动选择 API 并生成摘要时，正文或字幕才会发送到该 API。项目使用 MIT License 开源，见 `LICENSE`。

选择“本地指定文件夹”后，Chrome 会显示系统文件夹选择器。选定目录后，导出的 Markdown 和 SVG 会直接写入该目录；目录授权失效时会提示重新选择。也可以切换到默认下载目录、每次询问或默认下载目录下的子目录。

## 开发检查

```bash
npm test
```
