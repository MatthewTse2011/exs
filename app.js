/* ============================================================
   PHYSIOTHERAPY EXERCISE PLAN — PATIENT APP
   Reads ?ex=k01,k03,s02 from URL, fetches exercises.json,
   and renders only the matching exercise cards.
   ============================================================ */

(function () {
    'use strict';

    var app = document.getElementById('app');

    /* ------ 1. Parse the "ex" query parameter ------ */

    function getSelectedIds() {
        var params = new URLSearchParams(window.location.search);
        var raw = params.get('ex');
        if (!raw || raw.trim() === '') return [];
        // Split on comma, trim whitespace, lower-case, remove blanks
        return raw.split(',')
            .map(function (s) { return s.trim().toLowerCase(); })
            .filter(function (s) { return s.length > 0; });
    }

    /* ------ 2. Fetch the exercise catalog ------ */

    function fetchCatalog() {
        return fetch('exercises.json')
            .then(function (res) {
                if (!res.ok) throw new Error('Could not load exercise catalog.');
                return res.json();
            });
    }

    /* ------ 3. Render helpers ------ */

    // Create a single exercise card element
    function createCard(ex) {
        var card = document.createElement('article');
        card.className = 'exercise-card';
        card.setAttribute('aria-label', ex.title);

        // Header
        var header = document.createElement('div');
        header.className = 'exercise-card__header';
        header.innerHTML =
            '<div class="exercise-card__title">' + escapeHtml(ex.title) + '</div>' +
            '<div class="exercise-card__meta">' +
                escapeHtml(ex.category) + ' · ' + escapeHtml(ex.bodyRegion) +
            '</div>';
        card.appendChild(header);

        // Body
        var body = document.createElement('div');
        body.className = 'exercise-card__body';

        // Media — try video first, fall back to image
        var media = document.createElement('div');
        media.className = 'exercise-card__media';

        if (ex.video) {
            var video = document.createElement('video');
            video.setAttribute('controls', '');
            video.setAttribute('preload', 'metadata');
            video.setAttribute('playsinline', '');
            if (ex.image) video.setAttribute('poster', ex.image);
            video.innerHTML = '<source src="' + escapeAttr(ex.video) + '" type="video/mp4">';
            // If video fails to load, replace with image
            video.addEventListener('error', function () {
                replaceWithImage(media, ex);
            }, true);
            media.appendChild(video);
        } else if (ex.image) {
            appendImage(media, ex);
        }
        body.appendChild(media);

        // Instructions
        var instructions = document.createElement('p');
        instructions.className = 'exercise-card__instructions';
        instructions.textContent = ex.instructions;
        body.appendChild(instructions);

        // Dosage badges
        var dosage = document.createElement('div');
        dosage.className = 'exercise-card__dosage';
        dosage.innerHTML =
            badge('Sets', ex.defaultSets) +
            badge('Reps', ex.defaultReps) +
            badge('Frequency', ex.defaultFrequency);
        body.appendChild(dosage);

        card.appendChild(body);
        return card;
    }

    function badge(label, value) {
        return '<span class="dosage-badge">' +
                   '<span class="dosage-badge__label">' + escapeHtml(label) + ':</span> ' +
                   escapeHtml(String(value)) +
               '</span>';
    }

    function appendImage(container, ex) {
        var img = document.createElement('img');
        img.src = ex.image;
        img.alt = ex.title + ' — illustration';
        img.loading = 'lazy';
        container.appendChild(img);
    }

    function replaceWithImage(container, ex) {
        container.innerHTML = '';
        if (ex.image) {
            appendImage(container, ex);
        }
    }

    function showMessage(html, type) {
        var cls = 'message-box' + (type ? ' ' + type : '');
        app.innerHTML = '<div class="' + cls + '">' + html + '</div>';
    }

    /* ------ 4. Sanitisation ------ */

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    /* ------ 5. Main ------ */

    function main() {
        var requestedIds = getSelectedIds();

        // No IDs in URL → friendly empty state
        if (requestedIds.length === 0) {
            showMessage(
                '<h2>No exercises selected</h2>' +
                '<p>This page displays exercises chosen by your physiotherapist.<br>' +
                'Please scan the QR code on your handout to see your personalised plan.</p>'
            );
            return;
        }

        fetchCatalog()
            .then(function (catalog) {
                // Build a lookup map by ID
                var map = {};
                catalog.forEach(function (ex) {
                    if (ex.status === 'active') {
                        map[ex.id] = ex;
                    }
                });

                // Filter to requested exercises, preserving order
                var matched = [];
                var invalid = [];
                requestedIds.forEach(function (id) {
                    if (map[id]) {
                        matched.push(map[id]);
                    } else {
                        invalid.push(id);
                    }
                });

                // Render results
                app.innerHTML = '';

                // Warn about invalid IDs
                if (invalid.length > 0) {
                    var warn = document.createElement('div');
                    warn.className = 'message-box warning';
                    warn.innerHTML = '<strong>Note:</strong> Some exercise codes were not recognised and have been skipped (' +
                        escapeHtml(invalid.join(', ')) + ').';
                    app.appendChild(warn);
                }

                // No valid exercises at all
                if (matched.length === 0) {
                    showMessage(
                        '<h2>No matching exercises found</h2>' +
                        '<p>The exercise codes in your link could not be matched. ' +
                        'Please contact your physiotherapy department for a new plan.</p>',
                        'error'
                    );
                    return;
                }

                // Render each exercise card
                matched.forEach(function (ex) {
                    app.appendChild(createCard(ex));
                });
            })
            .catch(function (err) {
                showMessage(
                    '<h2>Unable to load exercises</h2>' +
                    '<p>' + escapeHtml(err.message) + '</p>',
                    'error'
                );
            });
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
})();
