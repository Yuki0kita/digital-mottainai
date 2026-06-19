const views = {
  home: document.querySelector("#home-view"),
  diagnosis: document.querySelector("#diagnosis-view"),
  ledger: document.querySelector("#ledger-view"),
  support: document.querySelector("#support-view"),
  security: document.querySelector("#security-view"),
};

const contactDialog = document.querySelector("#contact-dialog");
const diagnosisForm = document.querySelector("#diagnosis-form");
const toast = document.querySelector("#toast");
let currentStep = 1;
let toastTimer;

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP").format(value);
}

function setActiveView(name, options = {}) {
  const target = views[name] || views.home;
  Object.values(views).forEach((view) => view.classList.remove("is-visible"));
  target.classList.add("is-visible");

  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.viewLink === name);
  });

  if (!options.keepHash) {
    const nextHash = name === "home" ? "#home" : `#${name}`;
    history.replaceState(null, "", nextHash);
  }

  document.title = name === "home"
    ? "くらしDXサポート｜デジタル家計診断"
    : `${target.querySelector("h1, h2")?.textContent.trim() || "くらしDXサポート"}｜くらしDXサポート`;

  window.scrollTo({ top: 0, behavior: options.instant ? "auto" : "smooth" });
}

function setStep(step) {
  currentStep = step;
  diagnosisForm.querySelectorAll("[data-step]").forEach((panel) => {
    panel.classList.toggle("is-active", Number(panel.dataset.step) === step);
  });
  document.querySelectorAll("[data-step-indicator]").forEach((indicator) => {
    const indicatorStep = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle("is-current", indicatorStep === step);
    indicator.classList.toggle("is-complete", indicatorStep < step);
  });
  document.querySelector(".diagnosis-main").scrollIntoView({ block: "start", behavior: "smooth" });
}

function startDiagnosis(service) {
  setActiveView("diagnosis");
  if (service) {
    document.querySelectorAll('input[name="concerns"]').forEach((input) => {
      input.checked = input.value === service || (service === "phone" && input.value === "subscription");
    });
  }
  setStep(1);
}

function showToast(title, message, type = "success") {
  const icon = toast.querySelector("span");
  icon.textContent = type === "success" ? "✓" : "!";
  toast.querySelector("strong").textContent = title;
  toast.querySelector("small").textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 4200);
}

function openContact() {
  if (typeof contactDialog.showModal === "function") {
    contactDialog.showModal();
    setTimeout(() => document.querySelector("#contact-method").focus(), 50);
  }
}

function calculateDiagnosis() {
  const concerns = [...document.querySelectorAll('input[name="concerns"]:checked')].map((input) => input.value);
  const phoneCost = Number(document.querySelector("#phone-cost").value) || 0;
  const carrier = document.querySelector("#carrier").value;
  const targetByCarrier = { major: 6900, sub: 5500, mvno: 3500, unknown: 6900 };
  const monthlyPhoneSaving = concerns.includes("phone") ? Math.max(0, phoneCost - targetByCarrier[carrier]) : 0;
  const phoneSaving = Math.round((monthlyPhoneSaving * 12) / 100) * 100;

  const selectedSubscriptions = [...document.querySelectorAll("#subscription-list input:checked")];
  const subscriptionTotal = selectedSubscriptions.reduce((sum, input) => sum + Number(input.value), 0);
  const monthlySubscriptionSaving = concerns.includes("subscription")
    ? Math.round((subscriptionTotal * 0.25) / 100) * 100
    : 0;
  const subscriptionSaving = monthlySubscriptionSaving * 12;
  const totalSaving = phoneSaving + subscriptionSaving;

  document.querySelector("#result-saving").textContent = formatNumber(totalSaving);
  document.querySelector("#monthly-saving").textContent = formatNumber(Math.round(totalSaving / 12));
  setSavingValue("#phone-saving", phoneSaving);
  setSavingValue("#sub-saving", subscriptionSaving);
  document.querySelector("#phone-advice").textContent = phoneSaving > 0 ? "使い方に合う割安プランへの変更を検討" : "現在の料金はすでに適正な範囲です";
  document.querySelector("#sub-advice").textContent = subscriptionSaving > 0 ? `利用頻度の低いサービスを${Math.max(1, Math.round(selectedSubscriptions.length * 0.25))}件整理` : "現在の契約をそのまま活用できます";
  document.querySelector("#hero-saving").textContent = formatNumber(totalSaving);

  return totalSaving;
}

