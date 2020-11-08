const emitter = new EventTarget();
export const addEventListener = (...args) => emitter.addEventListener(...args);
export const removeEventListener = (...args) => emitter.removeEventListener(...args);
export const dispatchEvent = (...args) => emitter.dispatchEvent(...args);

const DEFAULT_SEA_LEVEL = 20;
export const DEFAULT = {
    seaLevel: DEFAULT_SEA_LEVEL
};

export const Options = o => ({
    ...o,
    ...DEFAULT
});
