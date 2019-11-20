# 介绍

命令行工具
给定指定中文 json 字典，生成翻译后的多语言文件。

## 安装

```shell
npm install
npm link
```

## 支持命令

- -f --file （指定中文字典）

```shell
-f zh-CN.json
```

- -l --languages （指定翻译）

```shell
-l en/ja
```

## 样例

```shell
translate -f zh-CN.json -l en/ja
```

该命令会在当前命令运行目录中生成对应的英文和日文字典
