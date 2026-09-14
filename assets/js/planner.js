// Finch AI project planner.
// Live mode: POSTs to the form's data-endpoint (a server that holds the
// Anthropic credentials) and renders Claude's structured plan.
// Offline preview: if no endpoint answers — GitHub Pages, the single-file
// bundle, no API key — it builds a plan from the site's own content.
// The badge on every plan says which one produced it. All model text is
// inserted with textContent, never as HTML.
(function () {
  var STORE = 'finch-plan';
  var CFG = null;

  function config() {
    if (CFG) return CFG;
    var node = document.getElementById('planner-data');
    try { CFG = node ? JSON.parse(node.textContent) : null; } catch (e) { CFG = null; }
    return CFG;
  }

  // Page links become hash routes inside the single-file bundle.
  function link(href) {
    if (!window.FINCH_BUNDLE) return href;
    var m = /^([\w-]+)\.html(?:#([\w-]+))?$/.exec(href);
    if (!m) return href;
    return '#' + (m[1] === 'index' ? 'home' : m[1]) + (m[2] ? '/' + m[2] : '');
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function uniquePush(list, item, key) {
    for (var i = 0; i < list.length; i++) if (list[i][key] === item[key]) return;
    list.push(item);
  }

  // --- offline preview plan ------------------------------------------------
  function offlinePlan(input) {
    var c = config();
    var text = (' ' + input.description + ' ').toLowerCase();
    var matched = Object.keys(c.tags).filter(function (t) {
      return c.tags[t].keywords.some(function (k) { return text.indexOf(k) !== -1; });
    });
    if (/community|commercial/i.test(input.property) && matched.indexOf('commercial') === -1) matched.push('commercial');

    var services = [], products = [], ideas = [], questions = [];
    uniquePush(services, { key: 'design', why: 'Every Finch project starts with a plan drawn to scale, so the build matches what you approved.' }, 'key');
    matched.forEach(function (t) {
      var g = c.tags[t];
      g.services.forEach(function (key) { uniquePush(services, { key: key, why: g.why }, 'key'); });
      g.products.forEach(function (p) { uniquePush(products, p, 'name'); });
      g.ideas.forEach(function (i) { if (ideas.indexOf(i) === -1) ideas.push(i); });
      g.questions.forEach(function (q) { if (questions.indexOf(q) === -1) questions.push(q); });
    });
    c.defaultQuestions.forEach(function (q) { if (questions.length < 5 && questions.indexOf(q) === -1) questions.push(q); });

    var names = services.map(function (s) { return c.services[s.key].inline || c.services[s.key].name; });
    return {
      headline: matched.length ? 'Your starting plan' : 'Let’s start with a design conversation',
      summary: matched.length
        ? 'Based on what you described, Finch would bring together ' + names.slice(0, -1).join(', ') + (names.length > 1 ? ' and ' : '') + names[names.length - 1] + ' — designed as one space and built by one team.'
        : 'Your description doesn’t point to a specific service yet, so the best first step is a free on-site consultation and a design plan for the whole space.',
      services: services.slice(0, 5),
      products: products.slice(0, 3),
      ideas: ideas.slice(0, 5),
      budget_note: c.budgetNote,
      next_steps: c.nextSteps,
      consult_questions: questions.slice(0, 5),
    };
  }

  // --- rendering -----------------------------------------------------------
  function block(title) {
    var b = el('div', 'plan__block');
    b.appendChild(el('h4', 'plan__h', title));
    return b;
  }

  function list(tag, items, fn) {
    var l = el(tag, 'plan__list');
    items.forEach(function (it) { l.appendChild(fn(it)); });
    return l;
  }

  function render(out, plan, input, mode, note) {
    var c = config();
    out.textContent = '';
    var wrap = el('div', 'plan');

    // ai: written by Claude · offline: an endpoint exists but did not answer ·
    // instant: this build has no AI endpoint, so the instant plan is the feature.
    var badge = mode === 'ai' ? 'AI plan · written by Claude' : mode === 'offline' ? 'Instant plan · offline preview' : 'Instant plan';
    if (mode === 'ai') document.querySelectorAll('.planner__mode').forEach(function (n) { n.hidden = true; });
    var head = el('div', 'plan__head');
    head.appendChild(el('span', 'plan__badge' + (mode === 'ai' ? ' plan__badge--ai' : ''), badge));
    head.appendChild(el('h3', 'plan__title', plan.headline));
    head.appendChild(el('p', 'plan__summary', plan.summary));
    if (note) head.appendChild(el('p', 'plan__note', note));
    wrap.appendChild(head);

    var grid = el('div', 'plan__grid');

    var svc = block('Recommended services');
    svc.appendChild(list('ul', plan.services.filter(function (s) { return c.services[s.key]; }), function (s) {
      var li = el('li', 'plan__svc');
      var a = el('a', 'plan__svc-name', c.services[s.key].name);
      a.href = link(c.services[s.key].href);
      li.appendChild(a);
      li.appendChild(el('span', 'plan__svc-why', s.why));
      return li;
    }));
    grid.appendChild(svc);

    if (plan.products && plan.products.length) {
      var prod = block('Products that fit');
      prod.appendChild(list('ul', plan.products, function (p) {
        var li = el('li', 'plan__svc');
        li.appendChild(el('span', 'plan__svc-name', p.name));
        li.appendChild(el('span', 'plan__svc-why', p.why));
        return li;
      }));
      grid.appendChild(prod);
    }

    if (plan.ideas && plan.ideas.length) {
      var ideas = block('Ideas for your space');
      ideas.appendChild(list('ul', plan.ideas, function (i) { return el('li', null, i); }));
      grid.appendChild(ideas);
    }

    var cost = block('What it costs to start');
    cost.appendChild(el('p', null, plan.budget_note));
    grid.appendChild(cost);

    var steps = block('How it would go');
    steps.appendChild(list('ol', plan.next_steps, function (s) { return el('li', null, s); }));
    grid.appendChild(steps);

    var qs = block('Finch will ask you');
    qs.appendChild(list('ul', plan.consult_questions, function (q) { return el('li', null, q); }));
    grid.appendChild(qs);

    wrap.appendChild(grid);

    var actions = el('div', 'plan__actions');
    var send = el('a', 'btn btn--lg', 'Send this plan to Finch');
    send.href = link('contact.html');
    send.addEventListener('click', function () { save(plan, input, mode); });
    var again = el('button', 'btn btn--ghost btn--lg', 'Start over');
    again.type = 'button';
    again.addEventListener('click', function () {
      out.hidden = true; out.textContent = '';
      var ta = document.getElementById('planner-input');
      if (ta) { ta.focus(); ta.scrollIntoView({ block: 'center' }); }
    });
    actions.appendChild(send);
    actions.appendChild(again);
    wrap.appendChild(actions);
    wrap.appendChild(el('p', 'plan__disclaimer', c.disclaimer));

    out.appendChild(wrap);
    out.hidden = false;
  }

  function loading(out) {
    out.textContent = '';
    var box = el('div', 'plan plan--loading');
    box.setAttribute('role', 'status');
    box.appendChild(el('span', 'plan__badge', 'Planning'));
    box.appendChild(el('h3', 'plan__title', 'Designing your plan…'));
    var steps = ['Reading your description', 'Matching Finch services and products', 'Drafting ideas for Texas conditions'];
    var ul = el('ul', 'plan__progress');
    steps.forEach(function (s) { ul.appendChild(el('li', null, s)); });
    box.appendChild(ul);
    out.appendChild(box);
    out.hidden = false;
  }

  // --- hand-off to the contact form ----------------------------------------
  function planText(plan, input) {
    var c = config();
    var lines = ['Project description: ' + input.description];
    if (input.city) lines.push('Location: ' + input.city);
    lines.push('Property: ' + input.property, '', plan.headline, plan.summary, '', 'Services: ' +
      plan.services.map(function (s) { return c.services[s.key] ? c.services[s.key].name : s.key; }).join(', '));
    if (plan.products.length) lines.push('Products: ' + plan.products.map(function (p) { return p.name; }).join(', '));
    return lines.join('\n');
  }

  function save(plan, input, mode) {
    try { sessionStorage.setItem(STORE, JSON.stringify({ plan: plan, input: input, mode: mode })); } catch (e) { /* storage blocked: the form still works empty */ }
  }

  function prefill(root) {
    var form = root.querySelector ? root.querySelector('#project-form') : null;
    if (!form || form.dataset.prefilled) return;
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(STORE) || 'null'); } catch (e) { saved = null; }
    if (!saved || !saved.plan) return;
    var c = config();
    form.dataset.prefilled = '1';
    var msg = form.querySelector('#message');
    if (msg && !msg.value) msg.value = planText(saved.plan, saved.input);
    var city = form.querySelector('#city');
    if (city && !city.value && saved.input.city) city.value = saved.input.city;
    if (c) {
      saved.plan.services.forEach(function (s) {
        var label = c.interestFor[s.key];
        form.querySelectorAll('input[name="interest"]').forEach(function (box) { if (box.value === label) box.checked = true; });
      });
    }
    var notice = el('p', 'plan-attached', 'Your project plan is attached below — add anything else, then send.');
    form.insertBefore(notice, form.firstChild);
  }

  // --- wiring --------------------------------------------------------------
  function init(root) {
    root = root || document;
    prefill(root);
    var form = root.querySelector ? root.querySelector('#planner-form') : null;
    if (!form || form.dataset.bound || !config()) return;
    form.dataset.bound = '1';
    var out = document.getElementById('planner-out');
    var input = form.querySelector('#planner-input');

    // Tap-to-add elements write one sentence into the description; anything the
    // visitor typed themselves is kept.
    var picks = [].slice.call(form.querySelectorAll('.pick'));
    var generated = '';
    var joinList = function (list) { return list.length < 2 ? list.join('') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; };
    var compose = function () {
      var chosen = picks.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; }).map(function (p) { return p.getAttribute('data-phrase'); });
      var own = input.value;
      if (generated && own.indexOf(generated) !== -1) own = own.replace(generated, '');
      own = own.trim();
      generated = chosen.length ? 'We would like ' + joinList(chosen) + '.' : '';
      input.value = own && generated ? own + ' ' + generated : own || generated;
    };
    picks.forEach(function (pick) {
      pick.addEventListener('click', function () {
        pick.setAttribute('aria-pressed', String(pick.getAttribute('aria-pressed') !== 'true'));
        compose();
      });
    });

    form.querySelectorAll('[data-example]').forEach(function (chip) {
      // One tap on an example builds a plan straight away.
      chip.addEventListener('click', function () {
        picks.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); });
        generated = '';
        input.value = chip.getAttribute('data-example');
        if (form.requestSubmit) form.requestSubmit(); else input.focus();
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var data = {
        description: input.value.trim(),
        city: (form.querySelector('#planner-city') || {}).value || '',
        property: (form.querySelector('#planner-property') || {}).value || 'Home',
      };
      if (data.description.length < 8) { input.setCustomValidity('Tell us a little more about the space.'); form.reportValidity(); input.setCustomValidity(''); return; }
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      loading(out);
      out.scrollIntoView({ block: 'nearest' });

      var endpoint = form.getAttribute('data-endpoint');
      var done = function (plan, mode, note) { button.disabled = false; render(out, plan, data, mode, note); };
      var offline = function (note) { done(offlinePlan(data), 'offline', note); };
      if (!endpoint) { done(offlinePlan(data), 'instant'); return; }
      if (!window.fetch || location.protocol === 'file:') { offline(); return; }

      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 60000);
      fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: ctrl ? ctrl.signal : undefined })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; }); })
        .then(function (r) {
          clearTimeout(timer);
          if (r.ok && r.body.plan) { done(r.body.plan, 'ai'); return; }
          var e = r.body.error;
          if (e === 'refused') offline('The AI planner couldn’t help with that description, so here’s an instant plan instead.');
          else if (e === 'not_configured' || !e) offline();
          else offline('The AI planner is busy right now, so here’s an instant plan instead.');
        })
        .catch(function () { clearTimeout(timer); offline(); });
    });
  }

  var prev = window.finchInit;
  window.finchInit = function (root) { if (prev) prev(root); init(root); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
  else init(document);
})();
