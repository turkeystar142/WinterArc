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

  // Collect all week datasets with their week keys, sorted chronologically
  function getAllWeekEntries() {
    var entries = [];

    var archive = getJSON(KEYS.ARCHIVE, []);
    archive.forEach(function (entry) {
      if (entry.data && Object.keys(entry.data).length > 0) {
        entries.push({ week: entry.week, data: entry.data });
      }
    });

    var currentWeekKey = localStorage.getItem(KEYS.CURRENT_WEEK);
    if (currentWeekKey) {
      var currentData = getJSON(KEYS.tracker(currentWeekKey), {});
      if (Object.keys(currentData).length > 0) {
        entries.push({ week: currentWeekKey, data: currentData });
      }
    }

    // Sort by week key (YYYY-Www format sorts lexicographically)
    entries.sort(function (a, b) {
      return a.week.localeCompare(b.week);
    });

    return entries;
  }

  // Collect time-series data for a single exercise across all weeks
  function getExerciseTimeSeries(exerciseId, weekEntries) {
    var series = [];

    weekEntries.forEach(function (weekEntry) {
      var days = Object.keys(weekEntry.data);
      days.forEach(function (day) {
        var exercises = weekEntry.data[day];
        if (exercises[exerciseId]) {
          var entry = exercises[exerciseId];
          if (entry.weight !== undefined && entry.weight !== '' && Number(entry.weight) > 0) {
            series.push({
              week: weekEntry.week,
              day: day,
              weight: Number(entry.weight),
              rpe: (entry.rpe !== undefined && entry.rpe !== '') ? Number(entry.rpe) : null
            });
          }
        }
      });
    });

    return series;
  }

  // Map RPE (1-10) to a color: green (easy) → yellow (moderate) → red (hard)
  function rpeToColor(rpe) {
    if (rpe === null) return 'rgba(150, 150, 150, 0.9)'; // grey for unknown
    // Clamp to 1-10
    var val = Math.max(1, Math.min(10, rpe));
    // Normalize to 0-1
    var t = (val - 1) / 9;
    // Green (low RPE) → Yellow (mid) → Red (high RPE)
    var r, g, b;
    if (t < 0.5) {
      // green to yellow
      r = Math.round(255 * (t * 2));
      g = 200;
      b = 50;
    } else {
      // yellow to red
      r = 255;
      g = Math.round(200 * (1 - (t - 0.5) * 2));
      b = 50;
    }
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function renderChart(container, exercise, series) {
    var card = document.createElement('div');
    card.className = 'progress-card';

    var title = document.createElement('h3');
    title.className = 'progress-card-title';
    title.textContent = exercise.name;
    card.appendChild(title);

    if (series.length < 2) {
      var msg = document.createElement('p');
      msg.className = 'progress-card-empty';
      msg.textContent = series.length === 0
        ? 'No data yet.'
        : 'Need at least 2 data points to show a graph.';
      card.appendChild(msg);
      container.appendChild(card);
      return;
    }

    var canvas = document.createElement('canvas');
    card.appendChild(canvas);

    // Build legend
    var legend = document.createElement('div');
    legend.className = 'progress-legend';
    legend.innerHTML =
      '<span class="progress-legend-item"><span class="progress-legend-dot" style="background:#39c832"></span> Low RPE</span>' +
      '<span class="progress-legend-item"><span class="progress-legend-dot" style="background:#cccc32"></span> Mid RPE</span>' +
      '<span class="progress-legend-item"><span class="progress-legend-dot" style="background:#ff3232"></span> High RPE</span>' +
      '<span class="progress-legend-item"><span class="progress-legend-dot" style="background:#969696"></span> No RPE</span>';
    card.appendChild(legend);

    container.appendChild(card);

    var labels = series.map(function (d) { return d.week; });
    var weights = series.map(function (d) { return d.weight; });
    var pointColors = series.map(function (d) { return rpeToColor(d.rpe); });

    // Determine if the text color should be light or dark based on CSS variable
    var textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text').trim() || '#333';
    var mutedColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-muted').trim() || '#888';

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Weight (kg)',
          data: weights,
          borderColor: 'rgba(255, 97, 107, 0.8)',
          backgroundColor: 'rgba(255, 97, 107, 0.1)',
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: 6,
          pointHoverRadius: 8,
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function (context) {
                var d = series[context.dataIndex];
                var parts = [];
                if (d.rpe !== null) parts.push('RPE: ' + d.rpe);
                parts.push('Day: ' + d.day.charAt(0).toUpperCase() + d.day.slice(1));
                return parts.join('\n');
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { color: mutedColor, font: { family: 'Silkscreen', size: 10 } },
            grid: { color: 'rgba(150,150,150,0.15)' }
          },
          y: {
            title: {
              display: true,
              text: 'kg',
              color: mutedColor,
              font: { family: 'Silkscreen', size: 11 }
            },
            ticks: { color: mutedColor, font: { family: 'Silkscreen', size: 10 } },
            grid: { color: 'rgba(150,150,150,0.15)' }
          }
        }
      }
    });
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

    var weekEntries = getAllWeekEntries();
    var container = document.getElementById('progress-charts');
    var emptyMsg = document.getElementById('progress-empty');
    if (!container) return;

    var hasAnyData = false;

    exerciseMeta.forEach(function (exercise) {
      var series = getExerciseTimeSeries(exercise.id, weekEntries);
      if (series.length > 0) hasAnyData = true;
      renderChart(container, exercise, series);
    });

    if (hasAnyData && emptyMsg) {
      emptyMsg.style.display = 'none';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
