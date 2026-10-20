// s05 · States — the frost "Collect details" state editor (product truth, public/designs/04-state-editor.png),
// rebuilt as a translucent glass pane. Frame-driven: `f` = GLOBAL frame, `at` = when it opens.
import React from 'react';
import {GlassPane, Icon} from '../../ui';
import {C, FONT, MONO, clamp} from '../../lib';

const PROMPT = 'Collect the visitor’s name and email, one field at a time. Never guess missing details.';

export const EDITOR_W = 640;
export const EDITOR_H = 468;

export const StateEditorPane: React.FC<{f: number; at: number; sheen?: number}> = ({f, at, sheen}) => {
  const d = f - at;
  const typed = Math.floor(clamp((d - 8) / 34) * PROMPT.length);
  const caret = d > 6 && Math.floor(d / 8) % 2 === 0;
  const field: React.CSSProperties = {
    borderRadius: 14, background: 'rgba(255,255,255,0.78)', boxShadow: 'inset 0 0 0 1.5px rgba(140,107,234,0.28), inset 0 2px 6px rgba(57,41,75,0.06)',
    padding: '12px 18px', fontSize: 21, color: C.plum, fontFamily: FONT,
  };
  const label: React.CSSProperties = {fontSize: 19, fontWeight: 650, color: C.plum, margin: '16px 0 8px'};
  return (
    <GlassPane look="frost" w={EDITOR_W} h={EDITOR_H} radius={30} padding="26px 32px" glow={0.9} sheen={sheen} flash={Math.exp(-Math.max(0, d) / 6)}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{fontSize: 33, fontWeight: 800, color: C.plum, letterSpacing: '-0.02em'}}>Collect details</div>
        <div style={{fontSize: 30, color: C.plumSoft, lineHeight: 1}}>×</div>
      </div>
      <div style={label}>State name</div>
      <div style={{...field, fontFamily: MONO, fontSize: 20}}>collect_details</div>
      <div style={label}>State prompt</div>
      <div style={{...field, height: 92, lineHeight: 1.45}}>
        {PROMPT.slice(0, typed)}
        {caret && typed < PROMPT.length + 1 && <span style={{display: 'inline-block', width: 2, height: 24, marginLeft: 2, verticalAlign: 'middle', background: C.purpleDeep}} />}
      </div>
      <div style={{display: 'flex', justifyContent: 'flex-end', gap: 14, marginTop: 20}}>
        <div style={{padding: '12px 26px', borderRadius: 14, background: 'rgba(228,219,247,0.85)', color: C.plum, fontSize: 20, fontWeight: 600}}>Cancel</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '12px 26px', borderRadius: 14, background: `linear-gradient(180deg, ${C.purple}, ${C.purpleDeep})`, color: '#fff', fontSize: 20, fontWeight: 650, boxShadow: '0 6px 18px -6px rgba(106,69,224,0.8)'}}>
          {Icon.check && <Icon.check size={20} color="#fff" sw={2.4} />}Save changes
        </div>
      </div>
    </GlassPane>
  );
};
