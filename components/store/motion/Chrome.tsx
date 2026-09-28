/** Static motion chrome (intro, page curtain, custom cursor). Driven by the engine. */
export function MotionChrome() {
  return (
    <>
      <div className="vp-intro" data-intro aria-hidden="true">
        <div className="vp-intro__inner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="vp-intro__logo" src="/images/brand/logo-gold.webp" alt="" width={530} height={232} />
          <span className="vp-intro__line" />
          <span className="vp-intro__caption">أناقة بحضور — Elegance with attitude</span>
        </div>
      </div>
      <div className="vp-curtain" data-curtain aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/brand/logo-gold.webp" alt="" width={265} height={116} />
      </div>
      <div className="vp-cursor" data-cursor-el aria-hidden="true">
        <span className="vp-cursor__ring" />
        <span className="vp-cursor__dot" />
        <span className="vp-cursor__label" data-cursor-label />
      </div>
    </>
  );
}

/**
 * Pre-paint motion flag (runs before first paint, CSP nonce'd). Reduced-motion
 * visitors never get data-motion, so they see the complete static page. The
 * first visit of a session also gets the intro flag.
 */
export const PREPAINT_SCRIPT = `(function(){try{var d=document.documentElement;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;d.setAttribute('data-motion','');var s=null;try{s=sessionStorage.getItem('vp-intro')}catch(e){}if(!s&&location.pathname==='/')d.setAttribute('data-intro','');}catch(e){}})();`;