function setSavingValue(selector, value) {
  const container = document.querySelector(selector);
  const suffix = document.createElement("small");
  suffix.textContent = "/ 年";
  container.replaceChildren(document.createTextNode(`¥${formatNumber(value)}`), suffix);
}

document.querySelectorAll("[data-view-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setActiveView(link.dataset.viewLink);
  });
});

document.querySelectorAll("[data-view-link-button]").forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.viewLinkButton));
});

document.querySelectorAll("[data-service]").forEach((button) => {
  button.addEventListener("click", () => {
    const service = button.dataset.service;
    if (service === "ai" || service === "trouble") {
      setActiveView("support");
      showToast(
        service === "ai" ? "AI活用相談をご案内します" : "お困りごとをお聞かせください",
        "電話・訪問・LINEから相談方法を選べます。",
        "success",
      );
      return;
    }
    startDiagnosis(service);
  });
});

document.querySelectorAll('[data-action="start-diagnosis"]').forEach((button) => {
  button.addEventListener("click", () => startDiagnosis());
});

document.querySelectorAll('[data-action="back-home"]').forEach((button) => {
  button.addEventListener("click", () => setActiveView("home"));
});

document.querySelectorAll('[data-action="open-contact"]').forEach((button) => {
  button.addEventListener("click", openContact);
});

document.querySelector('[data-action="next-step"]').addEventListener("click", () => {
  const selected = [...document.querySelectorAll('input[name="concerns"]:checked')].map((input) => input.value);
  if (!selected.length) {
    showToast("項目を選んでください", "気になることを1つ以上選ぶと次へ進めます。", "error");
    return;
  }
  if (!selected.some((value) => value === "phone" || value === "subscription")) {
    setActiveView("support");
    showToast("相談メニューをご案内します", "AIやスマホ・PCのお悩みは、スタッフが直接お聞きします。", "success");
    return;
  }
  setStep(2);
});

document.querySelector('[data-action="prev-step"]').addEventListener("click", () => setStep(1));
document.querySelector('[data-action="restart-diagnosis"]').addEventListener("click", () => setStep(1));

diagnosisForm.addEventListener("submit", (event) => {
  event.preventDefault();
  calculateDiagnosis();
  setStep(3);
});

document.querySelectorAll('[data-action="print-report"]').forEach((button) => {
  button.addEventListener("click", () => {
    showToast("レポートを開きます", "印刷画面からPDFとして保存できます。", "success");
    setTimeout(() => window.print(), 350);
  });
});

document.querySelector('[data-action="call"]').addEventListener("click", () => {
  showToast("お電話で受け付けています", "0120-123-889（9:00〜18:00）", "success");
});

document.querySelector('[data-action="line"]').addEventListener("click", () => {
  showToast("LINE相談の準備ができました", "実サービスでは友だち追加画面へ移動します。", "success");
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const phone = document.querySelector("#contact-phone");
  const consent = document.querySelector("#privacy-consent");
  if (!phone.validity.valid) {
    phone.focus();
    showToast("電話番号をご確認ください", "10〜20文字の数字・記号で入力してください。", "error");
    return;
  }
  if (!consent.checked) {
    consent.focus();
    showToast("確認へのチェックが必要です", "データの利用目的をご確認ください。", "error");
    return;
  }
  contactDialog.close();
  showToast("入力内容を確認しました（デモ）", "データは送信・保存されていません。", "success");
  event.currentTarget.reset();
});

contactDialog.addEventListener("click", (event) => {
  const bounds = contactDialog.getBoundingClientRect();
  const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
  if (!inside) contactDialog.close();
});

contactDialog.addEventListener("close", () => {
  document.querySelector("#contact-form").reset();
});

window.addEventListener("hashchange", () => {
  const name = location.hash.replace("#", "");
  if (name && views[name]) setActiveView(name, { keepHash: true });
});

const initialView = location.hash.replace("#", "");
setActiveView(views[initialView] ? initialView : "home", { keepHash: true, instant: true });

try {
  localStorage.removeItem("kurashiDxLatestSaving");
  localStorage.removeItem("kurashiDxDiagnosedAt");
} catch (error) {
  // Legacy demo data cleanup is best-effort only.
}
