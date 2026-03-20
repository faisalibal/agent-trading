import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const cwd = process.cwd();
    const parentDir = path.join(cwd, "..");
    const logsDir = path.join(parentDir, "logs");
    
    // Check various paths
    const checks = {
      cwd: cwd,
      parentDir: parentDir,
      logsDir: logsDir,
      logsDirExists: fs.existsSync(logsDir),
      cwdContents: fs.existsSync(cwd) ? fs.readdirSync(cwd).slice(0, 10) : [],
      parentContents: fs.existsSync(parentDir) ? fs.readdirSync(parentDir).slice(0, 20) : [],
      logsContents: fs.existsSync(logsDir) ? fs.readdirSync(logsDir).slice(0, 20) : [],
      envLoaded: {
        BINANCE_API_KEY: !!process.env.BINANCE_API_KEY,
        TRADING_SYMBOL: process.env.TRADING_SYMBOL,
      }
    };

    return NextResponse.json(checks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
