(function ($) {
  'use strict';

  // Fetch sensor status and timestamps
  function fetchSensorStatus() {
    $.ajax({
      url: '/sensor-status',
      method: 'GET',
      success: function (data) {
        console.log('*****************************************************');
        console.log('Sensor Status data:', data); // Check the data received
        updateSensorStatus(data); // Update with the received sensor data
      },
      error: function (error) {
        console.error('Error fetching sensor status:', error);
      }
    });
  }

  // Update sensor status and last update time in the table
  function updateSensorStatus(sensors) {
    sensors.forEach(sensor => {
      // Helper function to determine status based on value
      const determineStatus = (value) => {
        return (value === null || isNaN(value) || value === '') ? 'Offline' : 'Online';
      };

      // Get sensor status and update the element
      const status = determineStatus(sensor.status);
      const statusElement = $(`#${sensor.id}-status`);
      statusElement.text(status === 'Online' ? 'Online' : 'Offline');
      statusElement.removeClass('badge-gradient-success badge-gradient-danger');
      statusElement.addClass(status === 'Online' ? 'badge badge-gradient-success' : 'badge badge-gradient-danger');
    });
  }


  // Fetch sensor data for charts
  function fetchSensorData() {
    $.ajax({
      url: '/sensor-data',
      method: 'GET',
      success: function (data) {
        updateCharts(data);
      },
      error: function (error) {
        console.error('Error fetching sensor data:', error);
      }
    });
  }

  // Update charts with fetched data
  function updateCharts(data) {
    var EnvironmentTemperatureData = {
      labels: generateLabels(),
      datasets: [{
        label: '°C Temperature',
        data: data.environmentTemperature,
        backgroundColor: ['rgba(255, 99, 132, 0.2)'],
        borderColor: ['rgb(242, 64, 133)'],
        borderWidth: 1,
        fill: true
      }]
    };

    var waterTemperatureData = {
      labels: generateLabels(),
      datasets: [{
        label: '°C Water Temperature',
        data: data.waterTemperature,
        backgroundColor: ['rgba(54, 162, 235, 0.2)'],
        borderColor: ['rgb(54, 162, 235)'],
        borderWidth: 1,
        fill: true
      }]
    };

    var humidityData = {
      labels: generateLabels(),
      datasets: [{
        label: 'Humidity',
        data: data.humidity,
        backgroundColor: ['rgba(255, 159, 64, 0.2)'],
        borderColor: ['rgb(255, 159, 64)'],
        borderWidth: 1,
        fill: true
      }]
    };

    var waterLevelData = {
      labels: generateLabels(),
      datasets: [{
        label: 'Water Level',
        data: data.waterLevel,
        backgroundColor: ['rgba(75, 192, 192, 0.2)'],
        borderColor: ['rgb(75, 192, 192)'],
        borderWidth: 1,
        fill: true
      }]
    };

    var tdsData = {
      labels: generateLabels(),
      datasets: [{
        label: 'TDS Levels',
        data: data.tds,
        backgroundColor: 'rgba(255, 193, 7, 0.6)',
        borderColor: 'rgb(255, 193, 7)',
        borderWidth: 1
      }]
    };

    var phData = {
      labels: generateLabels(),
      datasets: [{
        label: 'pH Levels',
        data: data.ph,
        backgroundColor: ['rgba(153, 102, 255, 0.2)'],
        borderColor: ['rgb(153, 102, 255)'],
        borderWidth: 1
      }]
    };

    updateChart('EnvironmentTemperature', EnvironmentTemperatureData);
    updateChart('WaterTemperature', waterTemperatureData);
    updateChart('Humidity', humidityData);
    updateChart('WaterLevel', waterLevelData);
    updateChart('TDS', tdsData, 'bar');
    updateChart('PH', phData, 'bar');
  }

  // Function to generate labels from "00:00" to "23:00"
  function generateLabels() {
    var labels = [];
    var currentTime = new Date();

    for (var i = 23; i >= 0; i--) {
      var pastTime = new Date(currentTime.getTime() - i * 60 * 60 * 1000); // Subtract i hours
      var hour = pastTime.getHours();
      var minutes = pastTime.getMinutes();
      
      // Format hours and minutes with leading zeros if needed
      var formattedTime = (hour < 10 ? '0' : '') + hour + ':' + (minutes < 10 ? '0' : '') + minutes;
      
      labels.push(formattedTime);
    }

    return labels;
  }

  // Update chart
  function updateChart(chartId, chartData, chartType = 'line') {
    var ctx = $('#' + chartId).get(0).getContext('2d');
    if (ctx.chart) {
      ctx.chart.data = chartData;
      ctx.chart.update();
    } else {
      ctx.chart = new Chart(ctx, {
        type: chartType,
        data: chartData,
        options: {
          elements: {
            line: {
              tension: 0.5
            }
          },
          plugins: {
            filler: {
              propagate: true
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  // Fetch RTC date
  function fetchRTCDate() {
    $.ajax({
      url: '/rtc-date',
      method: 'GET',
      success: function (data) {
        $('.current-date').text(data.date); // Update the date on the page
        $('.current-time').text(data.time); // Update the time on the page
      },
      error: function (error) {
        console.error('Error fetching RTC date:', error);
      }
    });
  }
   
  // Initialize the page with current sensor status and data
  function initializePage() {
    fetchSensorStatus();
    fetchRTCDate();
    fetchSensorData();
  }

  // Call initialization function
  initializePage();

  // Date
  if ($("#inline-datepicker").length) {
    $('#inline-datepicker').datepicker({
      enableOnReadonly: true,
      todayHighlight: true,
    });
  }
  if ($.cookie('purple-pro-banner') != "true") {
    document.querySelector('#proBanner').classList.add('d-flex');
    document.querySelector('.navbar').classList.remove('fixed-top');
  } else {
    document.querySelector('#proBanner').classList.add('d-none');
    document.querySelector('.navbar').classList.add('fixed-top');
  }

  if ($(".navbar").hasClass("fixed-top")) {
    document.querySelector('.page-body-wrapper').classList.remove('pt-0');
    document.querySelector('.navbar').classList.remove('pt-5');
  } else {
    document.querySelector('.page-body-wrapper').classList.add('pt-0');
    document.querySelector('.navbar').classList.add('pt-5');
    document.querySelector('.navbar').classList.add('mt-3');

  }
  document.querySelector('#bannerClose').addEventListener('click', function () {
    document.querySelector('#proBanner').classList.add('d-none');
    document.querySelector('#proBanner').classList.remove('d-flex');
    document.querySelector('.navbar').classList.remove('pt-5');
    document.querySelector('.navbar').classList.add('fixed-top');
    document.querySelector('.page-body-wrapper').classList.add('proBanner-padding-top');
    document.querySelector('.navbar').classList.remove('mt-3');
    var date = new Date();
    date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
    $.cookie('purple-pro-banner', "true", {
      expires: date
    });
  });
})(jQuery);
