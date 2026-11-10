// The desktop ribbon's layout (after 4.52): one standard for every tab, no wrapping (groups fold
// into ▾ buttons instead), and the Accompaniment tab named Picking.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const panels = {};
for (const m of html.matchAll(/<div class="ribbon-panel" data-ribbon-panel="([a-z]+)"[^>]*>([\s\S]*?)(?=\n {10}<div class="ribbon-panel"|\n {10}<div id="ribbonHint")/g)) panels[m[1]] = m[2];

test('the tab is called Picking', () => {
  assert.match(html, /id="ribbonTabPick"[^>]*>Picking<\/button>/);
});

test('every group is a row of items over its name', () => {
  for (const [name, body] of Object.entries(panels)) {
    const groups = body.split(/<div class="rib-group"(?: data-feature="\w+")?>/).slice(1);
    assert.ok(groups.length, name);
    for (const g of groups) {
      assert.match(g, /<div class="rib-items">/, `${name}: a group without rib-items`);
      assert.match(g, /<span class="rib-label"[^>]*>[^<]+<\/span>/, `${name}: a group without a name`);
    }
  }
});

test('small controls sit in columns of two rows, and one setting on its own has no label of its own', () => {
  for (const [name, body] of Object.entries(panels)) {
    if (name === 'settings') continue;
    assert.ok(!/class="rib-items rib-fields"/.test(body), `${name}: the old free-form fields`);
    for (const g of body.split(/<div class="rib-group"(?: data-feature="\w+")?>/).slice(1)) {
      const items = g.slice(0, g.search(/<span class="rib-label"[ >]/));
      const labels = (items.match(/<label for=/g) || []).length;
      const selects = (items.match(/<select /g) || []).length + (items.match(/type="number"/g) || []).length;
      const caption = g.match(/<span class="rib-label"[^>]*>([^<]+)</)[1];
      const others = /details|type="checkbox"|class="rib-small"|class="rib-button/.test(items);
      if (selects === 1 && !others) assert.strictEqual(labels, 0, `${name} / ${caption}: one setting, named by its group`);
    }
  }
});

test('the ribbon folds rather than wraps, and a control in a folded group can still be reached', () => {
  assert.match(html, /\.ribbon-panel \{ flex-wrap: nowrap;/);
  assert.match(html, /function foldRibbon\(\)/);
  assert.match(html, /className = 'rib-button rib-fold'/);
  assert.match(html, /const folded = element\.closest\('\.rib-group\.folded'\)/);
});

test('every control the ribbon had is still there', () => {
  for (const id of ['saveButton', 'closeSongButton', 'versionSelect', 'transposeDown', 'transposeUp', 'keyMenu', 'capoSelect', 'capoSuggestButton', 'instrumentSelect', 'tempoInput', 'beatsSelect', 'songStrumSelect',
    'viewStyleSet', 'viewLook', 'editStylesheetButton', 'viewDiagrams', 'viewLeftHanded', 'viewSkipCommon', 'viewTextSmaller', 'viewTextBigger', 'viewTextReset', 'viewTune', 'viewStrumStyle', 'viewStrumSize', 'viewLayout', 'tabMenu',
    'exportNowButton', 'openExportsButton', 'exportPageQuick', 'exportTabInPrint', 'exportAllQuick', 'exportSections', 'exportStageFormat',
    'playButton', 'stopButton', 'playFromStartButton', 'karaokeButton', 'sessionButton', 'tempoSlower', 'playTempoInput', 'tempoFaster', 'tapTempoButton', 'loopSection', 'speedUp', 'practiceSpeed', 'resetPracticeChoices', 'playSoundSelect', 'playGuitarSoundSelect', 'playFeel', 'voiceMenu',
    'learnStage', 'learnPlayButton', 'learnQuizButton', 'learnTroubleButton', 'learnChangesButton', 'learnDrillButton', 'learnNumbers', 'learnKey', 'learnKeyButton', 'learnSheetButton', 'learnCircleButton', 'learnPatternsButton',
    'pickPattern', 'pickPatternText', 'pickPlayButton', 'pickStopButton', 'pickKaraokeButton', 'pickTune', 'pickFirstNoteButton', 'pickSheetButton', 'learnPickButton', 'pickChangeMenu', 'pickWriteMenu', 'pickHelpButton']) {
    assert.strictEqual((html.match(new RegExp(`id="${id}"`, 'g')) || []).length, 1, id);
  }
});
