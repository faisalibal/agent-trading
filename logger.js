const fs = require("fs");
const path = require("path");

class Logger {
  constructor(logDir = "./logs") {
    this.logDir = logDir;
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    this.currentDate = new Date().toISOString().split("T")[0];
    this.stream = fs.createWriteStream(
      path.join(logDir, `${this.currentDate}.log`),
      { flags: "a" },
    );
  }

  _rotate() {
    const newDate = new Date().toISOString().split("T")[0];
    if (newDate !== this.currentDate) {
      this.stream.end();
      this.currentDate = newDate;
      this.stream = fs.createWriteStream(
        path.join(this.logDir, `${this.currentDate}.log`),
        { flags: "a" },
      );
    }
  }

  log(level, message, data = null) {
    this._rotate();
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    };
    this.stream.write(JSON.stringify(entry) + "\n");
    console.log(`[${level}] ${message}`);
  }

  info(message, data) {
    this.log("INFO", message, data);
  }
  warn(message, data) {
    this.log("WARN", message, data);
  }
  error(message, data) {
    this.log("ERROR", message, data);
  }
}

module.exports = Logger;
