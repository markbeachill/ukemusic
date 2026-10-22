function parseValue(rawValue) {
  const value = String(rawValue || '').trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function parseIni(input) {
  const text = String(input || '').replace(/\r\n?/g, '\n');
  const result = {};
  let section = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#')) {
      continue;
    }

    const sectionMatch = line.match(/^\[(.+)]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      if (!result[section]) {
        result[section] = {};
      }
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).split(';')[0].trim();

    if (section) {
      result[section][key] = parseValue(value);
    } else {
      result[key] = parseValue(value);
    }
  }

  return result;
}

function stringifyValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function stringifyIni(config) {
  const sections = [];
  for (const [section, values] of Object.entries(config || {})) {
    if (values && typeof values === 'object' && !Array.isArray(values)) {
      sections.push(`[${section}]`);
      for (const [key, value] of Object.entries(values)) {
        sections.push(`${key} = ${stringifyValue(value)}`);
      }
      sections.push('');
    } else {
      sections.push(`${section} = ${stringifyValue(values)}`);
    }
  }
  return sections.join('\n').trimEnd() + '\n';
}

module.exports = {
  parseIni,
  stringifyIni
};
