(function () {
  "use strict";

  var localHosts = ["localhost", "127.0.0.1", "::1"];
  var apiBase = localHosts.indexOf(window.location.hostname) !== -1
    ? "http://127.0.0.1:8000"
    : "https://api.fortechmedia.com";

  function createContinuousMarquee() {
    document.querySelectorAll(".continuous-marquee .marquee-inner").forEach(function (track) {
      if (track.dataset.marqueeReady === "true") return;

      var items = Array.from(track.children);
      if (!items.length) return;

      var segment = document.createElement("div");
      segment.className = "marquee-segment";
      items.forEach(function (item) {
        segment.appendChild(item);
      });

      var duplicate = segment.cloneNode(true);
      duplicate.setAttribute("aria-hidden", "true");

      track.appendChild(segment);
      track.appendChild(duplicate);
      track.dataset.marqueeReady = "true";
    });
  }

  function initializeBrochureForm() {
    var form = document.getElementById("brochureForm");
    var modal = document.getElementById("brochureModal");
    var status = document.getElementById("brochureFormStatus");
    if (!form || !modal || !status) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }

      var submitButton = form.querySelector('button[type="submit"]');
      var originalText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.textContent = "Preparing brochure...";
      status.className = "brochure-form-status";
      status.textContent = "";

      var payload = Object.fromEntries(new FormData(form).entries());

      try {
        var response = await fetch(apiBase + "/api/brochure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          var errorData = await response.json().catch(function () { return {}; });
          throw new Error(errorData.message || "Unable to prepare the brochure. Please try again.");
        }

        var brochureBlob = await response.blob();
        var brochureUrl = URL.createObjectURL(brochureBlob);
        var downloadLink = document.createElement("a");
        downloadLink.href = brochureUrl;
        downloadLink.download = "Fortech-Business-Profile.pdf";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        window.setTimeout(function () { URL.revokeObjectURL(brochureUrl); }, 1000);

        status.className = "brochure-form-status is-success";
        status.textContent = "Thank you. Your brochure download has started.";
        form.reset();
        form.classList.remove("was-validated");

        window.setTimeout(function () {
          var modalInstance = window.bootstrap && window.bootstrap.Modal.getInstance(modal);
          if (modalInstance) modalInstance.hide();
        }, 1200);
      } catch (error) {
        status.className = "brochure-form-status is-error";
        status.textContent = error.message;
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
    });
  }

  function initializeMobileMenu() {
    document.querySelectorAll("#menuOffcanvas a.nav-link").forEach(function (link) {
      link.addEventListener("click", function () {
        var menu = document.getElementById("menuOffcanvas");
        var instance = menu && window.bootstrap ? window.bootstrap.Offcanvas.getInstance(menu) : null;
        if (instance) instance.hide();
      });
    });
  }

  function initializeStableBannerSlider() {
    var slider = document.getElementById("bg-slider");
    if (!slider) return;

    var slides = Array.from(slider.querySelectorAll(":scope > img"));
    if (!slides.length) return;

    var activeIndex = 0;
    var timer = null;
    var slideDelay = 9000;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    slides.forEach(function (slide, index) {
      slide.classList.toggle("is-active", index === activeIndex);
      slide.setAttribute("aria-hidden", index === activeIndex ? "false" : "true");
    });
    slider.classList.add("is-initialized");

    function clearTimer() {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function showNextSlide() {
      var nextIndex = (activeIndex + 1) % slides.length;
      slides[activeIndex].classList.remove("is-active");
      slides[activeIndex].setAttribute("aria-hidden", "true");
      slides[nextIndex].classList.add("is-active");
      slides[nextIndex].setAttribute("aria-hidden", "false");
      activeIndex = nextIndex;
      scheduleNextSlide();
    }

    function scheduleNextSlide() {
      clearTimer();
      if (slides.length < 2 || document.hidden || reduceMotion.matches) return;
      timer = window.setTimeout(showNextSlide, slideDelay);
    }

    function handleVisibilityChange() {
      clearTimer();

      if (document.hidden) {
        slider.classList.add("is-paused");
        return;
      }

      window.requestAnimationFrame(function () {
        slider.classList.remove("is-paused");
        scheduleNextSlide();
      });
    }

    function handleMotionPreference() {
      slider.classList.toggle("reduced-motion", reduceMotion.matches);
      scheduleNextSlide();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", clearTimer);
    window.addEventListener("pageshow", handleVisibilityChange);
    if (typeof reduceMotion.addEventListener === "function") {
      reduceMotion.addEventListener("change", handleMotionPreference);
    } else if (typeof reduceMotion.addListener === "function") {
      reduceMotion.addListener(handleMotionPreference);
    }

    handleMotionPreference();
  }

  function initializeContactForm() {
    var form = document.getElementById("contactForm");
    var status = document.getElementById("contactFormStatus");
    if (!form || !status) return;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        form.reportValidity();
        return;
      }

      var submitButton = form.querySelector('button[type="submit"]');
      var originalButtonContent = submitButton.innerHTML;
      var subjectField = form.querySelector("#subject");
      var messageField = form.querySelector("#message");
      var subject = subjectField ? subjectField.value.trim() : "";
      var message = messageField ? messageField.value.trim() : "";

      var payload = {
        firstName: form.querySelector("#firstName").value.trim(),
        lastName: form.querySelector("#lastName") ? form.querySelector("#lastName").value.trim() : "-",
        email: form.querySelector("#email").value.trim(),
        phone: form.querySelector("#phone") ? form.querySelector("#phone").value.trim() : "-",
        message: subject ? "Subject: " + subject + "\n\n" + message : message
      };

      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
      status.className = "contact-form-status";
      status.textContent = "";

      try {
        var response = await fetch(apiBase + "/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        var result = await response.json().catch(function () { return {}; });

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Your message could not be sent. Please try again.");
        }

        status.className = "contact-form-status is-success";
        status.textContent = result.message || "Thank you. Your message has been sent successfully.";
        form.reset();
        form.classList.remove("was-validated");
      } catch (error) {
        status.className = "contact-form-status is-error";
        status.textContent = error.message || "Something went wrong. Please try again.";
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalButtonContent;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    createContinuousMarquee();
    initializeStableBannerSlider();
    initializeBrochureForm();
    initializeMobileMenu();
    initializeContactForm();
  });
})();
