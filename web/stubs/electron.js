// The desktop preload talks to Electron; on the web, its pure functions are used directly
const unavailable = async () => { throw new Error('Not available on the web'); };
module.exports = {
  contextBridge: { exposeInMainWorld: (name, api) => { window[name] = api; } },
  ipcRenderer: { invoke: unavailable, send() {}, on() {}, removeListener() {} }
};
