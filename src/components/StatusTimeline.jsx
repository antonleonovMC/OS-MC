const BRAND = '#28798d';

export default function StatusTimeline({ history }) {
  const lastDoneIdx = history.filter(h => h.done).length - 1;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      {history.map((h, i) => {
        const isLast    = i === history.length - 1;
        const isDone    = h.done;
        const isCurrent = h.done && i === lastDoneIdx;

        return (
          <div key={i} style={{ display:'flex', gap:14 }}>
            {/* Track */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, width:20 }}>
              <div style={{
                width:10, height:10, borderRadius:'50%', flexShrink:0, zIndex:1, marginTop:3,
                background: isCurrent ? BRAND : isDone ? BRAND + 'aa' : '#e2e8f0',
                border: isCurrent ? `2px solid ${BRAND}` : isDone ? 'none' : '2px solid #e2e8f0',
                boxShadow: isCurrent ? `0 0 0 3px ${BRAND}22` : 'none',
                transition: 'all .3s',
              }} />
              {!isLast && (
                <div style={{
                  width:2, flex:1, minHeight:24, marginTop:2,
                  background: isDone && !isCurrent
                    ? `linear-gradient(to bottom, ${BRAND}aa, ${BRAND}44)`
                    : isCurrent
                      ? `linear-gradient(to bottom, ${BRAND}, #e2e8f0)`
                      : '#e2e8f0',
                  borderRadius:2,
                }} />
              )}
            </div>

            {/* Label */}
            <div style={{ paddingBottom:16, flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{
                  fontSize:13, fontWeight:600, lineHeight:'20px',
                  color: isCurrent ? BRAND : isDone ? '#1a3a42' : '#cbd5e1',
                }}>
                  {h.status}
                </span>
                {isCurrent && (
                  <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:20,
                    background:'#e8f4f6', color:BRAND }}>
                    Сейчас
                  </span>
                )}
              </div>
              <div style={{ fontSize:11, marginTop:1, color: h.date !== '—' ? '#94a3b8' : '#e2e8f0' }}>
                {h.date !== '—' ? `${h.date}${h.time ? ' · ' + h.time : ''}` : 'Ожидается'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
