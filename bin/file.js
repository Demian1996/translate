const fs = require("fs");

module.exports = {
  /**
   * 判断配置文件是否存在
   */
  isExist(filePath) {
    try {
      const stat = fs.statSync(filePath);
      if (stat && stat.isFile()) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  },
  /**
   * 读取配置
   */
  readFile(filePath) {
    return fs.readFileSync(filePath, {
      encoding: "utf-8"
    });
  },
  writeFile(path, value) {
    const content = JSON.stringify(value);
    return fs.writeFileSync(path, content);
  }
};
