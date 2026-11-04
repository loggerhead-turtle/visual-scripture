// Loaded as a plain (non-module) script before the app: keeps the menu usable
// and the page self-diagnosing even if the module app fails to load. Lives in
// its own file rather than inline so the Content-Security-Policy can be
// script-src 'self' with no 'unsafe-inline'.
(function () {
  var nav = document.getElementById('mainnav');
  document.getElementById('navtoggle').addEventListener('click', function () { nav.classList.toggle('open'); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('open'); });

  var errs = [];
  function show() {
    var v = document.getElementById('view');
    var d = document.getElementById('vs-diag');
    if (!d) {
      d = document.createElement('div');
      d.id = 'vs-diag';
      d.style.cssText = 'max-width:760px;margin:40px auto;padding:18px 22px;border:1px solid #b8524f;border-radius:12px;color:#ece4d2;font:14px/1.6 sans-serif;background:#2a1a18;word-break:break-word';
      v.appendChild(d);
    }
    d.textContent = '';
    var strong = document.createElement('strong');
    strong.textContent = 'The app failed to start.';
    d.appendChild(strong);
    errs.forEach(function (m) {
      d.appendChild(document.createElement('br'));
      d.appendChild(document.createTextNode('• ' + m));
    });
    d.appendChild(document.createElement('br'));
    d.appendChild(document.createElement('br'));
    d.appendChild(document.createTextNode('If a file above shows a 404, the deployment is missing files or building from the wrong branch. ' +
      'If it mentions a syntax error, the browser may be outdated.'));
  }
  window.addEventListener('error', function (e) {
    if (e.target && e.target !== window && (e.target.src || e.target.href)) errs.push('Failed to load: ' + (e.target.src || e.target.href));
    else if (e.message) errs.push(e.message + (e.filename ? ' — ' + e.filename + ':' + e.lineno : ''));
    else return;
    show();
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    errs.push('Unhandled promise rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
    show();
  });
  window.addEventListener('load', function () {
    setTimeout(function () {
      var v = document.getElementById('view');
      if (v && !v.querySelector(':scope > :not(noscript):not(#vs-diag)') && !errs.length) {
        errs.push('No error was reported, but the app never rendered. The browser may not support JavaScript modules, or scripts are being blocked (content blocker / privacy mode).');
        show();
      }
    }, 3000);
  });
})();
