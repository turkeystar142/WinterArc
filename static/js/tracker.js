(function () {
  'use strict';

  var KEYS = {
    CURRENT_WEEK: 'winterarc_current_week',
    ARCHIVE: 'winterarc_archive',
    tracker: function (week) {
      return 'winterarc_tracker_' + week;
    }
  };

  // Returns ISO week key "YYYY-Www" (Monday-start weeks)
  function getCurrentWeekKey() {
    var now = new Date();
    var d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    var dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return d.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
  }

  function getJSON(key, fallback) {
    try {
      var val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Archive old week if we've moved to a new one
  function ensureCurrentWeek() {
    var currentWeek = getCurrentWeekKey();
    var storedWeek = localStorage.getItem(KEYS.CURRENT_WEEK);

    if (storedWeek && storedWeek !== currentWeek) {
      var oldData = getJSON(KEYS.tracker(storedWeek), {});
      if (Object.keys(oldData).length > 0) {
        var archive = getJSON(KEYS.ARCHIVE, []);
        archive.push({
          week: storedWeek,
          data: oldData,
          archivedAt: new Date().toISOString()
        });
        setJSON(KEYS.ARCHIVE, archive);
      }
      localStorage.removeItem(KEYS.tracker(storedWeek));
    }

    localStorage.setItem(KEYS.CURRENT_WEEK, currentWeek);
    return currentWeek;
  }

  function getTrackerState(weekKey) {
    return getJSON(KEYS.tracker(weekKey), {});
  }

  function setExerciseState(weekKey, day, exerciseId, checked) {
    var state = getTrackerState(weekKey);
    if (!state[day]) state[day] = {};
    state[day][exerciseId] = checked;
    setJSON(KEYS.tracker(weekKey), state);
  }

  function initTracker() {
    var weekKey = ensureCurrentWeek();

    // Update week label
    var weekLabel = document.getElementById('week-label');
    if (weekLabel) {
      weekLabel.textContent = 'Week: ' + weekKey;
    }

    // Restore checkbox states and bind listeners
    var state = getTrackerState(weekKey);
    var checkboxes = document.querySelectorAll('.exercise-checkbox');
    checkboxes.forEach(function (cb) {
      var day = cb.dataset.day;
      var exercise = cb.dataset.exercise;
      if (state[day] && state[day][exercise]) {
        cb.checked = true;
      }
      cb.addEventListener('change', function () {
        setExerciseState(weekKey, day, exercise, cb.checked);
      });
    });

    // Export button
    var exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', function () {
        exportLog(weekKey);
      });
    }
  }

  function exportLog(currentWeekKey) {
    var archive = getJSON(KEYS.ARCHIVE, []);
    var currentData = getTrackerState(currentWeekKey);

    var text = 'WINTER ARC — Workout Log\n';
    text += 'Exported: ' + new Date().toLocaleString() + '\n';
    text += '==================================================\n\n';

    // Current week first
    text += formatWeekText(currentWeekKey, currentData, true);

    // Archived weeks (newest first)
    archive.slice().reverse().forEach(function (entry) {
      text += formatWeekText(entry.week, entry.data, false);
    });

    // Download
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'winter-arc-log-' + currentWeekKey + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function formatWeekText(weekKey, data, isCurrent) {
    var text = 'WEEK: ' + weekKey + (isCurrent ? ' (current)' : '') + '\n';
    text += '------------------------------\n';
    var days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    var hasAny = false;

    days.forEach(function (day) {
      if (data[day]) {
        hasAny = true;
        text += '  ' + day.charAt(0).toUpperCase() + day.slice(1) + ':\n';
        Object.keys(data[day]).forEach(function (ex) {
          var mark = data[day][ex] ? '[x]' : '[ ]';
          text += '    ' + mark + ' ' + ex.replace(/-/g, ' ') + '\n';
        });
      }
    });

    if (!hasAny) {
      text += '  (no exercises tracked)\n';
    }

    text += '\n';
    return text;
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracker);
  } else {
    initTracker();
  }
})();
