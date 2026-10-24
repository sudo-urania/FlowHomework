/* StudyFlow scheduling rules. Pure functions, no DOM, so they can move to the backend later. */
(function () {
  const hm = s => { const [h, m] = s.split(':'); return +h * 60 + +m; };
  const MIN = 6e4;
 
  // Is this moment inside sleep time? (30 min buffer each side)
  function asleep(d, c) {
    const m = d.getHours() * 60 + d.getMinutes();
    const a = (hm(c.sleep) - 30 + 1440) % 1440, b = (hm(c.wake) + 30) % 1440;
    return a > b ? (m >= a || m < b) : (m >= a && m < b);
  }
  const dayKey = (d, c) => new Date(d - hm(c.wake) * MIN).toDateString();
 
  // Build free study slots from now until 1 hour before the exam.
  function slots(c, now) {
    const end = new Date(new Date(c.exam) - 60 * MIN), L = +c.session;
    const brk = L >= 90 ? 15 : L >= 50 ? 10 : 5, out = [], perDay = {};
    let t = new Date(now), n = 0, guard = 0;
    t.setSeconds(0, 0); t.setMinutes(Math.ceil(t.getMinutes() / 5) * 5);
    while (t < end && guard++ < 20000) {
      if (asleep(t, c)) { t = new Date(+t + 5 * MIN); continue; }
      const k = dayKey(t, c); perDay[k] = perDay[k] || 0;
      if (perDay[k] >= c.maxHours * 60) { t = new Date(+t + 15 * MIN); continue; }
      const fin = new Date(+t + L * MIN);
      let ok = fin <= end;
      for (let z = 5; ok && z <= L; z += 5) if (asleep(new Date(+t + z * MIN), c)) ok = false;
      if (!ok) { t = new Date(+t + 5 * MIN); continue; }
      out.push({ start: new Date(t), end: fin, items: [] });
      perDay[k] += L; n++;
      t = new Date(+fin + (n % 3 === 0 ? 30 : brk) * MIN); // longer rest every 3rd session
    }
    return out;
  }
 
  // subjects: [{id, name, topics:[{id, name, minutes, spent}]}] (only topics still to study)
  function plan(c, subjects, now = new Date()) {
    const sl = slots(c, now);
    const q = [];
    subjects.forEach(s => s.topics.forEach(t =>
      q.push({ id: t.id, sid: s.id, label: t.name, subject: s.name, min: Math.max(3, t.minutes - (t.spent || 0)) })));
    if (!sl.length) return { sessions: [], note: 'There is no study time left before the exam.' };
 
    const cap = sl.length * c.session, need = q.reduce((s, x) => s + x.min, 0);
    const scale = need > cap ? Math.max(0.35, cap / need) : 1;   // shrink reading if time is short
    q.forEach(x => { x.left = Math.max(3, x.min * scale); });
 
    let i = 0, si = 0, free = +c.session;
    while (i < q.length && si < sl.length) {
      const it = q[i], take = Math.min(it.left, free);
      it.left -= take; free -= take;
      if (take >= 3) sl[si].items.push({ id: it.id, sid: it.sid, label: it.label, subject: it.subject, min: Math.round(take), last: it.left <= 0.5 });
      if (it.left <= 0.5) i++;
      if (free < 3) { si++; free = +c.session; }
    }
    return {
      sessions: sl.filter(s => s.items.length),
      note: scale < 1 ? 'Not enough time to cover everything calmly, so each topic was shortened to ' + Math.round(scale * 100) + '%.' : ''
    };
  }
 
  window.Scheduler = { plan };
})();