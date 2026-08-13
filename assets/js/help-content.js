// help-content.js — 「使用说明」内容（Markdown 字符串）
// 暴露 window.RPHubHelpContent，供主应用渲染。
// 注意：内容为初稿，可随时在此审改；如内容中出现反引号需转义为 \`。
(function () {
    'use strict';
    window.RPHubHelpContent = `
# 使用说明

## API key 说明

默认API key 为公用免费API，可能存在不稳定现象，请在「设置」中配置自己的 API key。当前免费文本生成模型API提供商有[opencode zen](https://opencode.ai/auth)、[sensenova](https://platform.sensenova.cn/console/keys)、[agnes](https://platform.agnes-ai.com/settings/apiKeys)。

### API key 配置方法

在模型提供商官网申请 API key 并在「设置」中选择对应API提供商，填写API key，点击刷新可用模型列表，选择预设模型（3个预设模型主要用于在聊天界面快捷切换，可填写相同值）；生图模型已填写好了模型名称，只需填写对应模型提供商的API key即可

### 文本生成模型推荐 

推荐使用 **opencode zen** 的 **mimo-v2.5-free** 模型，免费、速度快，文风优于deepseekv4 flash  
若想使用更强大的模型如grok、gpt等，可开通使用[opencode go](https://opencode.ai/go?ref=NXYGD8GHGM)。

### 图片生成模型推荐
推荐使用[sensenova](https://platform.sensenova.cn/console/keys)提供商，有大量免费使用额度


## 快速开始

打开左侧「角色卡管理」，点击你想使用的角色卡，即可开始与角色对话


## 核心功能一览

- **模型破限**：自动破除模型生成内容限制，支持NSFW内容生成，让ai生成任何你想要的内容
- **图片生成**：聊天过程中，自动在合适的时机生成符合上下文内容的图片，提升沉浸感，可在聊天界面左下角开启和关闭
- **角色卡**：AI需要扮演的角色，包含角色设定、世界观等信息
- **上下文压缩**：当达到上下文限制时，自动压缩对话历史，防止超出AI模型上下文限制
- **对话历史**：浏览、导入、导出、清理对话历史
- **角色卡生成**：内置角色卡工坊，使用AI辅助生成自定义角色卡，让ai扮演任何你想要的角色

## 常见问题

**Q：我的数据存在哪里？会丢失吗？**
数据保存在本地存储中，不会上传到服务器。清理数据前，请先在「角色卡管理」中导出重要角色卡和在「记忆系统」中导出重要会话。

**Q：角色卡如何获取？**
推荐从[这里](https://rphforum.zeabur.app/)下载，也可以在「角色卡工坊」中使用AI辅助生成自定义角色卡。也可使用sillytavern的角色卡，本项目的角色卡与sillytavern的角色卡兼容。

`;
})();
