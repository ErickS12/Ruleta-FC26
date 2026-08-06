(function(){
  const palette = ["#F4B740","#E94F4F","#3FBFAD","#7C6FD6","#F28C6B","#5FA8E0","#D6C24A","#C86FD6"];

  let options = [
    { id: 1, text: "Izquierda arriba", weight: 1 },
    { id: 2, text: "Izquierda abajo",  weight: 1 },
    { id: 3, text: "Centro arriba",    weight: 1 },
    { id: 4, text: "Centro abajo",     weight: 1 },
    { id: 5, text: "Derecha arriba",   weight: 1 },
    { id: 6, text: "Derecha abajo",    weight: 1 }
  ];
  let nextId = 7;
  let totalRotation = 0;
  let spinning = false;

  const optList   = document.getElementById('optList');
  const wheelRot  = document.getElementById('wheelRotator');
  const hubBtn    = document.getElementById('hubBtn');
  const spinBtn   = document.getElementById('spinBtn');
  const addBtn    = document.getElementById('addBtn');
  const eqBtn     = document.getElementById('eqBtn');
  const statusLine= document.getElementById('statusLine');
  const overlay   = document.getElementById('overlay');
  const resultsList = document.getElementById('resultsList');
  const resultsSummary = document.getElementById('resultsSummary');
  const closeBtn  = document.getElementById('closeBtn');
  const againBtn  = document.getElementById('againBtn');
  const bulbRing  = document.getElementById('bulbRing');

  // Usamos un origen de aleatoriedad fuerte si el navegador lo soporta.
  function randomFloat(){
    if (typeof crypto !== 'undefined' && crypto.getRandomValues){
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] / 4294967296;
    }
    return Math.random();
  }

  function clamp(x, min, max){
    return Math.max(min, Math.min(max, x));
  }

  function totalWeight(){
    return options.reduce((s,o)=> s + (Number(o.weight)>0? Number(o.weight):0), 0);
  }

  function renderList(){
    optList.innerHTML = '';
    const tw = totalWeight();
    options.forEach((o, idx) => {
      const row = document.createElement('div');
      row.className = 'opt-row';

      const swatch = document.createElement('span');
      swatch.className = 'opt-swatch';
      swatch.style.background = palette[idx % palette.length];
      row.appendChild(swatch);

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.value = o.text;
      textInput.setAttribute('aria-label', 'Texto de la opción');
      textInput.maxLength = 40;
      textInput.addEventListener('input', e => {
        o.text = e.target.value;
        renderWheel();
      });
      row.appendChild(textInput);

      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '1';
      weightInput.max = '100';
      weightInput.value = o.weight;
      weightInput.setAttribute('aria-label', 'Peso / probabilidad relativa');
      weightInput.addEventListener('input', e => {
        let v = parseInt(e.target.value, 10);
        if (!v || v < 1) v = 1;
        o.weight = v;
        renderList();
        renderWheel();
      });
      row.appendChild(weightInput);

      const pct = document.createElement('span');
      pct.className = 'opt-pct';
      const p = tw > 0 ? (Number(o.weight) / tw * 100) : 0;
      pct.textContent = p.toFixed(0) + '%';
      row.appendChild(pct);

      const del = document.createElement('button');
      del.className = 'del';
      del.type = 'button';
      del.innerHTML = '&times;';
      del.setAttribute('aria-label', 'Eliminar opción ' + o.text);
      del.addEventListener('click', () => {
        if (options.length <= 2){
          statusLine.textContent = 'Necesitas al menos 2 opciones.';
          return;
        }
        options = options.filter(x => x.id !== o.id);
        renderList();
        renderWheel();
        updateSpinAvailability();
      });
      row.appendChild(del);

      optList.appendChild(row);
    });

    updateSpinAvailability();
  }

  function updateSpinAvailability(){
    const canSpin = options.length >= 2 && totalWeight() > 0;
    spinBtn.disabled = !canSpin || spinning;
    hubBtn.setAttribute('aria-disabled', String(!canSpin || spinning));
    if (!spinning){
      statusLine.textContent = canSpin ? '' : 'Agrega al menos 2 opciones para girar.';
    }
  }

  function renderWheel(){
    // remove old labels
    wheelRot.querySelectorAll('.label-wrap').forEach(el => el.remove());

    const tw = totalWeight();
    if (tw <= 0 || options.length === 0){
      wheelRot.style.background = '#382A57';
      return;
    }

    let cumulative = 0; // degrees
    const stops = [];
    const fragment = document.createDocumentFragment();

    options.forEach((o, idx) => {
      const w = Number(o.weight) > 0 ? Number(o.weight) : 0;
      const angle = (w / tw) * 360;
      const start = cumulative;
      const end = cumulative + angle;
      const color = palette[idx % palette.length];
      stops.push(color + ' ' + start.toFixed(3) + 'deg ' + end.toFixed(3) + 'deg');

      const mid = start + angle / 2;
      const wrap = document.createElement('div');
      wrap.className = 'label-wrap';
      wrap.style.transform = 'rotate(' + (mid - 90).toFixed(2) + 'deg)';

      const span = document.createElement('span');
      span.className = 'label-text';
      span.textContent = o.text || '(sin texto)';
      const fontSize = angle < 25 ? 11 : angle < 45 ? 13 : 15;
      span.style.fontSize = fontSize + 'px';
      span.style.maxWidth = (angle < 30 ? 70 : 100) + 'px';
      wrap.appendChild(span);

      fragment.appendChild(wrap);
      cumulative = end;
    });

    wheelRot.appendChild(fragment);
    wheelRot.style.background = 'conic-gradient(' + stops.join(', ') + ')';
  }

  function buildBulbs(){
    bulbRing.innerHTML = '';
    const count = 20;
    for (let i = 0; i < count; i++){
      const b = document.createElement('span');
      const ang = (360 / count) * i;
      const radius = 50; // percent-ish via translate trick using vmin not needed; use JS to position with px after layout
      b.style.transform = 'rotate(' + ang + 'deg) translate(0, -50%)';
      b.style.animationDelay = (i * (2.4/count)).toFixed(2) + 's';
      bulbRing.appendChild(b);
    }
    positionBulbs();
  }

  function positionBulbs(){
    const rect = bulbRing.getBoundingClientRect();
    const r = rect.width / 2;
    bulbRing.querySelectorAll('span').forEach((b, i, arr) => {
      const ang = (360 / arr.length) * i;
      const rad = (ang - 90) * Math.PI / 180;
      const x = r + r * Math.cos(rad);
      const y = r + r * Math.sin(rad);
      b.style.left = x + 'px';
      b.style.top = y + 'px';
      b.style.transform = '';
    });
  }

  function pickWinnerAngle(){
    // uniform random point on the circle; the segment containing it wins,
    // so probability of winning equals segment size (weight share).
    const tw = totalWeight();
    const r = randomFloat() * tw;
    let cum = 0;
    let winner = options[0];
    let start = 0, end = 0;
    for (const o of options){
      const w = Number(o.weight) > 0 ? Number(o.weight) : 0;
      const segStart = cum;
      const segEnd = cum + w;
      if (r >= segStart && r < segEnd){
        winner = o;
        start = (segStart / tw) * 360;
        end = (segEnd / tw) * 360;
        break;
      }
      cum = segEnd;
    }
    // random point within the segment (avoid extreme edges)
    const margin = Math.min((end - start) * 0.15, 4);
    const angle = start + margin + randomFloat() * Math.max((end - start) - margin * 2, 0.001);
    return { winner, angle, pct: ((end-start)/360*100) };
  }

  function pickAngleForOption(targetOption){
    const tw = totalWeight();
    if (tw <= 0 || !targetOption){
      return 0;
    }

    let cum = 0;
    for (const o of options){
      const w = Number(o.weight) > 0 ? Number(o.weight) : 0;
      const segStart = cum;
      const segEnd = cum + w;
      if (o.id === targetOption.id){
        const start = (segStart / tw) * 360;
        const end = (segEnd / tw) * 360;
        const margin = Math.min((end - start) * 0.15, 4);
        return start + margin + randomFloat() * Math.max((end - start) - margin * 2, 0.001);
      }
      cum = segEnd;
    }

    return pickWinnerAngle().angle;
  }

  function pickWeightedOption(){
    const tw = totalWeight();
    const r = randomFloat() * tw;
    let cum = 0;
    for (const o of options){
      const w = Number(o.weight) > 0 ? Number(o.weight) : 0;
      if (r < cum + w) return o;
      cum += w;
    }
    return options[options.length - 1];
  }

  const RESULT_COUNT = 20;

  // Pseudoaleatoriedad inteligente para secuencias de penales.
  // Combina: enfriamiento por recencia, compensación de balance global,
  // bonus por ausencia y penalización de transiciones/patrones repetitivos.
  function generateSmartPenaltySequence(count){
    const currentOptions = options.slice();
    const n = currentOptions.length;
    const totalBaseWeight = currentOptions.reduce((s, o) => s + Math.max(1, Number(o.weight) || 1), 0);
    const targetShare = currentOptions.map(o => Math.max(1, Number(o.weight) || 1) / totalBaseWeight);
    const meanShare = 1 / n;
    const used = Array(n).fill(0);
    const lastSeen = Array(n).fill(-999);
    const fromTo = Array.from({ length: n }, () => Array(n).fill(0));
    const picks = [];

    for (let t = 0; t < count; t++){
      const weights = [];

      let lastA = -1;
      let lastB = -1;
      if (picks.length >= 1) lastA = picks[picks.length - 1];
      if (picks.length >= 2) lastB = picks[picks.length - 2];

      for (let i = 0; i < n; i++){
        // Regla dura: nunca más de 2 iguales seguidas.
        if (picks.length >= 2 && lastA === i && lastB === i){
          weights.push(0);
          continue;
        }

        const distance = t - lastSeen[i];

        // Enfriamiento: recién usada => menos probabilidad temporal.
        let cooldown = 1;
        if (distance <= 1) cooldown = 0.32;
        else if (distance === 2) cooldown = 0.58;
        else if (distance === 3) cooldown = 0.82;

        // Bonus de ausencia: sube gradualmente si no sale hace tiempo.
        const absenceBonus = 1 + 0.08 * clamp(distance - 1, 0, 9);

        // Balance global: compensa opciones infra/sobre-representadas
        // respecto a su cuota objetivo según peso.
        const expected = t * targetShare[i];
        const deficit = expected - used[i];
        const balance = clamp(Math.exp(0.42 * deficit), 0.55, 1.95);

        // Peso base relativo de cada opción (preferencia del usuario).
        const base = clamp(targetShare[i] / meanShare, 0.35, 2.5);

        // Penaliza repetir de forma excesiva la misma transición A->B.
        let transitionPenalty = 1;
        if (lastA !== -1){
          const row = fromTo[lastA];
          const rowTotal = row.reduce((s, v) => s + v, 0);
          const rowMean = rowTotal > 0 ? rowTotal / n : 0;
          const thisEdge = row[i];
          if (thisEdge > rowMean){
            transitionPenalty = 1 / (1 + 0.35 * (thisEdge - rowMean));
          }
        }

        // Anti-patrones: reduce ciclos cortos como ABAB o ABCABC.
        let patternPenalty = 1;
        if (picks.length >= 3){
          const p0 = picks[picks.length - 1];
          const p1 = picks[picks.length - 2];
          const p2 = picks[picks.length - 3];
          if (i === p1 && p0 === p2){
            patternPenalty *= 0.52; // tendencia a ABAB
          }
        }
        if (picks.length >= 5){
          const a = picks[picks.length - 5];
          const b = picks[picks.length - 4];
          const c = picks[picks.length - 3];
          const d = picks[picks.length - 2];
          const e = picks[picks.length - 1];
          if (d === a && e === b && i === c){
            patternPenalty *= 0.58; // tendencia a ABCABC
          }
        }

        // Pequeño ruido para evitar fronteras deterministas.
        const jitter = 0.92 + randomFloat() * 0.16;

        const w = base * cooldown * absenceBonus * balance * transitionPenalty * patternPenalty * jitter;
        weights.push(Math.max(0.00001, w));
      }

      const sumW = weights.reduce((s, v) => s + v, 0);
      let r = randomFloat() * sumW;
      let selected = 0;
      for (let i = 0; i < n; i++){
        r -= weights[i];
        if (r <= 0){
          selected = i;
          break;
        }
      }

      picks.push(selected);
      used[selected] += 1;
      if (lastA !== -1){
        fromTo[lastA][selected] += 1;
      }
      lastSeen[selected] = t;
    }

    return picks.map(i => currentOptions[i]);
  }

  function spin(){
    if (spinning) return;
    if (options.length < 2 || totalWeight() <= 0){
      statusLine.textContent = 'Agrega al menos 2 opciones para girar.';
      return;
    }
    spinning = true;
    updateSpinAvailability();
    statusLine.textContent = 'Girando…';

    const results = generateSmartPenaltySequence(RESULT_COUNT);
    const winner = results[0];
    const angle = pickAngleForOption(winner);
    const targetEffective = (360 - angle) % 360;
    const currentEffective = ((totalRotation % 360) + 360) % 360;
    let delta = (targetEffective - currentEffective + 360) % 360;
    const extraSpins = 5 + Math.floor(randomFloat() * 3); // 5-7 full turns
    totalRotation += delta + extraSpins * 360;

    wheelRot.style.transform = 'rotate(' + totalRotation + 'deg)';

    const onEnd = (e) => {
      if (e.propertyName !== 'transform') return;
      wheelRot.removeEventListener('transitionend', onEnd);
      spinning = false;
      updateSpinAvailability();
      statusLine.textContent = '';
      showResults(results);
    };
    wheelRot.addEventListener('transitionend', onEnd);
  }

  function showResults(results){
    resultsList.innerHTML = '';
    results.forEach((o, i) => {
      const li = document.createElement('li');
      if (i === 0) li.className = 'first';
      const num = document.createElement('span');
      num.className = 'rnum';
      num.textContent = String(i + 1);
      const text = document.createElement('span');
      text.className = 'rtext';
      text.textContent = o.text || '(sin texto)';
      li.appendChild(num);
      li.appendChild(text);
      resultsList.appendChild(li);
    });

    const counts = {};
    results.forEach(o => {
      const key = o.text || '(sin texto)';
      counts[key] = (counts[key] || 0) + 1;
    });
    resultsSummary.textContent = 'Conteo: ' + Object.entries(counts)
      .map(([k, v]) => k + ' ×' + v)
      .join('  ·  ');

    overlay.classList.add('show');
    againBtn.focus();
  }

  function closeResult(){
    overlay.classList.remove('show');
    hubBtn.focus();
  }

  addBtn.addEventListener('click', () => {
    options.push({ id: nextId++, text: 'Nueva opción', weight: 1 });
    renderList();
    renderWheel();
  });

  eqBtn.addEventListener('click', () => {
    options.forEach(o => o.weight = 1);
    renderList();
    renderWheel();
  });

  spinBtn.addEventListener('click', spin);
  hubBtn.addEventListener('click', spin);
  hubBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); spin(); }
  });

  closeBtn.addEventListener('click', closeResult);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeResult(); });
  againBtn.addEventListener('click', () => { closeResult(); spin(); });

  window.addEventListener('resize', positionBulbs);

  renderList();
  renderWheel();
  buildBulbs();
})();
