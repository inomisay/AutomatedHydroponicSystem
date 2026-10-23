(function () {
  'use strict';

  var SENSORS = window.SENSORS || [];
  var REFRESH_MS = 60 * 1000;
  var STALE_MS = 30 * 60 * 1000; // same threshold the server uses for sensor status
  var charts = {};

  // ---------- Helpers ----------
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  function getJSON(url) {
    return fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var err = new Error(body.message || body.error || ('Request failed (' + res.status + ')'));
          err.status = res.status;
          throw err;
        }
        return body;
      });
    });
  }

  function isNumber(v) { return typeof v === 'number' && isFinite(v); }

  function format(value, sensor) {
    return isNumber(value) ? value.toFixed(sensor.decimals) : '—';
  }

  function withUnit(value, sensor) {
    var text = format(value, sensor);
    return text !== '—' && sensor.unit ? text + ' ' + sensor.unit : text;
  }

  // Where a value sits relative to the sensor's healthy range
  function rangeState(value, sensor) {
    if (!isNumber(value) || value === 0) return { cls: 'state-muted', text: 'No data' };
    var span = sensor.max - sensor.min;
    if (value < sensor.min) return { cls: value < sensor.min - span * 0.25 ? 'state-bad' : 'state-warn', text: 'Low' };
    if (value > sensor.max) return { cls: value > sensor.max + span * 0.25 ? 'state-bad' : 'state-warn', text: 'High' };
    return { cls: 'state-ok', text: 'Optimal' };
  }

  function timeAgo(date) {
    var seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + ' min ago';
    var hours = Math.round(minutes / 60);
    if (hours < 48) return hours + ' h ago';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function setPill(el, cls, text) {
    if (!el) return;
    el.className = 'pill ' + cls;
    $('.pill-text', el).textContent = text;
  }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function hexToRgba(hex, alpha) {
    var n = parseInt(hex.replace('#', ''), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  // ---------- Charts ----------
  // Shades the healthy range behind each line
  var targetBand = {
    id: 'targetBand',
    beforeDatasetsDraw: function (chart, args, opts) {
      if (!opts || !isNumber(opts.min) || !isNumber(opts.max)) return;
      var area = chart.chartArea;
      var y = chart.scales.y;
      var top = Math.max(y.getPixelForValue(opts.max), area.top);
      var bottom = Math.min(y.getPixelForValue(opts.min), area.bottom);
      if (bottom <= top) return;
      var ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = opts.color;
      ctx.fillRect(area.left, top, area.right - area.left, bottom - top);
      ctx.restore();
    }
  };

  // Shows a placeholder over the chart; an empty message hides it
  function setChartEmpty(sensor, message) {
    var canvas = document.getElementById('chart-' + sensor.key);
    if (!canvas) return;
    var empty = $('.chart-empty', canvas.parentNode);
    empty.textContent = message;
    empty.classList.toggle('d-none', !message);
    canvas.classList.toggle('invisible', !!message);
  }

  function renderChart(sensor, labels, dates, values) {
    var canvas = document.getElementById('chart-' + sensor.key);
    if (!canvas) return;
    var box = canvas.parentNode;
    var hasData = values.some(isNumber);
    setChartEmpty(sensor, hasData ? '' : 'No readings yet');

    var rangeEl = $('[data-range="' + sensor.key + '"]');
    var nums = values.filter(isNumber);
    if (rangeEl) {
      rangeEl.textContent = nums.length
        ? 'Min ' + format(Math.min.apply(null, nums), sensor) + ' · Max ' + format(Math.max.apply(null, nums), sensor)
        : '';
    }

    if (charts[sensor.key]) {
      var existing = charts[sensor.key];
      existing.data.labels = labels;
      existing.data.datasets[0].data = values;
      existing.$dates = dates;
      existing.update();
      return;
    }

    var muted = cssVar('--muted') || '#6b7568';
    var grid = cssVar('--grid') || 'rgba(0,0,0,.06)';

    var chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: sensor.label,
          data: values,
          borderColor: sensor.color,
          backgroundColor: function (context) {
            var area = context.chart.chartArea;
            if (!area) return hexToRgba(sensor.color, 0.1);
            var gradient = context.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
            gradient.addColorStop(0, hexToRgba(sensor.color, 0.22));
            gradient.addColorStop(1, hexToRgba(sensor.color, 0));
            return gradient;
          },
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          spanGaps: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: sensor.color
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 }
          },
          y: {
            grace: '10%',
            grid: { color: grid },
            border: { display: false },
            ticks: { color: muted, maxTicksLimit: 5 },
            suggestedMin: sensor.min,
            suggestedMax: sensor.max
          }
        },
        plugins: {
          legend: { display: false },
          targetBand: { min: sensor.min, max: sensor.max, color: hexToRgba('#71c55d', 0.1) },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: function (items) {
                var i = items[0].dataIndex;
                var d = chart.$dates && chart.$dates[i];
                return (d ? d + ' ' : '') + items[0].label;
              },
              label: function (item) { return sensor.label + ': ' + withUnit(item.parsed.y, sensor); }
            }
          }
        }
      },
      plugins: [targetBand]
    });
    chart.$dates = dates;
    charts[sensor.key] = chart;
  }

  // ---------- Data ----------
  function loadHistory() {
    return getJSON('/sensor-data').then(function (data) {
      var labels = data.timestamps || [];
      var dates = data.dates || [];
      SENSORS.forEach(function (sensor) {
        // 0 is what the logger stores for a missing reading — don't plot it
        var values = (data[sensor.key] || []).map(function (v) { return isNumber(v) && v !== 0 ? v : null; });
        renderChart(sensor, labels, dates, values);
      });
    }).catch(function (err) {
      // Keep previously drawn charts; only placeholder the ones never drawn
      SENSORS.forEach(function (sensor) {
        if (!charts[sensor.key]) setChartEmpty(sensor, err.status === 404 ? 'No readings yet' : 'Data unavailable');
      });
      throw err;
    });
  }

  function loadLatest() {
    return getJSON('/latest-sensor-data').then(function (reading) {
      SENSORS.forEach(function (sensor) {
        var value = reading[sensor.reading];
        var tile = $('[data-kpi="' + sensor.key + '"]');
        if (tile) {
          var state = rangeState(value, sensor);
          $('[data-value]', tile).textContent = value === 0 ? '—' : format(value, sensor);
          var stateEl = $('[data-state]', tile);
          stateEl.className = 'kpi-state ' + state.cls;
          stateEl.textContent = state.text;
        }
        var latestCell = $('[data-latest="' + sensor.key + '"]');
        if (latestCell) latestCell.textContent = value === 0 ? '—' : withUnit(value, sensor);
      });

      var when = reading.recordedAt ? new Date(reading.recordedAt) : null;
      var label = reading.Date && reading.Time
        ? reading.Time.slice(0, 5) + ', ' + reading.Date
        : (when ? when.toLocaleString() : '—');
      $('#last-reading').textContent = label + (when ? ' (' + timeAgo(when) + ')' : '');
      return when;
    });
  }

  function loadStatus() {
    return getJSON('/sensor-status').then(function (status) {
      $all('[data-status]').forEach(function (el) {
        var value = status[el.getAttribute('data-status')] || 'Offline';
        setPill(el, value === 'Online' ? 'pill-ok' : 'pill-bad', value);
      });
      if (status.statusDate) {
        $('#status-updated').textContent = timeAgo(new Date(status.statusDate));
      }
    });
  }

  function showAlert(message) {
    var alert = $('#data-alert');
    alert.textContent = message || '';
    alert.classList.toggle('d-none', !message);
  }

  function refresh() {
    var btn = $('#refresh-btn');
    btn.classList.add('is-loading');
    btn.disabled = true;

    var history = loadHistory();
    var latest = loadLatest();
    var status = loadStatus();

    return Promise.allSettled([history, latest, status]).then(function (results) {
      var failed = results.filter(function (r) { return r.status === 'rejected'; });
      var pill = $('#connection-pill');
      var lastSeen = results[1].status === 'fulfilled' ? results[1].value : null;

      if (failed.length === results.length) {
        var reason = failed[0].reason || {};
        setPill(pill, 'pill-bad', 'Unavailable');
        showAlert(reason.status === 404
          ? 'No readings have been recorded yet. Data will appear here once the system starts logging.'
          : 'Couldn’t reach the sensor database. Retrying automatically…');
      } else if (lastSeen && Date.now() - lastSeen.getTime() > STALE_MS) {
        setPill(pill, 'pill-warn', 'Offline');
        showAlert('The system hasn’t reported for ' + timeAgo(lastSeen).replace(' ago', '') +
          '. Showing the most recent readings that were recorded.');
      } else {
        setPill(pill, 'pill-ok', 'Live');
        showAlert(failed.length ? 'Some data couldn’t be loaded. Retrying automatically…' : '');
      }

      failed.forEach(function (r) { console.error(r.reason); });
    }).finally(function () {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    });
  }

  // ---------- Init ----------
  if (window.Chart) {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  }

  $('#refresh-btn').addEventListener('click', refresh);
  refresh();
  setInterval(function () {
    if (!document.hidden) refresh();
  }, REFRESH_MS);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh();
  });
})();
