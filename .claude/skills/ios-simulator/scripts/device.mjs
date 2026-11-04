// Diagnostic CLI: no dependencies and no repository/session-specific defaults.
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

const artifacts = process.env.IOS_ARTIFACTS;
if (!artifacts) {
  throw new Error("Set IOS_ARTIFACTS to an external artifact directory");
}
mkdirSync(artifacts, { recursive: true });
const sessionFile = resolve(artifacts, "session.json");
const server = process.env.APPIUM_URL ?? "http://127.0.0.1:4723";

class AppiumError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

function request(method, path, body) {
  const url = new URL(`${server.replace(/\/$/, "")}${path}`);
  const data = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolveRequest, reject) => {
    const send = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = send(
      url,
      {
        method,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("error", reject);
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          try {
            const result = JSON.parse(text);
            if (res.statusCode >= 400 || result.value?.error) {
              reject(
                new AppiumError(
                  `${method} ${path}: ${text}`,
                  result.value?.error,
                ),
              );
            } else {
              resolveRequest(result.value);
            }
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    // Longer than WDA startup; avoids fetch's separate default headers timeout.
    req.setTimeout(900_000, () =>
      req.destroy(new Error("Appium request timed out")),
    );
    req.on("error", reject);
    req.end(data);
  });
}

async function deleteSession(sessionId) {
  try {
    return await request("DELETE", `/session/${sessionId}`);
  } catch (error) {
    // An expired session is already closed. Do not mistake transport/server
    // failures for expiry: keep its saved ID available for a later retry.
    if (error instanceof AppiumError && error.code === "invalid session id") {
      return null;
    }
    throw error;
  }
}

function write(path, data) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, data);
  return resolve(path);
}

const [action, ...args] = process.argv.slice(2);
let result;
if (action === "create") {
  const [udid, url] = args;
  if (!udid || !url) {
    throw new Error("create requires UDID and initial URL");
  }
  // Do not overwrite a potentially live session: close or inspect it first.
  if (existsSync(sessionFile)) {
    throw new Error(
      "session.json already exists; close its session or move aside a confirmed stale file",
    );
  }
  const session = await request("POST", "/session", {
    capabilities: {
      alwaysMatch: {
        platformName: "iOS",
        browserName: "Safari",
        "appium:automationName": "XCUITest",
        "appium:udid": udid,
        "appium:connectHardwareKeyboard": false,
        "appium:safariInitialUrl": url,
        "appium:webviewConnectTimeout": 60_000,
        "appium:wdaLaunchTimeout": 120_000,
        "appium:wdaStartupRetries": 1,
        "appium:showXcodeLog": true,
        "appium:newCommandTimeout": 1200,
      },
    },
  });
  try {
    write(sessionFile, JSON.stringify(session, null, 2));
  } catch (error) {
    // Without a saved ID, a later `close` cannot find the new remote session.
    try {
      await deleteSession(session.sessionId);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        `Could not save or close Appium session ${session.sessionId}`,
      );
    }
    throw error;
  }
  await request("POST", `/session/${session.sessionId}/timeouts`, {
    script: 30_000,
  });
  result = session;
} else {
  const { sessionId } = JSON.parse(readFileSync(sessionFile, "utf8"));
  const base = `/session/${sessionId}`;
  function call(method, path, body) {
    return request(method, `${base}${path}`, body);
  }
  async function native(run) {
    const context = await call("GET", "/context");
    await call("POST", "/context", { name: "NATIVE_APP" });
    try {
      return await run();
    } finally {
      await call("POST", "/context", { name: context });
    }
  }
  async function tap(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("Invalid tap coordinates");
    }
    return call("POST", "/execute/sync", {
      script: "mobile: tap",
      args: [{ x, y }],
    });
  }
  switch (action) {
    case "exec":
      result = await call("POST", "/execute/sync", {
        script: args[0],
        args: JSON.parse(args[1] ?? "[]"),
      });
      break;
    case "navigate":
      result = await call("POST", "/url", { url: args[0] });
      break;
    case "request":
      result = await call(
        args[0],
        args[1],
        args[2] ? JSON.parse(args[2]) : undefined,
      );
      break;
    case "tap":
      result = await native(() => tap(Number(args[0]), Number(args[1])));
      break;
    case "key":
      if (!args[0]) {
        throw new Error("key requires an observed native key name");
      }
      result = await native(async () => {
        const element = await call("POST", "/element", {
          using: "-ios predicate string",
          value: `(type == 'XCUIElementTypeButton' OR type == 'XCUIElementTypeKey') AND name ==[c] ${JSON.stringify(args[0])}`,
        });
        const id = element["element-6066-11e4-a52e-4f735466cecf"];
        const rect = await call("GET", `/element/${id}/rect`);
        await tap(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { key: args[0], rect };
      });
      break;
    case "type":
      result = await native(() => call("POST", "/keys", { value: [args[0]] }));
      break;
    case "native-source":
      result = await native(() => call("GET", "/source"));
      break;
    case "state": {
      const state = JSON.parse(
        await call("POST", "/execute/sync", {
          script: `
          const root = document.querySelector(arguments[0]);
          const tiptap = root?.editor;
          const editor = tiptap?.schema?.cached?.blockNoteEditor;
          if (!editor) throw new Error('No mounted BlockNote editor at the requested selector');
          const { from, to } = tiptap.state.selection;
          return JSON.stringify({
            document: editor.document,
            selection: { from, to },
            focused: tiptap.isFocused,
            dom: root.innerHTML,
          });`,
          args: [args[1] ?? ".ProseMirror"],
        }),
      );
      result = args[0] ? write(args[0], JSON.stringify(state, null, 2)) : state;
      break;
    }
    case "screenshot":
      if (!args[0]) {
        throw new Error("screenshot requires an output path");
      }
      result = write(
        args[0],
        Buffer.from(await call("GET", "/screenshot"), "base64"),
      );
      break;
    case "close":
      result = await deleteSession(sessionId);
      unlinkSync(sessionFile);
      break;
    default:
      throw new Error(
        "Use create, exec, navigate, request, tap, key, type, native-source, state, screenshot, or close",
      );
  }
}
console.log(JSON.stringify(result, null, 2));
