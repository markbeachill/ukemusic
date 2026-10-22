function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeDefinition(chordDefinition = {}) {
  const frets = Array.isArray(chordDefinition.frets) && chordDefinition.frets.length ? chordDefinition.frets.slice(0, 12) : [0, 0, 0, 0];
  return {
    name: chordDefinition.name || '',
    frets,
    fingers: Array.isArray(chordDefinition.fingers) ? chordDefinition.fingers.slice(0, frets.length) : frets.map(() => 0),
    barre: chordDefinition.barre || null,
    base_fret: Number(chordDefinition.base_fret) > 0 ? Number(chordDefinition.base_fret) : 1,
    custom: Boolean(chordDefinition.custom)
  };
}

// Left-handed players hold the instrument the other way round, so the strings run the
// other way across the diagram: mirror frets, fingers and the barre.
function mirror(definition) {
  const last = definition.frets.length - 1;
  return {
    ...definition,
    frets: [...definition.frets].reverse(),
    fingers: [...definition.fingers].reverse(),
    barre: definition.barre && Array.isArray(definition.barre.strings)
      ? { ...definition.barre, strings: definition.barre.strings.map((s) => last - s) }
      : definition.barre
  };
}

function renderDiagramSvg(chordDefinition, options = {}) {
  const normal = normalizeDefinition(chordDefinition);
  const definition = options.left_handed ? mirror(normal) : normal;
  const showFingers = options.show_fingers !== false;
  // Same overall width for every instrument: 4 strings 20 apart, 6 strings 14 apart
  const stringCount = definition.frets.length;
  const stringGap = stringCount <= 4 ? 20 : Math.round(60 / (stringCount - 1));
  const left = 24 + (60 - stringGap * (stringCount - 1)) / 2;
  const top = 34;
  const fretGap = 24;
  const nutY = top;
  const fretRows = Math.max(3, ...definition.frets
    .filter((fret) => typeof fret === 'number' && fret > 0)
    .map((fret) => fret - definition.base_fret + 1));
  const bottomGridY = top + fretGap * fretRows;
  const indicatorY = 16;
  const nameY = bottomGridY + 32;
  const stringXs = definition.frets.map((_, index) => left + index * stringGap);
  const dotRadius = stringCount <= 4 ? 7 : 6;
  const parts = [];

  for (const x of stringXs) {
    parts.push(`<line class="line" x1="${x}" y1="${nutY}" x2="${x}" y2="${bottomGridY}" stroke="var(--rhythm-color)" stroke-width="1.5" />`);
  }

  for (let index = 0; index <= fretRows; index += 1) {
    const y = top + index * fretGap;
    const strokeWidth = index === 0 && definition.base_fret === 1 ? 4 : 1.5;
    parts.push(`<line class="line" x1="${stringXs[0]}" y1="${y}" x2="${stringXs[stringXs.length - 1]}" y2="${y}" stroke="var(--rhythm-color)" stroke-width="${strokeWidth}" />`);
  }

  if (definition.base_fret > 1) {
    parts.push(`<text class="fret-label" x="6" y="${top + fretGap + 4}" font-size="12" fill="var(--text-color)">${definition.base_fret}</text>`);
  }

  definition.frets.forEach((fret, index) => {
    const x = stringXs[index];
    if (fret === 0) {
      parts.push(`<circle class="open" cx="${x}" cy="${indicatorY}" r="5" fill="none" stroke="var(--text-color)" stroke-width="1.5" data-open="true" />`);
      return;
    }

    if (fret === -1 || fret === null || fret === 'x') {
      parts.push(`<text class="muted" x="${x}" y="${indicatorY + 4}" text-anchor="middle" font-size="12" fill="var(--text-color)" data-muted="true">X</text>`);
      return;
    }

    const normalizedFret = definition.base_fret > 1 ? fret - definition.base_fret + 1 : fret;
    const y = top + (normalizedFret - 0.5) * fretGap;
    const finger = definition.fingers[index] || 0;
    parts.push(`<circle class="dot" cx="${x}" cy="${y}" r="${dotRadius}" fill="var(--text-color)" data-dot="true" />`);
    if (showFingers && finger > 0) {
      parts.push(`<text class="finger" x="${x}" y="${y + 4}" text-anchor="middle" font-size="9" fill="var(--bg-color)" data-finger="true">${finger}</text>`);
    }
  });

  if (definition.barre && Array.isArray(definition.barre.strings) && definition.barre.strings.length >= 2) {
    const barreFret = definition.base_fret > 1
      ? definition.barre.fret - definition.base_fret + 1
      : definition.barre.fret;
    const y = top + (barreFret - 0.5) * fretGap;
    const sortedStrings = [...definition.barre.strings].sort((a, b) => a - b);
    const startX = stringXs[sortedStrings[0]] - 7;
    const endX = stringXs[sortedStrings[sortedStrings.length - 1]] + 7;
    parts.push(`<rect class="barre" x="${startX}" y="${y - 5}" width="${endX - startX}" height="10" rx="5" fill="var(--text-color)" data-barre="true" />`);
  }

  parts.push(`<text class="name" x="${(stringXs[0] + stringXs[stringXs.length - 1]) / 2}" y="${nameY}" text-anchor="middle" font-size="18" font-weight="600" fill="var(--chord-color)">${escapeHtml(definition.name)}</text>`);

  return `<div class="chord-diagram${definition.custom ? ' custom-shape' : ''}" data-chord="${escapeHtml(definition.name)}"><svg viewBox="0 0 100 ${nameY + 7}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeHtml(definition.name)} chord diagram" style="width: var(--diagram-size); height: auto;">${parts.join('')}</svg></div>`;
}

function createPlaceholderDiagram(chordName, strings = 4) {
  return renderDiagramSvg({
    name: chordName,
    frets: new Array(strings).fill(null),
    fingers: new Array(strings).fill(0),
    barre: null,
    base_fret: 1
  }, { show_fingers: false });
}

function createTextOnlyDiagram(chordName) {
  return `<div class="chord-diagram chord-diagram-text" data-chord="${escapeHtml(chordName)}"><div class="name">${escapeHtml(chordName)}</div></div>`;
}

module.exports = renderDiagramSvg;
module.exports.renderDiagramSvg = renderDiagramSvg;
module.exports.createPlaceholderDiagram = createPlaceholderDiagram;
module.exports.createTextOnlyDiagram = createTextOnlyDiagram;
