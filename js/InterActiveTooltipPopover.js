// InterActiveTooltipPopover Plugin JS
// All logic is scoped under InterActiveTooltipPopover namespace
(function(window, document) {
  'use strict';
  
  // Utility: debounce
  function debounce(fn, delay) {
    let t; return function() { clearTimeout(t); t = setTimeout(fn, delay); };
  }

  // Main plugin object
  const InterActiveTooltipPopover = {
    tooltips: [],
    init() {
      // Add ARIA live region for tooltip content
      if (!document.getElementById('iatp-aria-live')) {
        const live = document.createElement('div');
        live.id = 'iatp-aria-live';
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('role', 'status');
        live.style.position = 'absolute';
        live.style.width = '1px';
        live.style.height = '1px';
        live.style.overflow = 'hidden';
        live.style.clip = 'rect(1px,1px,1px,1px)';
        live.style.clipPath = 'inset(50%)';
        live.style.whiteSpace = 'nowrap';
        document.body.appendChild(live);
      }
      // Find all elements with data-tooltip
      const triggers = document.querySelectorAll('[data-tooltip]');
      triggers.forEach(el => {
        if (el._iatp_inited) return;
        el._iatp_inited = true;
        el.setAttribute('aria-describedby', '');
        // Keyboard: Esc to close
        el.addEventListener('keydown', function(ev) {
          if (ev.key === 'Escape' && el._iatp_tooltip && el._iatp_tooltip.classList.contains('iatp-visible')) {
            InterActiveTooltipPopover._hideTooltip({currentTarget: el});
            el.blur();
          }
        });
        // Sticky support
        if (el.hasAttribute('data-tooltip-sticky')) {
          el.addEventListener('mouseenter', InterActiveTooltipPopover._showTooltip);
          el.addEventListener('focus', InterActiveTooltipPopover._showTooltip);
          el.addEventListener('click', InterActiveTooltipPopover._showTooltip);
        } else {
          el.addEventListener('mouseenter', InterActiveTooltipPopover._showTooltip);
          el.addEventListener('mouseleave', InterActiveTooltipPopover._hideTooltip);
          el.addEventListener('focus', InterActiveTooltipPopover._showTooltip);
          el.addEventListener('blur', InterActiveTooltipPopover._hideTooltip);
          el.addEventListener('click', InterActiveTooltipPopover._toggleTooltip);
        }
      });
      // Hide on scroll/resize
      window.addEventListener('scroll', InterActiveTooltipPopover._hideAll, true);
      window.addEventListener('resize', debounce(InterActiveTooltipPopover._hideAll, 100));
      // Hide sticky on outside click
      document.addEventListener('mousedown', InterActiveTooltipPopover._handleDocumentClick, true);
    },
    _showTooltip(e) {
      const el = e.currentTarget;
      let tooltip = el._iatp_tooltip;
      if (!tooltip) {
        tooltip = InterActiveTooltipPopover._createTooltip(el);
        el._iatp_tooltip = tooltip;
        document.body.appendChild(tooltip);
      }
      InterActiveTooltipPopover._positionTooltip(el, tooltip);
      tooltip.classList.add('iatp-visible');
      el.setAttribute('aria-describedby', tooltip.id);
      // ARIA live update
      const live = document.getElementById('iatp-aria-live');
      if (live) {
        live.textContent = tooltip.textContent || tooltip.innerText || '';
      }
      // Sticky support
      if (el.hasAttribute('data-tooltip-sticky')) {
        tooltip.classList.add('iatp-sticky');
        // Add close button if not present
        if (!tooltip.querySelector('.iatp-close')) {
          const closeBtn = document.createElement('button');
          closeBtn.className = 'iatp-close';
          closeBtn.setAttribute('aria-label', 'Close tooltip');
          closeBtn.innerHTML = '&times;';
          closeBtn.onclick = function(ev) {
            ev.stopPropagation();
            InterActiveTooltipPopover._hideTooltip({currentTarget: el});
          };
          tooltip.appendChild(closeBtn);
        }
        // Keep open on hover
        tooltip.addEventListener('mouseenter', InterActiveTooltipPopover._stickyEnter);
        tooltip.addEventListener('mouseleave', InterActiveTooltipPopover._stickyLeave);
        // Focus the close button for accessibility
        setTimeout(() => {
          const closeBtn = tooltip.querySelector('.iatp-close');
          if (closeBtn) closeBtn.focus();
        }, 10);
      }
    },

    _stickyEnter(e) {
      const tip = e.currentTarget;
      tip._iatp_stickyHover = true;
    },
    _stickyLeave(e) {
      const tip = e.currentTarget;
      tip._iatp_stickyHover = false;
      setTimeout(() => {
        if (!tip._iatp_stickyHover) {
          InterActiveTooltipPopover._hideTooltip({currentTarget: tip._iatp_trigger});
        }
      }, 120);
    },
    _hideTooltip(e) {
      const el = e.currentTarget;
      if (el._iatp_tooltip) {
        el._iatp_tooltip.classList.remove('iatp-visible');
        el._iatp_tooltip.classList.remove('iatp-sticky');
        el.setAttribute('aria-describedby', '');
      }
    },

    _handleDocumentClick(e) {
      // Hide sticky tooltips if click outside
      document.querySelectorAll('.iatp-tooltip.iatp-sticky.iatp-visible').forEach(tip => {
        if (!tip.contains(e.target) && tip._iatp_trigger && !tip._iatp_trigger.contains(e.target)) {
          InterActiveTooltipPopover._hideTooltip({currentTarget: tip._iatp_trigger});
        }
      });
    },
    _toggleTooltip(e) {
      const el = e.currentTarget;
      if (!el._iatp_tooltip || !el._iatp_tooltip.classList.contains('iatp-visible')) {
        InterActiveTooltipPopover._showTooltip(e);
      } else {
        InterActiveTooltipPopover._hideTooltip(e);
      }
    },
    _hideAll() {
      document.querySelectorAll('.iatp-tooltip.iatp-visible').forEach(tip => {
        tip.classList.remove('iatp-visible');
        // Remove ARIA from trigger
        if (tip._iatp_trigger) tip._iatp_trigger.setAttribute('aria-describedby', '');
      });
    },
    _createTooltip(el) {
      const text = el.getAttribute('data-tooltip') || '';
      const html = el.getAttribute('data-tooltip-html');
      const style = el.getAttribute('data-tooltip-style') || 'classic-light';
      const direction = el.getAttribute('data-tooltip-direction') || 'top';
      const arrowBg = el.getAttribute('data-tooltip-arrow-bg');
      const theme = el.getAttribute('data-tooltip-theme');
      const brandLogo = el.getAttribute('data-tooltip-brand-logo');
      const tooltip = document.createElement('div');
      tooltip.className = `iatp-tooltip iatp-${style}`;
      tooltip.setAttribute('data-direction', direction);
      tooltip.setAttribute('role', 'tooltip');
      tooltip.id = 'iatp-' + Math.random().toString(36).substr(2, 8);
      if (theme === 'custom') {
        tooltip.classList.add('iatp-theme-custom');
        // Allow custom CSS variable overrides via data attributes
        ['bg','color','border'].forEach(v => {
          const val = el.getAttribute('data-tooltip-theme-' + v);
          if (val) tooltip.style.setProperty('--iatp-tooltip-' + v, val);
        });
      }
      if (arrowBg) {
        tooltip.style.setProperty('--iatp-arrow-bg', arrowBg);
      }
      let content = '';
      if (brandLogo) {
        content += `<img class="iatp-brand-logo" src="${brandLogo}" alt="Brand">`;
      }
      if (html) {
        content += InterActiveTooltipPopover._sanitizeHTML(html);
      } else {
        content += InterActiveTooltipPopover._getTooltipContent(style, text);
      }
      tooltip.innerHTML = content;
      // Arrow
      const arrow = document.createElement('div');
      arrow.className = 'iatp-arrow';
      tooltip.appendChild(arrow);
      // Link trigger
      tooltip._iatp_trigger = el;
      return tooltip;
    },

    // Basic HTML sanitizer for tooltip HTML
    _sanitizeHTML(html) {
      // Allow only a safe subset: b, i, em, strong, a, br, span, img (with src, alt)
      const div = document.createElement('div');
      div.innerHTML = html;
      const allowedTags = ['B','I','EM','STRONG','A','BR','SPAN','IMG'];
      const allowedAttrs = {
        'A': ['href','title','target','rel'],
        'IMG': ['src','alt','width','height','title'],
        'SPAN': ['style','class']
      };
      function clean(node) {
        if (node.nodeType === 3) return; // text
        if (!allowedTags.includes(node.nodeName)) {
          node.parentNode && node.parentNode.removeChild(node);
          return;
        }
        // Remove disallowed attributes
        [...node.attributes].forEach(attr => {
          if (!(allowedAttrs[node.nodeName]||[]).includes(attr.name)) {
            node.removeAttribute(attr.name);
          }
        });
        // Recurse
        [...node.childNodes].forEach(clean);
      }
      [...div.childNodes].forEach(clean);
      return div.innerHTML;
    },
    _getTooltipContent(style, text) {
      if (style === 'card-style') {
        return `<div class='iatp-header'>Card Header</div><div>${text}</div>`;
      }
      if (style === 'wave') {
        // Render each letter in a span for wave animation
        let html = '<span class="iatp-wave-text">';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i] === ' ' ? '&nbsp;' : text[i];
          html += `<span style="--i:${i}">${ch}</span>`;
        }
        html += '</span>';
        return html;
      }
      if (style === 'progress-bar') {
        // Add a progress bar element
        return `<span>${text}</span><div class="iatp-progress"></div>`;
      }
      return text;
    },
    _positionTooltip(el, tooltip) {
      // Mouse-follow support
      if (el.hasAttribute('data-tooltip-mouse-follow')) {
        // Attach mousemove event if not already
        if (!el._iatp_mousemove) {
          el._iatp_mousemove = function(ev) {
            tooltip.style.left = (ev.pageX + 16) + 'px';
            tooltip.style.top = (ev.pageY + 16) + 'px';
          };
          el.addEventListener('mousemove', el._iatp_mousemove);
        }
        return;
      }
      // Reset
      tooltip.style.left = '-9999px';
      tooltip.style.top = '-9999px';
      tooltip.style.display = 'block';
      // Get direction
      let direction = tooltip.getAttribute('data-direction');
      const rect = el.getBoundingClientRect();
      const tipRect = tooltip.getBoundingClientRect();
      let top = 0, left = 0;
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      const margin = 10;
      // Try preferred direction, then auto-flip if needed
      const tryDirections = [direction, 'top', 'bottom', 'right', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
      let placed = false;
      for (let i = 0; i < tryDirections.length; i++) {
        direction = tryDirections[i];
        switch (direction) {
          case 'top':
            top = rect.top + scrollY - tipRect.height - margin;
            left = rect.left + scrollX + rect.width/2 - tipRect.width/2;
            break;
          case 'bottom':
            top = rect.bottom + scrollY + margin;
            left = rect.left + scrollX + rect.width/2 - tipRect.width/2;
            break;
          case 'left':
            top = rect.top + scrollY + rect.height/2 - tipRect.height/2;
            left = rect.left + scrollX - tipRect.width - margin;
            break;
          case 'right':
            top = rect.top + scrollY + rect.height/2 - tipRect.height/2;
            left = rect.right + scrollX + margin;
            break;
          case 'top-left':
            top = rect.top + scrollY - tipRect.height - margin;
            left = rect.left + scrollX;
            break;
          case 'top-right':
            top = rect.top + scrollY - tipRect.height - margin;
            left = rect.right + scrollX - tipRect.width;
            break;
          case 'bottom-left':
            top = rect.bottom + scrollY + margin;
            left = rect.left + scrollX;
            break;
          case 'bottom-right':
            top = rect.bottom + scrollY + margin;
            left = rect.right + scrollX - tipRect.width;
            break;
          default:
            top = rect.bottom + scrollY + margin;
            left = rect.left + scrollX + rect.width/2 - tipRect.width/2;
        }
        // Viewport aware
        const vw = window.innerWidth, vh = window.innerHeight;
        if (left < margin || left + tipRect.width > vw - margin || top < margin || top + tipRect.height > scrollY + vh - margin) {
          continue;
        } else {
          placed = true;
          break;
        }
      }
      // If not placed, fallback to preferred direction
      if (!placed) direction = tooltip.getAttribute('data-direction');
      tooltip.setAttribute('data-direction', direction);
      // Final position
      switch (direction) {
        case 'top':
          top = rect.top + scrollY - tipRect.height - margin;
          left = rect.left + scrollX + rect.width/2 - tipRect.width/2;
          break;
        case 'bottom':
          top = rect.bottom + scrollY + margin;
          left = rect.left + scrollX + rect.width/2 - tipRect.width/2;
          break;
        case 'left':
          top = rect.top + scrollY + rect.height/2 - tipRect.height/2;
          left = rect.left + scrollX - tipRect.width - margin;
          break;
        case 'right':
          top = rect.top + scrollY + rect.height/2 - tipRect.height/2;
          left = rect.right + scrollX + margin;
          break;
        case 'top-left':
          top = rect.top + scrollY - tipRect.height - margin;
          left = rect.left + scrollX;
          break;
        case 'top-right':
          top = rect.top + scrollY - tipRect.height - margin;
          left = rect.right + scrollX - tipRect.width;
          break;
        case 'bottom-left':
          top = rect.bottom + scrollY + margin;
          left = rect.left + scrollX;
          break;
        case 'bottom-right':
          top = rect.bottom + scrollY + margin;
          left = rect.right + scrollX - tipRect.width;
          break;
        default:
          top = rect.bottom + scrollY + margin;
          left = rect.left + scrollX + rect.width/2 - tipRect.width/2;
      }
      tooltip.style.left = left + 'px';
      tooltip.style.top = top + 'px';
    }
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', InterActiveTooltipPopover.init);
  } else {
    InterActiveTooltipPopover.init();
  }

  // Expose globally
  window.InterActiveTooltipPopover = InterActiveTooltipPopover;

})(window, document);
