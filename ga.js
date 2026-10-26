// GA4（桐桐貓貓島專屬資源）：只在 tong.xjack.tw 上送，claude.ai 的版本和本機預覽都不送。
// 不開 Google 信號、不做廣告個人化；玩法事件由 app.js 的 track() 送
const MEASUREMENT_ID = 'G-ZY9SSXXT6C';

if (location.hostname === 'tong.xjack.tw') {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.append(script);
}
