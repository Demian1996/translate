#!/usr/bin/env node
const commander = require("commander");
const file = require("./file");
const path = require("path");
const R = require("ramda");
const request = require("request");
const getTk = require("./tk");

// joinPath :: string -> string
const joinPath = filename => path.join(process.cwd(), filename);
// tip :: a -> a
const tip = R.tap(console.log);
// 打印并返回管道值
const lazyTip = str => v => console.log(str) || v;
const checkFile = R.cond([
  [R.isNil, R.pipe(lazyTip("文件不存在"), R.always({}))],
  [R.isEmpty, lazyTip("空文件")],
  [R.T, R.identity]
]);
// 获取文件信息，若为空则打印信息
const getFileObj = R.pipe(R.prop("file"), checkFile);
// parseJson :: string -> {a}
const parseJson = str => JSON.parse(str);
// 递归展平json字符串数组，取出google翻译值
// getTranslation :: string -> string
const getTranslation = function(arr) {
  return R.ifElse(
    R.is(String),
    R.pipe(parseJson, getTranslation),
    R.ifElse(R.any(Array.isArray), R.pipe(R.head, getTranslation), R.head)
  )(arr);
};

// getLanguageArray :: () -> [string]
const getLanguageArray = R.pipe(
  R.always(commander),
  R.prop("languages"),
  R.defaultTo("EN"),
  R.split("/")
);
// fetchTranslateApi :: [string] -> [{k: Promise string}]
const fetchTranslateApi = R.map(language => {
  // requestApi :: string -> string -> Promise string
  const requestApi = R.curry(
    (language, content) =>
      new Promise((resolve, reject) => {
        content && console.log(`正在获取‘${content}’的‘${language}’翻译值`);
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
      })
  );
  return R.map(requestApi(language), getFileObj(commander));
});

// getTranslation :: [{k: Promise {*}}] -> [{k: Promise string}]
const mapTranslation = R.map(R.map(async data => getTranslation(await data)));

const generateFile = R.mapObjIndexed((json, index) => {
  const keys = R.keys(json);
  const values = R.values(json);
  const currentLanguage = getLanguageArray()[index];
  const filePath = path.join(process.cwd(), `${currentLanguage}.json`);
  Promise.all(values).then(
    R.unless(
      R.isEmpty,
      R.pipe(R.zipObj(keys), R.curry(file.writeFile)(filePath))
    )
  );
});

/* ------------------------------------命名行---------------------------------- */
commander.version("1.0.0", "-v, --version");

commander.option(
  "-f --file <filename>",
  "translate file",
  R.pipe(
    joinPath,
    R.ifElse(
      file.isExist,
      R.pipe(file.readFile, R.ifElse(R.isEmpty, R.always({}), parseJson)), // 文件存在则读取文件返回json对象
      R.pipe(R.always('')) // 文件不存在则返回null，用于后续检查
    )
  )
);

commander.option("-l --languages [languages]", "languages", "en");

commander.parse(process.argv);
/* ------------------------------------end---------------------------------- */
/* ------------------------------------处理文件信息---------------------------------- */
//  :: [string] ->
const generateDictionary = R.pipe(
  getLanguageArray,
  fetchTranslateApi,
  mapTranslation,
  generateFile
);
generateDictionary();
/* ------------------------------------end---------------------------------- */
