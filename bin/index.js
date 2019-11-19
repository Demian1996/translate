#!/usr/bin/env node
const commander = require("commander");
const file = require("./file");
const path = require("path");
const R = require("ramda");
const request = require("request");
const getTk = require("./tk");

const getFileObj = R.pipe(R.prop("file"), R.defaultTo({}));
// joinPath :: string -> string
const joinPath = filename => path.join(process.cwd(), filename);
// tip :: a -> a
const tip = R.tap(console.log);
const parseJson = str => JSON.parse(str);
const requestApi = (content = "", language = "EN") =>
  new Promise((resolve, reject) => {
    request(
      `http://translate.google.cn/translate_a/single?client=t&sl=zh-CN&tl=${language}&hl=EN&dt=t&ie=UTF-8&oe=UTF-8&tk=${getTk(
        content
      )}&q=${encodeURIComponent(content)}`,
      (err, res, body) => {
        if (err) {
          reject(err);
        }
        resolve(body);
      }
    );
  });

// 递归展平json字符串数组，取出google翻译值
// getTranslation :: string -> string
const getTranslation = function(arr) {
  return R.ifElse(
    R.is(String),
    R.pipe(parseJson, getTranslation),
    R.ifElse(R.any(Array.isArray), R.pipe(R.head, getTranslation), R.head)
  )(arr);
};

const getLanguageArray = R.pipe(
  R.always(commander),
  R.prop("languages"),
  R.defaultTo("EN"),
  R.split("/")
);
// fetchTranslateApi :: [string] -> [{k: Promise}]
const fetchTranslateApi = R.map(language =>
  R.map(
    async content => await requestApi(content, language),
    getFileObj(commander)
  )
);

// getTranslation :: [{k: Promise(any)}] -> [{k: Promise(string)}]
const mapTranslation = R.map(R.map(async data => getTranslation(await data)));

const generateFile = R.mapObjIndexed((json, index) => {
  const keys = R.keys(json);
  const values = R.values(json);
  const currentLanguage = getLanguageArray()[index];
  const filePath = path.join(process.cwd(), `${currentLanguage}.json`);
  Promise.all(values).then(
    R.ifElse(
      R.isEmpty,
      R.thunkify(tip)("没有获取文件信息"),
      R.pipe(R.zipObj(keys), R.curry(file.writeFile)(filePath))
    )
  );
});

commander.version("1.0.0", "-v, --version");

commander.option(
  "-f --file <filename>",
  "translate file",
  R.pipe(
    joinPath,
    R.ifElse(
      file.isExist,
      R.pipe(file.readFile, R.ifElse(R.isEmpty, R.always({}), parseJson)), // 文件存在则读取文件返回json对象
      R.pipe(R.always({})) // 文件不存在则返回空对象{}
    )
  )
);

commander.option("-l --languages [languages]", "languages", "en/ja");

commander.parse(process.argv);

//  :: [string] ->
const generateDictionary = R.pipe(
  tip,
  getLanguageArray,
  tip,
  fetchTranslateApi,
  mapTranslation,
  generateFile
);
generateDictionary();
