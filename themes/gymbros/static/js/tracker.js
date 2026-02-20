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

  function updateExercise(weekKey, day, exerciseId, field, value) {
    var state = getTrackerState(weekKey);
    if (!state[day]) state[day] = {};
    var entry = state[day][exerciseId] || {};
    entry[field] = value;
    state[day][exerciseId] = entry;
    setJSON(KEYS.tracker(weekKey), state);
  }

  function initTracker() {
    var weekKey = ensureCurrentWeek();

    // Update week label
    var weekLabel = document.getElementById('week-label');
    if (weekLabel) {
      weekLabel.textContent = 'Week: ' + weekKey;
    }

    var state = getTrackerState(weekKey);

    // Restore checkbox states and bind listeners
    var checkboxes = document.querySelectorAll('.exercise-checkbox');
    checkboxes.forEach(function (cb) {
      var day = cb.dataset.day;
      var exercise = cb.dataset.exercise;
      var entry = state[day] && state[day][exercise];
      if (entry && entry.done) {
        cb.checked = true;
      }
      cb.addEventListener('change', function () {
        updateExercise(weekKey, day, exercise, 'done', cb.checked);
      });
    });

    // Restore weight selects and bind listeners
    var weightSelects = document.querySelectorAll('.exercise-weight');
    weightSelects.forEach(function (sel) {
      var day = sel.dataset.day;
      var exercise = sel.dataset.exercise;
      var entry = state[day] && state[day][exercise];
      if (entry && entry.weight !== undefined && entry.weight !== '') {
        sel.value = String(entry.weight);
      }
      sel.addEventListener('change', function () {
        var val = sel.value === '' ? '' : Number(sel.value);
        updateExercise(weekKey, day, exercise, 'weight', val);
      });
    });

    // Restore RPE selects and bind listeners
    var rpeSelects = document.querySelectorAll('.exercise-rpe');
    rpeSelects.forEach(function (sel) {
      var day = sel.dataset.day;
      var exercise = sel.dataset.exercise;
      var entry = state[day] && state[day][exercise];
      if (entry && entry.rpe !== undefined && entry.rpe !== '') {
        sel.value = String(entry.rpe);
      }
      sel.addEventListener('change', function () {
        var val = sel.value === '' ? '' : Number(sel.value);
        updateExercise(weekKey, day, exercise, 'rpe', val);
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
          var entry = data[day][ex];
          var mark = entry.done ? '[x]' : '[ ]';
          var label = ex.replace(/-/g, ' ');
          var details = '';
          if (entry.weight !== undefined && entry.weight !== '') {
            details += entry.weight + 'kg';
          }
          if (entry.rpe !== undefined && entry.rpe !== '') {
            details += (details ? ' @ ' : '') + 'RPE ' + entry.rpe;
          }
          if (details) {
            text += '    ' + mark + ' ' + label + ' — ' + details + '\n';
          } else {
            text += '    ' + mark + ' ' + label + '\n';
          }
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
