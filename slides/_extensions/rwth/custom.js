// Taken from http://blog.schauderhaft.de/2018/07/23/footer-in-revealjs-from-asciidoc/
// Append slide number to footer by force
window.addEventListener("load", function () {

  var footer = document.querySelector("div.footer");
  var slidenumber = document.querySelector("div.slide-number");
  if (footer && slidenumber) {
    footer.prepend(slidenumber);
  }

  // Scale the footer proportionally with the RevealJS slide transform.
  //
  // The footer is position:fixed (outside the transform), so its CSS cm values
  // stay the same physical size while the slide grows/shrinks. We fix this by
  // computing what each dimension should be in viewport pixels (base slide-space
  // px × current scale) and writing them back as CSS custom properties.
  // The SCSS rules reference these variables, so every resize is instant.
  //
  // 1 cm = 96 / 2.54 ≈ 37.795 CSS px (at the 96 dpi CSS reference pixel).
  var CM = 37.795;
  var FOOTER_HEIGHT_CM   = 2.27;
  var FOOTER_MARGIN_CM   = 0.54;
  var FOOTER_PADDING_CM  = 0.30;

  // Minimum gap (in viewport px) kept between the last content element and
  // the footer line. Applied consistently in both constrainImages (media) and
  // autoFitSlide (text), so every element gets the same breathing room.
  var BOTTOM_GAP_PX = 20;

  function resizeFooter() {
    if (typeof Reveal === "undefined") return;
    var scale = Reveal.getScale();
    if (!scale) return;
    var root = document.documentElement;
    root.style.setProperty("--footer-height",             (FOOTER_HEIGHT_CM  * CM * scale) + "px");
    root.style.setProperty("--footer-p-margin-top",       (FOOTER_MARGIN_CM  * CM * scale) + "px");
    root.style.setProperty("--footer-number-padding-top", (FOOTER_PADDING_CM * CM * scale) + "px");
  }

  // Constrain each image so it never overflows the footer.
  //
  // RevealJS renders slides in their own coordinate space (e.g. 1244×700) and
  // then applies a CSS transform scale to fit the viewport. getBoundingClientRect
  // returns coordinates in *screen* pixels (post-scale), while CSS max-height
  // values live in the *slide* coordinate space (pre-scale). We bridge the two
  // by dividing screen-pixel distances by Reveal.getScale().
  //
  // With both max-width:100% (from CSS) and a computed max-height applied,
  // the browser automatically picks whichever constraint is binding while
  // preserving the aspect ratio — no object-fit needed.
  function constrainImages(slide) {
    if (!slide || slide.id === "title-slide") return;

    var footerEl = document.querySelector(".footer");
    if (!footerEl) return;

    var scale = Reveal.getScale();
    if (!scale) return;

    var media = slide.querySelectorAll("img, video, iframe");

    // Reset any previously applied inline max-height
    media.forEach(function (el) {
      el.style.maxHeight = "";
    });

    var footerTop = footerEl.getBoundingClientRect().top;

    media.forEach(function (el) {
      var elTop = el.getBoundingClientRect().top;
      // Convert available screen-pixel height to slide coordinate space
      var availableHeight = (footerTop - elTop - BOTTOM_GAP_PX) / scale;
      if (availableHeight > 0) {
        el.style.maxHeight = availableHeight + "px";
      }
    });
  }

  // Auto-shrink slide font size to prevent text from overflowing into the
  // footer. Run after constrainImages so images no longer trigger unnecessary
  // font reduction — only genuine text overflow is handled here.
  //
  // Note: font size is reset in fitSlide before this runs, so there is no
  // reset here. That guarantees constrainImages and autoFitSlide share the
  // same baseline layout.
  function autoFitSlide(slide) {
    if (!slide || slide.id === "title-slide") return;
    // Slides with .r-stretch contain a self-sizing element; the CSS
    // padding-bottom on sections provides the footer gap for those slides.
    if (slide.querySelector(".r-stretch")) return;

    var footerEl = document.querySelector(".footer");
    if (!footerEl) return;

    // Record the heading's natural font size once so we can re-pin it after
    // every reduction step — the heading should never shrink with the content.
    var heading = slide.querySelector("h2");
    var headingSize = heading ? window.getComputedStyle(heading).fontSize : null;

    var minFontPx = 6;
    var maxIterations = 30;

    for (var i = 0; i < maxIterations; i++) {
      var footerTop = footerEl.getBoundingClientRect().top;
      var overflows = false;

      for (var j = 0; j < slide.children.length; j++) {
        if (slide.children[j].getBoundingClientRect().bottom > footerTop - BOTTOM_GAP_PX) {
          overflows = true;
          break;
        }
      }

      if (!overflows) break;

      var currentSize = parseFloat(window.getComputedStyle(slide).fontSize);
      if (currentSize <= minFontPx) break;
      slide.style.fontSize = (currentSize - 0.5) + "px";

      // Re-pin the heading so it does not inherit the smaller section font.
      if (heading && headingSize) {
        heading.style.fontSize = headingSize;
      }
    }
  }

  // Orchestrates responsive fitting for a single slide:
  //  1. resizeFooter  — update footer CSS vars from current RevealJS scale
  //  2. reset font    — return to default so all measurements share a baseline
  //  3. constrainImages — set max-height on images (at default-font positions)
  //  4. autoFitSlide  — reduce font only if text still overflows
  function fitSlide(slide) {
    if (!slide || slide.id === "title-slide") return;
    resizeFooter();
    slide.style.fontSize = "";
    var heading = slide.querySelector("h2");
    if (heading) { heading.style.fontSize = ""; }
    constrainImages(slide);
    autoFitSlide(slide);
  }

  if (typeof Reveal !== "undefined") {
    fitSlide(Reveal.getCurrentSlide());
    Reveal.on("resize",       function ()  { fitSlide(Reveal.getCurrentSlide()); });
    Reveal.on("slidechanged", function (e) { fitSlide(e.currentSlide); });
  }

});
