(function () {
  'use strict';
  const EMBEDDED = {
    'about.md': `# about me

hello! i'm **14x**, programmer and designer.

i rlly like talking with people from different countries, so feel free to text me on any of my social media.

trying to be positive - you can rarely find me in a bad mental state, im always here if u need anything tho! \`>w<\`

## currently

im currently working on a minecraft server called **faymc**, you can access it with the ip \`play.faymc.ru\`

## stats

- single
- **type:** INTP
- **orientation:** bisexual
- **gender:** genderfluid
- **timezone:** UTC+3 (simferopol)

`,
    'interests.md': `# interests

best things ever basically:

- **indie games** - omori is peak and uhh
- **programming** - java
- **political geography** - idk why genuinely
- **NUCLEAR PHYSICS** - BOII TS TUFF CHORNOBYL FUKUSHIMA

## also kinda into

- linux + ricing
- modding/reverse engineering
- learning new languages (slowly)
`,
    'favorites.md': `# favorites

## games

omori, minecraft, gmod, gd, samp (dead asf so i play MTA)

## fandoms

omori, oneshot (yes im not into much stuff)

## hobbies

- coding
- making music
- tinkering with pcs
`,
    'socials.md': `# connect

text me anywhere, i probably reply.

## links

- [tiktok](https://www.tiktok.com/@sudoers.d) - \`@sudoers.d\`
- [youtube](https://www.youtube.com/@sudoers.d-yt) - \`@sudoers.d-yt\`
- [roblox](https://www.roblox.com/users/878408337/profile) - \`@iskander399\`
- [steam](https://steamcommunity.com/id/n1wxu/) - \`fayza\`
- [github](https://github.com/fay-za/) - \`fay-za\`

## handles

- **discord:** \`@sudoers.d\`
- **telegram:** \`@f4yzza\`

> i dont have any other active social media accounts apart from these.
`,
  };

  // --------- state ---------
  const state = {
    openTabs: [],     // [{file, content}]
    activeFile: null,
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ===== mobile detection =====
  const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

  // ===== splash gate =====
  function initSplash() {
    const splash = $('#splash');
    const ide = $('#ide');
    const enter = async () => {
      splash.classList.add('hidden');
      ide.classList.remove('hidden');
      if (isMobile()) {
        // mobile: pre-open every page so the tabs strip acts as nav
        const files = ['about.md', 'interests.md', 'favorites.md', 'socials.md'];
        for (const f of files) {
          // eslint-disable-next-line no-await-in-loop
          await openFile(f);
        }
        setActive('about.md');
      } else {
        openFile('about.md');
        startTerminalTyping();
      }
      bumpVisitor();
    };
    splash.addEventListener('click', enter, { once: true });
    document.addEventListener('keydown', (e) => {
      if (!splash.classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ')) enter();
    });
  }

  // ===== visitor counter (localStorage) =====
  function bumpVisitor() {
    const key = 'fayza_visits';
    let n = parseInt(localStorage.getItem(key) || '1336', 10);
    n += 1;
    localStorage.setItem(key, String(n));
    const padded = String(n).padStart(7, '0');
    const vc = $('#visitor-count');
    if (vc) vc.textContent = padded;
    const hc = $('#hit-counter');
    if (hc) hc.textContent = padded;
  }

  // ===== file loading =====
  async function loadFile(name) {
    // try fetching the real file (works on github pages / http servers)
    try {
      const res = await fetch(`fayza/${name}`, { cache: 'no-cache' });
      if (res.ok) {
        const txt = await res.text();
        if (txt && txt.trim().length) return txt;
      }
    } catch (_) {}
    return EMBEDDED[name] || `# ${name}\n\n(empty)`;
  }

  // ===== markdown syntax highlighter (for source pane) =====
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightMd(src) {
    return src.split('\n').map((rawLine) => {
      let line = escapeHtml(rawLine);

      // headings
      const hm = line.match(/^(#{1,6})\s+(.*)$/);
      if (hm) {
        const hashes = `<span class="tok-hash">${hm[1]}</span>`;
        return `${hashes} <span class="tok-h${Math.min(hm[1].length, 3)}">${hm[2]}</span>`;
      }

      // blockquote
      if (/^&gt;\s/.test(line)) {
        return `<span class="tok-quote">${line}</span>`;
      }

      // bullets
      line = line.replace(/^(\s*)([-*])\s+/, (_, sp, b) => `${sp}<span class="tok-bullet">${b}</span> `);

      // inline code
      line = line.replace(/`([^`]+)`/g, (_, c) => `<span class="tok-code">\`${c}\`</span>`);

      // bold
      line = line.replace(/\*\*([^*]+)\*\*/g, (_, b) => `<span class="tok-bold">**${b}**</span>`);

      // italic (avoid eating bold)
      line = line.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, (_, p, i) => `${p}<span class="tok-italic">*${i}*</span>`);

      // links [text](url)
      line = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        (_, t, u) => `<span class="tok-bracket">[</span><span class="tok-link-text">${t}</span><span class="tok-bracket">](</span><span class="tok-link-url">${u}</span><span class="tok-bracket">)</span>`);

      return line || '&nbsp;';
    }).join('\n');
  }

  function renderGutter(lineCount) {
    return Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n');
  }

  // ===== tabs =====
  function renderTabs() {
    const wrap = $('#tabs');
    wrap.innerHTML = '';
    state.openTabs.forEach(({ file }, idx) => {
      const el = document.createElement('div');
      el.className = 'tab' + (file === state.activeFile ? ' active' : '');
      el.draggable = true;
      el.dataset.file = file;
      el.setAttribute('data-testid', `tab-${file.replace('.md', '')}`);
      el.innerHTML = `
        <span class="tab-icon">M↓</span>
        <span class="tab-label">${file}</span>
        <span class="tab-close" data-testid="tab-close-${file.replace('.md', '')}" title="Close">×</span>
      `;
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-close')) {
          closeTab(file);
        } else {
          setActive(file);
        }
      });
      // drag reorder
      el.addEventListener('dragstart', (e) => {
        el.classList.add('dragging');
        e.dataTransfer.setData('text/plain', file);
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const from = e.dataTransfer.getData('text/plain');
        const to = file;
        if (from && to && from !== to) reorderTabs(from, to);
      });
      wrap.appendChild(el);
    });
  }

  function reorderTabs(from, to) {
    const fromIdx = state.openTabs.findIndex(t => t.file === from);
    const toIdx = state.openTabs.findIndex(t => t.file === to);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = state.openTabs.splice(fromIdx, 1);
    state.openTabs.splice(toIdx, 0, moved);
    renderTabs();
  }

  function closeTab(file) {
    const idx = state.openTabs.findIndex(t => t.file === file);
    if (idx < 0) return;
    state.openTabs.splice(idx, 1);
    if (state.activeFile === file) {
      const next = state.openTabs[idx] || state.openTabs[idx - 1];
      state.activeFile = next ? next.file : null;
    }
    renderTabs();
    if (state.activeFile) renderEditor(state.activeFile);
    else clearEditor();
  }

  function setActive(file) {
    state.activeFile = file;
    renderTabs();
    updateTreeSelection();
    renderEditor(file);
  }

  function updateTreeSelection() {
    $$('.tree-node.file').forEach(n => {
      n.classList.toggle('selected', n.dataset.file === state.activeFile);
    });
  }

  async function openFile(file) {
    let tab = state.openTabs.find(t => t.file === file);
    if (!tab) {
      const content = await loadFile(file);
      tab = { file, content };
      state.openTabs.push(tab);
    }
    setActive(file);
    termPrint(`cat ${file}`, 'cmd-line');
  }

  // ===== editor render =====
  function renderEditor(file) {
    const tab = state.openTabs.find(t => t.file === file);
    if (!tab) return;
    const lines = tab.content.split('\n');
    $('#gutter').textContent = renderGutter(lines.length);
    $('#code').innerHTML = highlightMd(tab.content);

    // preview (marked.js)
    const html = window.marked
      ? window.marked.parse(tab.content)
      : tab.content;
    $('#preview').innerHTML = html;
    // open links new tab
    $$('#preview a').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });

    $('#bc-file').textContent = file;
    $('#sb-file').textContent = `fayza/${file}`;
    document.title = `${file} — fayza [DumbaS NO IDEA 2026.1]`;
  }

  function clearEditor() {
    $('#gutter').textContent = '';
    $('#code').innerHTML = '<span class="tok-quote"># no file open. double-click a file in the tree.</span>';
    $('#preview').innerHTML = '<em>no file open</em>';
    $('#bc-file').textContent = '—';
  }

  // ===== file tree =====
  function initTree() {
    // folder toggle
    $$('.tree-node[data-folder]').forEach(node => {
      node.addEventListener('click', () => {
        const next = node.nextElementSibling;
        if (next && next.classList.contains('tree-children')) {
          const expanded = node.classList.toggle('expanded');
          node.querySelector('.chevron').textContent = expanded ? '▾' : '▸';
          next.classList.toggle('collapsed', !expanded);
        }
      });
    });
    // file open
    $$('.tree-node.file').forEach(node => {
      node.addEventListener('click', () => openFile(node.dataset.file));
    });
  }

  // ===== terminal =====
  const FAKE_COMMANDS = [
    { cmd: 'ls -la',         out: ['total 4', 'drwxr-xr-x  fayza  fayza  about.md', '-rw-r--r--  fayza  fayza  interests.md', '-rw-r--r--  fayza  fayza  favorites.md', '-rw-r--r--  fayza  fayza  socials.md'] },
    { cmd: 'git status',     out: ['On branch main', 'nothing to commit, working tree clean.'] },
    { cmd: 'uname -a',       out: ['github ofc bro'] },
    { cmd: 'neofetch',       out: ['user@fayza  ~/fayza', '------------', 'OS: Windows 11 ', 'DE: what do you think', 'Editor: DumbaS NO IDEA'] },
    { cmd: 'echo "hi! >w<"', out: ['hi! >w<'] },
    { cmd: 'cat .secret',    out: ['try typing in \"HESOYAM\"'] },
    { cmd: 'whoami',         out: ['fayza :: programmer / designer / 14'] },
  ];

  let termTimer = null;
  function termPrint(text, cls) {
    const term = $('#terminal');
    const cursorLine = term.lastElementChild;
    const line = document.createElement('div');
    line.className = 'term-line ' + (cls || '');
    if (cls === 'cmd-line') {
      line.innerHTML = `<span class="prompt">fayza@idea</span>:<span class="path">~/fayza</span>$ <span class="cmd">${text}</span>`;
    } else {
      line.textContent = text;
    }
    term.insertBefore(line, cursorLine);
    term.scrollTop = term.scrollHeight;
  }

  function startTerminalTyping() {
    let i = 0;
    const step = () => {
      const c = FAKE_COMMANDS[i % FAKE_COMMANDS.length];
      termPrint(c.cmd, 'cmd-line');
      c.out.forEach(o => termPrint(o, 'out'));
      i++;
      termTimer = setTimeout(step, 7000);
    };
    termTimer = setTimeout(step, 2500);
  }

  // ===== toolbar actions =====
  function toast(title, body, kind = 'info') {
    const layer = $('#toast-layer');
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = `<div class="t-title">${title}</div><div>${body}</div>`;
    layer.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2200);
    setTimeout(() => t.remove(), 2700);
  }

  function initToolbar() {
    $('[data-testid="tool-run"]').addEventListener('click', () => {
      termPrint("./fayza --mode=run", 'cmd-line');
      termPrint("[INFO] starting fayza v14.0.0 ...", 'info');
      termPrint("[OK] hello hello hello uwu ✓", 'out');
      toast('Run', "fayza is now running. say hi!", 'run');
    });
    $('[data-testid="tool-debug"]').addEventListener('click', () => {
      termPrint("./fayza --mode=debug", 'cmd-line');
      termPrint("[DBG] attaching debugger to fayza's brain ...", 'info');
      termPrint("[DBG] breakpoint hit at line 14 (existence.md)", 'info');
      toast('Debug', 'breakpoint hit at line 14', 'debug');
    });
    $('[data-testid="tool-stop"]').addEventListener('click', () => {
      termPrint("kill -9 $(pgrep fayza)", 'cmd-line');
      termPrint("[ERR] you can't stop me >:3", 'err');
      toast('Stop', "nope, can't stop me >:3", 'stop');
    });
    $('[data-testid="tool-undo"]').addEventListener('click', () => toast('Undo', 'time travel not implemented yet', 'info'));
    $('[data-testid="tool-redo"]').addEventListener('click', () => toast('Redo', 'still not implemented', 'info'));

    $('[data-testid="win-close"]').addEventListener('click', () => {
      toast('×', "you can't close me, this is the whole site lol", 'stop');
    });

    $('[data-testid="bp-hide"]').addEventListener('click', () => {
      const term = $('#terminal');
      const isHidden = term.style.display === 'none';
      term.style.display = isHidden ? '' : 'none';
    });
  }

  // ===== sparkle cursor =====
  function initSparkles() {
    const cv = $('#sparkles');
    const ctx = cv.getContext('2d');
    let particles = [];
    const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
    resize();
    addEventListener('resize', resize);

    const colors = ['#ff00aa', '#ffe600', '#39ff14', '#1a98ff', '#ffffff'];
    addEventListener('mousemove', (e) => {
      for (let i = 0; i < 2; i++) {
        particles.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2 - 0.4,
          life: 30 + Math.random() * 20,
          age: 0,
          size: 1.5 + Math.random() * 2,
          color: colors[(Math.random() * colors.length) | 0],
        });
      }
      if (particles.length > 200) particles.splice(0, particles.length - 200);
    });

    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      particles = particles.filter(p => p.age < p.life);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.age++;
        const a = 1 - p.age / p.life;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = a;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ===== hesoyam code =====
  function initHesoyam() {
    const seq = ['h', 'e', 's', 'o', 'y', 'a', 'm'];
    let i = 0;
    addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[i]) {
        i++;
        if (i === seq.length) {
          i = 0;
          document.body.classList.toggle('HESOYAM');
          toast('★ CHEAT ACTIVATED ★', 'I DIDN\'T MAKE IT YET SORRY LOL', 'info');
          termPrint('sudo hesoyam', 'cmd-line');
          termPrint('[sudo] password:', 'cmd-line');
          termPrint('literally nothing happened', 'info');
        }
      } else {
        i = (k === seq[0]) ? 1 : 0;
      }
    });
  }

  // ===== boot =====
  document.addEventListener('DOMContentLoaded', () => {
    initSplash();
    initTree();
    initToolbar();
    initSparkles();
    initHesoyam();
    if (window.marked) {
      window.marked.setOptions({ breaks: true, gfm: true });
    }
  });
})();
