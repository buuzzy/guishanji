/** Small serializable, independent random streams; no host state is used here. */
export function hashText(text) {
  let value = 2166136261;
  for (const character of String(text)) {
    value ^= character.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function createStreams(seed) {
  return Object.fromEntries(['birth', 'life', 'people', 'world', 'story'].map(name => [name, {
    value: hashText(String(seed) + ':' + name) % 2147483646 + 1,
    draws: 0,
  }]));
}

export function random(state, stream = 'life') {
  const source = state.random[stream];
  if (!source) throw new Error('未知随机流：' + stream);
  source.value = source.value * 48271 % 2147483647;
  source.draws++;
  return (source.value - 1) / 2147483646;
}

export function integer(state, min, max, stream = 'life') {
  return min + Math.floor(random(state, stream) * (max - min + 1));
}

export function pick(state, values, stream = 'life') {
  return values[integer(state, 0, values.length - 1, stream)];
}

export function weighted(state, values, stream = 'birth') {
  let remainder = random(state, stream) * values.reduce((sum, item) => sum + item.weight, 0);
  for (const item of values) {
    remainder -= item.weight;
    if (remainder < 0) return item;
  }
  return values.at(-1);
}

export function visualNoise(seed, index) {
  return hashText(String(seed) + ':visual:' + index) / 4294967296;
}
