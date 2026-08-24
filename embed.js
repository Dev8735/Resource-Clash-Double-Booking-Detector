/**
 * ClashGuard — Integration SDK
 * Allows travel websites to embed and interact with the
 * Resource-Clash-Double-Booking-Detector via a simple JS API.
 *
 * Usage:
 *   <script src="embed.js"></script>
 *   <script>
 *     ClashGuard.init({ container: '#clashguard-widget' });
 *     ClashGuard.on('conflict', (e) => console.log('Conflict!', e));
 *   </script>
 */
(function (root) {
    'use strict';

    /* ===== Internal state ===== */
    let _resources = [];
    let _bookings = [];
    let _listeners = {};
    let _initialized = false;
    let _config = { theme: 'dark', storageKey: 'clashguard_embed_v1' };

    /* ===== Helpers ===== */
    function uid(p) { return p + '_' + Math.random().toString(36).slice(2, 9); }
    function overlaps(aStart, aEnd, bStart, bEnd) { return aStart <= bEnd && bStart <= aEnd; }

    function emit(event, data) {
        (_listeners[event] || []).forEach(fn => {
            try { fn(data); } catch (e) { console.error('[ClashGuard] Event handler error:', e); }
        });
    }

    function persist() {
        try {
            localStorage.setItem(_config.storageKey, JSON.stringify({ resources: _resources, bookings: _bookings }));
        } catch (e) { /* silent */ }
    }

    function restore() {
        try {
            const raw = localStorage.getItem(_config.storageKey);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && Array.isArray(d.resources)) _resources = d.resources;
                if (d && Array.isArray(d.bookings)) _bookings = d.bookings;
            }
        } catch (e) { /* silent */ }
    }

    /* ===== Public API ===== */
    const ClashGuard = {
        /**
         * Initialize the SDK.
         * @param {Object} config - { container, theme, resources, bookings, storageKey }
         */
        init: function (config) {
            if (config) Object.assign(_config, config);
            if (config && config.resources) _resources = config.resources;
            if (config && config.bookings) _bookings = config.bookings;
            if (!_resources.length && !_bookings.length) restore();
            _initialized = true;
            emit('init', { resources: _resources.length, bookings: _bookings.length });
            if (_config.container) this.embed(_config.container);
            return this;
        },

        /**
         * Check a booking for conflicts WITHOUT adding it.
         * @param {string} resourceType - 'driver', 'vehicle', 'guide', 'room'
         * @param {string} resourceId - ID of the resource
         * @param {string} startDate - ISO date string (YYYY-MM-DD)
         * @param {string} endDate - ISO date string (YYYY-MM-DD)
         * @returns {{ hasConflict, conflicts[], alternatives[] }}
         */
        checkBooking: function (resourceType, resourceId, startDate, endDate) {
            const conflicts = _bookings.filter(b =>
                b.resourceId === resourceId && overlaps(b.startDate, b.endDate, startDate, endDate)
            );
            const alternatives = _resources.filter(r => {
                if (r.type !== resourceType || r.id === resourceId) return false;
                return !_bookings.some(b => b.resourceId === r.id && overlaps(b.startDate, b.endDate, startDate, endDate));
            });
            return { hasConflict: conflicts.length > 0, conflicts, alternatives };
        },

        /**
         * Add a booking. Returns result with conflict info.
         * @param {{ resourceId, tripName, customer, startDate, endDate }} booking
         * @returns {{ id, hasConflict, conflicts[], alternatives[] }}
         */
        addBooking: function (booking) {
            const resource = _resources.find(r => r.id === booking.resourceId);
            const type = resource ? resource.type : '';
            const result = this.checkBooking(type, booking.resourceId, booking.startDate, booking.endDate);
            const entry = { id: uid('b'), ...booking };
            _bookings.push(entry);
            persist();
            emit('booking-added', { booking: entry, ...result });
            if (result.hasConflict) emit('conflict', { booking: entry, ...result });
            return { id: entry.id, ...result };
        },

        /**
         * Remove a booking by ID.
         * @param {string} bookingId
         * @returns {boolean} true if found and removed
         */
        removeBooking: function (bookingId) {
            const idx = _bookings.findIndex(b => b.id === bookingId);
            if (idx === -1) return false;
            const removed = _bookings.splice(idx, 1)[0];
            persist();
            emit('booking-removed', { booking: removed });
            return true;
        },

        /**
         * Get bookings, optionally filtered.
         * @param {{ resourceId?, resourceType?, startDate?, endDate? }} filters
         * @returns {Array} matching bookings
         */
        getBookings: function (filters) {
            let result = [..._bookings];
            if (filters) {
                if (filters.resourceId) result = result.filter(b => b.resourceId === filters.resourceId);
                if (filters.resourceType) {
                    const ids = new Set(_resources.filter(r => r.type === filters.resourceType).map(r => r.id));
                    result = result.filter(b => ids.has(b.resourceId));
                }
                if (filters.startDate) result = result.filter(b => b.endDate >= filters.startDate);
                if (filters.endDate) result = result.filter(b => b.startDate <= filters.endDate);
            }
            return result;
        },

        /**
         * Get all resources, optionally filtered by type.
         * @param {string} [type]
         * @returns {Array}
         */
        getResources: function (type) {
            return type ? _resources.filter(r => r.type === type) : [..._resources];
        },

        /**
         * Add a resource.
         * @param {{ type, name }} resource
         * @returns {{ id }}
         */
        addResource: function (resource) {
            const entry = { id: uid('r'), ...resource };
            _resources.push(entry);
            persist();
            emit('resource-added', { resource: entry });
            return entry;
        },

        /**
         * Listen for events.
         * Events: 'init', 'conflict', 'booking-added', 'booking-removed', 'resource-added'
         * @param {string} event
         * @param {Function} callback
         */
        on: function (event, callback) {
            if (!_listeners[event]) _listeners[event] = [];
            _listeners[event].push(callback);
            return this;
        },

        /**
         * Remove an event listener.
         * @param {string} event
         * @param {Function} callback
         */
        off: function (event, callback) {
            if (_listeners[event]) {
                _listeners[event] = _listeners[event].filter(fn => fn !== callback);
            }
            return this;
        },

        /**
         * Embed a compact booking-check widget into a container.
         * @param {string} selector - CSS selector for the container
         */
        embed: function (selector) {
            const container = document.querySelector(selector);
            if (!container) { console.error('[ClashGuard] Container not found:', selector); return; }

            container.innerHTML = '';
            container.style.fontFamily = "'Inter', -apple-system, sans-serif";

            const isDark = _config.theme === 'dark';
            const bg = isDark ? '#0a0c0f' : '#ffffff';
            const border = isDark ? '#1b2028' : '#e2e8f0';
            const text = isDark ? '#eef2f6' : '#1a202c';
            const textDim = isDark ? '#8b96a5' : '#718096';
            const accent = '#2dd4ea';

            const wrapper = document.createElement('div');
            wrapper.style.cssText = `background:${bg};border:1px solid ${border};border-radius:12px;padding:20px;max-width:400px;color:${text};`;
            wrapper.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
          <div style="width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,${accent},#17a8bd);display:flex;align-items:center;justify-content:center;">
            <svg viewBox="0 0 24 24" fill="none" width="14" height="14"><path d="M12 3.2l6.5 2.6v5c0 4.4-2.7 7.9-6.5 9.9-3.8-2-6.5-5.5-6.5-9.9v-5L12 3.2z" stroke="#04141a" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.7 12.4l2.2 2.2 4.4-4.8" stroke="#04141a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div>
            <strong style="font-size:13px;">Booking Availability Check</strong>
            <div style="font-size:10px;color:${textDim};">Powered by Resource-Clash-Double-Booking-Detector</div>
          </div>
        </div>
        <div id="cg-embed-form" style="display:flex;flex-direction:column;gap:10px;">
          <select id="cg-e-type" style="padding:8px 10px;border-radius:7px;border:1px solid ${border};background:${isDark ? '#050607' : '#f7f7f9'};color:${text};font-size:13px;">
            <option value="driver">Driver</option>
            <option value="vehicle">Vehicle</option>
            <option value="guide">Guide</option>
            <option value="room">Room</option>
          </select>
          <select id="cg-e-resource" style="padding:8px 10px;border-radius:7px;border:1px solid ${border};background:${isDark ? '#050607' : '#f7f7f9'};color:${text};font-size:13px;"></select>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <input type="date" id="cg-e-start" style="padding:8px 10px;border-radius:7px;border:1px solid ${border};background:${isDark ? '#050607' : '#f7f7f9'};color:${text};font-size:13px;">
            <input type="date" id="cg-e-end" style="padding:8px 10px;border-radius:7px;border:1px solid ${border};background:${isDark ? '#050607' : '#f7f7f9'};color:${text};font-size:13px;">
          </div>
          <button id="cg-e-check" style="padding:10px;border-radius:7px;border:none;background:linear-gradient(135deg,${accent},#17a8bd);color:#03181c;font-weight:600;font-size:13px;cursor:pointer;">Check Availability</button>
          <div id="cg-e-result" style="font-size:12px;min-height:20px;"></div>
        </div>
      `;
            container.appendChild(wrapper);

            // Populate resources
            const typeSel = wrapper.querySelector('#cg-e-type');
            const resSel = wrapper.querySelector('#cg-e-resource');
            const startIn = wrapper.querySelector('#cg-e-start');
            const endIn = wrapper.querySelector('#cg-e-end');
            const checkBtn = wrapper.querySelector('#cg-e-check');
            const resultDiv = wrapper.querySelector('#cg-e-result');

            const today = new Date().toISOString().slice(0, 10);
            startIn.value = today;
            endIn.value = today;

            function populateResources() {
                resSel.innerHTML = '';
                _resources.filter(r => r.type === typeSel.value).forEach(r => {
                    const opt = document.createElement('option');
                    opt.value = r.id; opt.textContent = r.name;
                    resSel.appendChild(opt);
                });
            }
            populateResources();
            typeSel.addEventListener('change', populateResources);

            checkBtn.addEventListener('click', function () {
                const res = ClashGuard.checkBooking(typeSel.value, resSel.value, startIn.value, endIn.value);
                if (!resSel.value) { resultDiv.innerHTML = '<span style="color:#ff5470;">No resource selected.</span>'; return; }
                if (res.hasConflict) {
                    resultDiv.innerHTML = `<span style="color:#ff5470;font-weight:600;">⚠ Conflict detected!</span> ${res.conflicts.length} overlapping booking(s).<br>` +
                        (res.alternatives.length ? `<span style="color:#34d399;">✓ Alternative: <b>${res.alternatives[0].name}</b> is free.</span>` : '<span style="color:#8b96a5;">No alternatives available.</span>');
                } else {
                    resultDiv.innerHTML = '<span style="color:#34d399;font-weight:600;">✓ Available!</span> No conflicts found for these dates.';
                }
            });
        },

        /** Current version */
        version: '1.0.0'
    };

    /* ===== Export ===== */
    root.ClashGuard = ClashGuard;

    // ES module support
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ClashGuard;
    }

})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
