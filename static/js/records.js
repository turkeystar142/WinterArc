(function () {
  'use strict';

  var KEYS = {
    CURRENT_WEEK: 'winterarc_current_week',
    ARCHIVE: 'winterarc_archive',
    tracker: function (week) {
      return 'winterarc_tracker_' + week;
    }
  };

  function getJSON(key, fallback) {
    try {
      var val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // Collect all week datasets: current week + all archived weeks
  function getAllWeekData() {
    var datasets = [];

    var currentWeekKey = localStorage.getItem(KEYS.CURRENT_WEEK);
    if (currentWeekKey) {
      var currentData = getJSON(KEYS.tracker(currentWeekKey), {});
      if (Object.keys(currentData).length > 0) {
        datasets.push(currentData);
      }
    }

    var archive = getJSON(KEYS.ARCHIVE, []);
    archive.forEach(function (entry) {
      if (entry.data && Object.keys(entry.data).length > 0) {
        datasets.push(entry.data);
      }
    });

    return datasets;
  }

  // Find the best (highest weight) entry for each exercise across all data
  function computeRecords(exerciseMeta, datasets) {
    var records = {};

    datasets.forEach(function (weekData) {
      var days = Object.keys(weekData);
      days.forEach(function (day) {
        var exercises = weekData[day];
        Object.keys(exercises).forEach(function (exerciseId) {
          var entry = exercises[exerciseId];
          if (entry.weight !== undefined && entry.weight !== '' && Number(entry.weight) > 0) {
            var weight = Number(entry.weight);
            if (!records[exerciseId] || weight > records[exerciseId].weight) {
              records[exerciseId] = {
                weight: weight,
                rpe: entry.rpe !== undefined && entry.rpe !== '' ? Number(entry.rpe) : null
              };
            }
          }
        });
      });
    });

    return records;
  }

  function renderRecords(exerciseMeta, records) {
    var container = document.getElementById('records-list');
    var emptyMsg = document.getElementById('records-empty');
    if (!container) return;

    // Sort exercises alphabetically by name
    var sorted = exerciseMeta.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    var hasAny = false;

    sorted.forEach(function (ex) {
      var record = records[ex.id];
      var card = document.createElement('div');
      card.className = 'record-card';

      if (record) {
        hasAny = true;
        var rpeText = record.rpe !== null ? 'RPE ' + record.rpe : '';
        var lbs = Math.round(record.weight * 2.20462 * 10) / 10;
        card.innerHTML =
          '<div class="record-info">' +
            '<span class="record-name">' + ex.name + '</span>' +
            '<div class="record-stats">' +
              '<span class="record-weight">' + record.weight + 'kg</span>' +
              (rpeText ? '<span class="record-rpe">' + rpeText + '</span>' : '') +
              '<span class="record-lbs">' + lbs + 'lbs</span>' +
            '</div>' +
          '</div>';
      } else {
        card.innerHTML =
          '<div class="record-info">' +
            '<span class="record-name">' + ex.name + '</span>' +
            '<div class="record-stats">' +
              '<span class="record-none">No data yet</span>' +
            '</div>' +
          '</div>';
      }

      container.appendChild(card);
    });

    if (hasAny && emptyMsg) {
      emptyMsg.style.display = 'none';
    }
  }

  function init() {
    var metaEl = document.getElementById('exercise-meta');
    if (!metaEl) return;

    var exerciseMeta;
    try {
      exerciseMeta = JSON.parse(metaEl.textContent);
    } catch (e) {
      return;
    }

    var datasets = getAllWeekData();
    var records = computeRecords(exerciseMeta, datasets);
    renderRecords(exerciseMeta, records);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
