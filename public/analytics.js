/* ============================================================================
   The Google tag, in one place.

   Every page loads this file rather than carrying its own copy of the snippet,
   so the measurement ID is changed here and nowhere else. It went missing once
   already: the tag lived inline in the old homepage, and replacing that page
   silently took the analytics with it.

   Note for whoever changes this: the value below is the GA4 *measurement* ID
   from Admin, Data streams. A GA4 property ID (the numeric one, e.g. 539528931)
   is used by the reporting API and is not accepted here.
   ========================================================================= */
(function () {
  var ID = 'G-LH0F5GVV3G';

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', ID);
})();
