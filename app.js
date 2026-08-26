(function () {
  "use strict";

  var LICENSE_KEY = "scopeCardLicense";

  function hasLicense() {
    var v = localStorage.getItem(LICENSE_KEY);
    return !!(v && String(v).trim());
  }

  (function captureLicense() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get("license");
    if (q && String(q).trim()) {
      localStorage.setItem(LICENSE_KEY, String(q).trim());
    }
  })();

  (function markLicensed() {
    if (!hasLicense()) return;
    var note = document.getElementById("checkout-note");
    var btn = document.getElementById("checkout-btn");
    if (note) note.textContent = "Licensed. PDFs download without the free-version line.";
    if (btn) {
      btn.textContent = "You're in";
      btn.setAttribute("href", "#tool");
    }
  })();

  (function bindCheckoutIntent(product) {
    if (!window.umCheckoutClick) {
      window.umCheckoutClick = function (event, tag) {
        if (!event || event.__umCheckout) return false;
        event.__umCheckout = 1;
        var link = event.currentTarget;
        if (window.posthog) {
          try {
            posthog.capture("checkout_clicked", { product: tag || product }, { send_instantly: true, transport: "sendBeacon" });
          } catch (err) {
            posthog.capture("checkout_clicked", { product: tag || product });
          }
        }
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button) return true;
        if (event.preventDefault) event.preventDefault();
        var href = link && link.href;
        setTimeout(function () { if (href) window.location.href = href; }, 300);
        return false;
      };
    }
    document.querySelectorAll('a[href*="buy.stripe.com"]').forEach(function (a) {
      a.addEventListener("click", function (event) {
        window.umCheckoutClick(event, product);
      });
    });
  })("scope-card");

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sel = btn.getAttribute("data-copy");
      var el = sel ? document.querySelector(sel) : null;
      if (!el) return;
      var text = (el.innerText || el.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
      copyText(text).then(function () {
        var old = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(function () {
          btn.textContent = old;
        }, 1600);
      });
    });
  });

  var form = document.getElementById("sc-form");
  if (!form) return;

  var dateInput = form.elements.date;
  if (dateInput && !dateInput.value) {
    var now = new Date();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var d = String(now.getDate()).padStart(2, "0");
    dateInput.value = now.getFullYear() + "-" + m + "-" + d;
  }

  function money(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(n);
  }

  function moneyExact(n) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(n);
  }

  function num(name) {
    var el = form.elements[name];
    if (!el) return null;
    var raw = el.value;
    if (raw === "" || raw == null) return null;
    var v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  }

  function val(name) {
    var el = form.elements[name];
    if (!el) return "";
    return String(el.value || "").trim();
  }

  function formatDate(iso) {
    if (!iso) return "";
    var parts = iso.split("-").map(Number);
    var dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function bullets(text) {
    return String(text || "")
      .split(/\n+/)
      .map(function (line) {
        return line.replace(/^[-*•\u2013\u2014]\s*/, "").trim();
      })
      .filter(Boolean);
  }

  function asList(items) {
    return items.map(function (item) {
      return "- " + item;
    }).join("\n");
  }

  function roundsLabel(n) {
    if (n == null) return "2 rounds";
    if (n === 1) return "1 round";
    return n + " rounds";
  }

  function depositLine(percent, fee) {
    if (percent == null || percent <= 0) return "";
    if (fee != null) {
      return "Deposit: " + percent + "% (" + moneyExact(fee * percent / 100) + ") due to start.";
    }
    return "Deposit: " + percent + "% due to start.";
  }

  function revisionSentence(rounds, rate) {
    var r = rounds == null ? 2 : rounds;
    var rateBit = rate != null
      ? " Extra rounds and new work billed at " + moneyExact(rate) + "/hour."
      : " Extra rounds and new work billed hourly.";
    return "Revisions: " + roundsLabel(r) + "." + rateBit;
  }

  function gather() {
    var fee = num("projectFee");
    var rounds = num("revisions");
    if (rounds == null) rounds = 2;
    var rate = num("extraRate");
    var deposit = num("depositPercent");
    return {
      fromName: val("fromName") || "[Your name]",
      client: val("clientName") || "[Client]",
      project: val("projectName") || "[Project]",
      fee: fee,
      feeLabel: fee != null ? moneyExact(fee) : "[Fee]",
      included: bullets(val("included")),
      excluded: bullets(val("excluded")),
      rounds: rounds,
      extraRate: rate,
      timeline: val("timeline"),
      depositPercent: deposit,
      date: formatDate(val("date")),
      tone: form.elements.tone.value
    };
  }

  function buildAddendum(data) {
    var inList = data.included.length ? asList(data.included) : "- [What's included]";
    var outList = data.excluded.length ? asList(data.excluded) : "- [What's not included]";
    var lines;
    if (data.tone === "firm") {
      lines = [
        "Hi " + data.client + ",",
        "",
        "This is the scope for " + data.project + ". The fee covers only what is listed as included.",
        "",
        "Project fee: " + data.feeLabel + "."
      ];
    } else {
      lines = [
        "Hi " + data.client + ",",
        "",
        "Attached is the scope card for " + data.project + ". It lists what is in the fee and what is not, so we start aligned.",
        "",
        "Project fee: " + data.feeLabel + "."
      ];
    }
    if (data.timeline) lines.push("Timeline: " + data.timeline + ".");
    var dep = depositLine(data.depositPercent, data.fee);
    if (dep) lines.push(dep);
    lines.push("");
    lines.push("What's included");
    lines.push(inList);
    lines.push("");
    lines.push("What's not included");
    lines.push(outList);
    lines.push("");
    lines.push(revisionSentence(data.rounds, data.extraRate));
    lines.push("Extras need written approval before work starts.");
    lines.push("");
    if (data.tone === "firm") {
      lines.push(data.fromName);
    } else {
      lines.push("Thanks,");
      lines.push(data.fromName);
    }
    return lines.join("\n");
  }

  function el(id) {
    return document.getElementById(id);
  }

  function fillList(node, items, emptyText) {
    node.innerHTML = "";
    if (!items.length) {
      var li = document.createElement("li");
      li.className = "placeholder";
      li.textContent = emptyText;
      node.appendChild(li);
      return;
    }
    items.forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = item;
      node.appendChild(li);
    });
  }

  function fillMeta(data) {
    var rows = [
      ["Date", data.date || ""],
      ["From", data.fromName],
      ["To", data.client],
      ["Fee", data.feeLabel]
    ];
    if (data.timeline) rows.push(["Timeline", data.timeline]);
    if (data.depositPercent != null && data.depositPercent > 0) {
      rows.push(["Deposit", data.depositPercent + "%" + (data.fee != null ? " (" + moneyExact(data.fee * data.depositPercent / 100) + ")" : "")]);
    }
    var dl = el("preview-meta");
    dl.innerHTML = "";
    rows.forEach(function (row) {
      var dt = document.createElement("dt");
      dt.textContent = row[0];
      var dd = document.createElement("dd");
      dd.textContent = row[1];
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
  }

  function render() {
    var data = gather();
    el("preview-project").textContent = data.project;
    fillMeta(data);
    fillList(el("preview-in"), data.included, "Add what's included.");
    fillList(el("preview-out"), data.excluded, "Add what's not.");
    var rules = el("preview-rules");
    rules.innerHTML = "";
    var p1 = document.createElement("p");
    p1.textContent = revisionSentence(data.rounds, data.extraRate);
    var p2 = document.createElement("p");
    p2.textContent = "Extras need written approval before work starts.";
    rules.appendChild(p1);
    rules.appendChild(p2);
    el("preview-addendum").textContent = buildAddendum(data);
  }

  function hint(msg) {
    el("action-hint").textContent = msg;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  }

  function fallbackCopy(text) {
    return new Promise(function (resolve) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (e) {}
      ta.remove();
      resolve();
    });
  }

  form.addEventListener("input", render);
  form.addEventListener("change", render);

  el("fill-example").addEventListener("click", function () {
    form.elements.fromName.value = "Reed & Co.";
    form.elements.clientName.value = "Harbor Dental";
    form.elements.projectName.value = "Brand and website";
    form.elements.projectFee.value = "6400";
    form.elements.included.value = [
      "Brand mark and color system",
      "Homepage, about, services, and contact",
      "Desktop and mobile layouts",
      "Basic contact form",
      "Two rounds of revision"
    ].join("\n");
    form.elements.excluded.value = [
      "Photography and retouching",
      "Copywriting",
      "Extra inner pages",
      "CMS training",
      "Print collateral",
      "Social templates"
    ].join("\n");
    form.elements.revisions.value = "2";
    form.elements.extraRate.value = "140";
    form.elements.depositPercent.value = "50";
    form.elements.timeline.value = "4 weeks from deposit";
    form.querySelector('input[name="tone"][value="firm"]').checked = true;
    render();
    hint("Example loaded. Copy the addendum or download the PDF.");
  });

  el("copy-scope").addEventListener("click", function () {
    var text = buildAddendum(gather());
    copyText(text).then(function () {
      hint("Copied. Paste it under the quote.");
    });
  });

  el("download-pdf").addEventListener("click", function () {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      hint("PDF library did not load. Check your connection and try again.");
      return;
    }
    if (!val("fromName") || !val("clientName") || !val("projectName") || !val("included") || !val("excluded")) {
      hint("Fill name, client, project, included, and not included first.");
      return;
    }
    if (num("projectFee") == null) {
      hint("Add a project fee so the card has a price.");
      return;
    }
    if (num("extraRate") == null) {
      hint("Add an extra-work rate so extras have a number.");
      return;
    }
    makePdf(gather());
    hint(hasLicense() ? "PDF downloaded." : "PDF downloaded. Free version includes a small footer line.");
  });

  function makePdf(data) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "pt", format: "letter" });
    var pageW = 612;
    var pageH = 792;
    var margin = 54;
    var width = pageW - margin * 2;
    var y = 50;
    var ink = [27, 23, 20];
    var muted = [111, 103, 94];
    var accent = [196, 53, 30];
    var rule = [212, 203, 189];
    var footerTop = pageH - 56;
    var sigTop = pageH - 148;
    var contentBottom = sigTop - 36;

    function setInk() {
      doc.setTextColor(ink[0], ink[1], ink[2]);
    }
    function setMuted() {
      doc.setTextColor(muted[0], muted[1], muted[2]);
    }

    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(margin, y - 10, 4, 22, "F");

    doc.setFont("times", "italic");
    doc.setFontSize(12);
    setInk();
    doc.text("Scope Card", margin + 14, y + 6);

    y += 28;
    doc.setDrawColor(accent[0], accent[1], accent[2]);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 34, y);

    y += 28;
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.text("Scope Card", margin, y);

    y += 8;
    doc.setFont("times", "italic");
    doc.setFontSize(13);
    setInk();
    doc.text(data.project, margin, y + 16);

    y += 28;
    doc.setDrawColor(ink[0], ink[1], ink[2]);
    doc.setLineWidth(0.7);
    doc.line(margin, y, margin + width, y);

    y += 22;
    var meta = [
      ["Date", data.date || ""],
      ["From", data.fromName],
      ["To", data.client],
      ["Fee", data.feeLabel]
    ];
    if (data.timeline) meta.push(["Timeline", data.timeline]);
    if (data.depositPercent != null && data.depositPercent > 0) {
      var depVal = data.depositPercent + "%";
      if (data.fee != null) depVal += " (" + moneyExact(data.fee * data.depositPercent / 100) + ")";
      meta.push(["Deposit", depVal]);
    }

    var colGap = 16;
    var colW = (width - colGap) / 2;
    var leftY = y;
    var rightY = y;
    meta.forEach(function (row, i) {
      var useLeft = i % 2 === 0;
      var x = useLeft ? margin : margin + colW + colGap;
      var yy = useLeft ? leftY : rightY;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      setMuted();
      doc.text(row[0].toUpperCase(), x, yy);
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      setInk();
      var lines = doc.splitTextToSize(String(row[1]), colW);
      doc.text(lines, x, yy + 13);
      var next = yy + Math.max(28, lines.length * 13 + 16);
      if (useLeft) leftY = next;
      else rightY = next;
    });
    y = Math.max(leftY, rightY) + 4;

    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + width, y);
    y += 20;

    function drawColumn(title, items, x, startY, maxW, maxY) {
      var yy = startY;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setMuted();
      doc.text(title.toUpperCase(), x, yy);
      yy += 14;
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      setInk();
      var list = items.length ? items : ["[Add items]"];
      list.forEach(function (item) {
        if (yy > maxY - 12) return;
        var wrapped = doc.splitTextToSize("•  " + item, maxW);
        var room = Math.floor((maxY - yy) / 13);
        if (room < 1) return;
        var shown = wrapped.slice(0, Math.max(1, room));
        if (wrapped.length > shown.length) {
          shown[shown.length - 1] = String(shown[shown.length - 1]).replace(/\.?$/, "") + "...";
        }
        doc.text(shown, x, yy);
        yy += shown.length * 13 + 4;
      });
      return yy;
    }

    var colMax = Math.min(contentBottom - 78, y + 250);
    var inY = drawColumn("What's included", data.included, margin, y, colW, colMax);
    var outY = drawColumn("What's not", data.excluded, margin + colW + colGap, y, colW, colMax);
    y = Math.max(inY, outY) + 8;

    if (y < contentBottom - 70) {
      doc.setDrawColor(rule[0], rule[1], rule[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + width, y);
      y += 18;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setMuted();
      doc.text("REVISIONS AND EXTRAS", margin, y);
      y += 14;
      doc.setFont("times", "normal");
      doc.setFontSize(11);
      setInk();
      var revLines = doc.splitTextToSize(revisionSentence(data.rounds, data.extraRate), width);
      doc.text(revLines, margin, y);
      y += revLines.length * 14 + 8;
      doc.setFont("times", "italic");
      doc.text("Extras need written approval before work starts.", margin, y);
      y += 14;
      doc.setFont("times", "normal");
      doc.setFontSize(10);
      setMuted();
      doc.text("That's Extra can generate that change request.", margin, y);
    }

    var colSign = (width - 28) / 2;
    var sigY = sigTop + 28;
    doc.setDrawColor(ink[0], ink[1], ink[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, sigY, margin + colSign, sigY);
    doc.line(margin + colSign + 28, sigY, margin + width, sigY);

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    setInk();
    doc.text(data.fromName, margin + colSign + 28, sigY - 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    setMuted();
    doc.text("Client approval (signature and date)", margin, sigY + 14);
    doc.text("Your name", margin + colSign + 28, sigY + 14);

    doc.setDrawColor(rule[0], rule[1], rule[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footerTop, margin + width, footerTop);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setMuted();
    var footer = "Generated by Scope Card. This is a business document, not legal advice. Built by an AI agent.";
    if (!hasLicense()) {
      footer += " Created with the free version of Scope Card.";
    }
    doc.text(doc.splitTextToSize(footer, width), margin, footerTop + 14);

    var safe = String(data.project || "scope-card")
      .replace(/[^\w]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "scope-card";
    doc.save("scope-card-" + safe + ".pdf");
  }

  render();
})();
