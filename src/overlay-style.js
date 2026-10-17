// How the overlay looks. Only data: no logic.
//
// To blend in with wordbomb.io, every colour, corner radius and shadow below is written as
//     var(--name, fallback)
// which means "use the website's own value for --name, and if it does not have one, use the
// fallback". The site defines a whole palette as such named values (for example --bg-glass,
// --theme-primary, --text-primary), so the box automatically matches the site's colours.
//
// Each entry is a set of CSS rules. The names are camelCase (borderRadius, not border-radius)
// because that is how JavaScript sets styles on an element.

// site('text-primary', '#eef0f8')  ->  'var(--text-primary, #eef0f8)'
function site(name, fallback) {
  return 'var(--' + name + ', ' + fallback + ')';
}

const OVERLAY_FONT = 'Quicksand, WBDefault, system-ui, -apple-system, "Segoe UI", sans-serif';

const OVERLAY_STYLE = {
  // The whole box. It sits below the site's top bar so it never covers the menu or coin counters.
  card: {
    position: 'fixed',
    top: '64px',
    left: '12px',
    zIndex: '2147483647', // the biggest layer number: above everything else
    boxSizing: 'border-box',
    width: '272px',
    padding: '14px',
    background: site('bg-glass', 'rgba(17, 19, 26, 0.85)'),
    border: '1px solid ' + site('border-medium', 'rgba(151, 177, 243, 0.14)'),
    borderRadius: site('radius-lg', '12px'),
    boxShadow: site('shadow-md', '0 4px 16px rgba(0, 0, 0, 0.55)'),
    color: site('text-primary', '#eef0f8'),
    fontFamily: OVERLAY_FONT,
    fontSize: '14px',
    lineHeight: '1.3',
    pointerEvents: 'none', // clicks pass through the box, so it never blocks the game
    backdropFilter: 'blur(6px)',
  },

  // The top row: the prompt on the left, whose turn it is on the right.
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '10px' },
  prompt: { fontSize: '40px', fontWeight: '800', letterSpacing: '0.08em', lineHeight: '1' },
  promptEmpty: { opacity: '0.35' }, // the "-" shown before a game starts
  count: { marginTop: '6px', fontSize: '12px', color: site('text-muted', '#9498a4') },

  // The "Your turn" label. One shared look, plus a colour for each situation.
  pillBase: {
    flexShrink: '0',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  pill: {
    yours: { background: site('theme-primary', '#4072ee'), color: site('text-on-primary', '#ffffff') },
    theirs: { background: site('bg-elevated', '#262c3d'), color: site('text-secondary', '#aeb1bc') },
    unknown: { background: site('warning-light', 'rgba(232, 153, 0, 0.12)'), color: site('theme-warning', '#e89900') },
    waiting: { background: site('bg-elevated', '#262c3d'), color: site('text-muted', '#9498a4') },
  },

  // "Letters left": a small caption and a row of letter chips.
  lettersBlock: { marginTop: '14px' },
  sectionLabel: {
    marginBottom: '6px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: site('text-muted', '#9498a4'),
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  chip: {
    minWidth: '20px',
    height: '22px',
    padding: '0 4px',
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: '700',
    color: site('text-accent', '#89a8f4'),
    background: site('bg-accent', '#1f2431'),
    border: '1px solid ' + site('border-subtle', 'rgba(151, 177, 243, 0.08)'),
    borderRadius: site('radius-sm', '6px'),
  },

  // The suggested words: one rounded row each, the best one highlighted.
  words: { marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: site('bg-tertiary', '#181c26'),
    border: '1px solid ' + site('border-subtle', 'rgba(151, 177, 243, 0.08)'),
    borderRadius: site('radius-md', '8px'),
  },
  rowBest: {
    background: site('primary-light', 'rgba(64, 114, 238, 0.12)'),
    border: '1px solid ' + site('border-glow', 'rgba(64, 114, 238, 0.4)'),
  },
  word: { fontSize: '24px', fontWeight: '700', lineHeight: '1.15', color: site('text-primary', '#eef0f8') },
  wordMatch: { color: site('text-accent', '#89a8f4') }, // the prompt letters inside the word
  filled: {
    flexShrink: '0',
    padding: '3px 7px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    color: site('theme-success', '#2abc62'),
    background: site('success-light', 'rgba(42, 188, 98, 0.12)'),
  },
  note: { marginTop: '12px', fontSize: '13px', color: site('text-muted', '#9498a4') },

  // The bottom part: the slider. This is the only part that accepts mouse clicks.
  controls: {
    marginTop: '14px',
    paddingTop: '10px',
    borderTop: '1px solid ' + site('border-subtle', 'rgba(151, 177, 243, 0.08)'),
    pointerEvents: 'auto',
  },
  controlsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: site('text-muted', '#9498a4') },
  controlsValue: { fontWeight: '700', color: site('text-primary', '#eef0f8') },
  slider: { width: '100%', margin: '6px 0 0', accentColor: site('range-accent', '#4072ee') },
  hint: { marginTop: '6px', fontSize: '11px', color: site('text-muted', '#9498a4') },
};

if (typeof module !== 'undefined') module.exports = { OVERLAY_STYLE, OVERLAY_FONT, site };
