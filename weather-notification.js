// Weather Notification JavaScript
// by Brian Kummer, 2017
//
// Get all weather info necessary for my weather notification. Example:
//   33° (25°) - Greensburg
//   High: 36°  Low: 24°  Precip: 40%  SS: 7:15p
// Notes
//   - Are day and night icons
//   - Alerts change background color of icon for warning/watch/advisory
//   - Temp in paren is feels like temp because difference from temp is > 5°
//
// Data is from Weather Underground api
//   Temp....................current_observation.temp_f
//   Feels like temp.........current_observation.feelslike_f
//   City....................current_observation.city
//   icon....................current_obesrvation.icon_url (then extract filename)
//   Forecast high...........forecast.simpleforecast.forecastday[0].high.fahrenheit
//   Forecast low............forecast.simpleforecast.forecastday[0].low.fahrenheit
//   Probability of precip...forecast.simpleforecast.forecastday[0].pop
//   Sunset time.............sun_phase.sunset.hour + ":" + sun_phase.sunset.minute + "p"
//
// Alerts
//   - It looks like Weather Underground api doesn't always return all alerts, only most recent one
//   - Then again, National Weather Service isn't always up-to-date either
//   - So I will also query DarkSky api and also use that list of alerts
//   - DarkSky requires latitude and longitude to make query. Since Weather Underground can
//     also take this as a query, will pass that to both api's
//   - Weather Undrground: https://www.wunderground.com/weather/api/d/docs
//   - DarkSky: https://darksky.net/dev/docs
// Requires the following JavaScripts:
//   - No external libraries

// Constants - I have my api secret keys hard-coded in the queries
const WUNDERGROUND_URL = 'http://api.wunderground.com/api/70d1b781588f20b0/forecast/conditions/alerts/astronomy/lang:en/q/{latitude_longitude}.json';
const DARKSKY_URL = 'https://api.darksky.net/forecast/86c774963f20bfceef86e20f4fefaf30/{latitude_longitude}?exclude=currently,minutely,hourly,daily,flags&units=us&lang=en';

// Input variables from Tasker
var previous_alerts = global('WeatherAlertsPrevious');   // Alerts from the last time notification was updated
var interrupt_mode = global('INTERRUPT');                // Interruptions: none(silent)|all(all notifications)|some
// var latitude_longitude;                               // When GPS is ojn, Tasker will use %LOC, else hard-code Greensburg
// var skip_notifications;

// Output variables to Tasker
var notification_title;
var notification_text;
var notification_for_previous;
var notification_subtext;
var notification_vibration_pattern;
var notification_icon;
var notification_icon_backcolor;
var notification_sound;
var js_error_title = null;
var js_error_text = null;

// Debugging on a PC:
//   - In the HTML test file, include Tasker.js, which defines stubs
//     for Tasker's JS functions like setLocal
//   - Variable onAndroid is true if running on Android, false if running
//     on PC
//   - Any input variables from Tasker should be assigned test values here
var onAndroid = (global('SDK') > 0);
if (!onAndroid) {
  alert('NOT running on Android');

  var skip_notifications = false;
  var latitude_longitude = "40.3014581,-79.5389289";   // Greensburg
  //var latitude_longitude = "36.327728,-119.645912";    // Hanford CA

  interrupt_mode = "all";
  previous_alerts = "Winter Weather Advisory-1489083600-1489154000";
}

// Other global variables
var jsCheckpoint = '';
var forecast;
var alerts = [];

main();



function main() {

  jsCheckpoint = '1';

  var url = WUNDERGROUND_URL.replace("{latitude_longitude}", latitude_longitude);
  fetch(url)
    .then(r => r.text())

    // Process Weather Underground data
    .then(data => {
      jsCheckpoint = '2';

      try {
        var weather_data = JSON.parse(data);

        // Set notification title
        jsCheckpoint = '3';
        var tempF = Math.round(weather_data.current_observation.temp_f);
        var feelsLikeF = Math.round(weather_data.current_observation.feelslike_f);
        notification_title =
          tempF + "°" +
          ((Math.abs(feelsLikeF - tempF) > 5) ? " (" + feelsLikeF + "°) " : "") +
          " - " + weather_data.current_observation.display_location.city;

        // Set forecast. Until we determine alerts, we are yet sure where in the
        // notification this will go.
        forecast =
          "High: " + weather_data.forecast.simpleforecast.forecastday[0].high.fahrenheit + "°   " +
          "Low: " + weather_data.forecast.simpleforecast.forecastday[0].low.fahrenheit + "°   " +
          "Precip: " + weather_data.forecast.simpleforecast.forecastday[0].pop + "%   " +
          "SS: " + (weather_data.sun_phase.sunset.hour-12) + ":" + weather_data.sun_phase.sunset.minute + "p";

        notification_icon = weather_data.current_observation.icon_url.match(/.*\/(.+?)\.gif/)[1];

        // Get the description of each alert
        alerts = weather_data.alerts.map(a => {
          //if (!onAndroid) console.log("WU: " + a.description+"-"+a.date_epoch+"-"+a.expires_epoch);
          return {
            description: a.description,
            sortOrder: calculateSortOrder(a.description),
            times: a.date_epoch + "-" + a.expires_epoch
          };
        });

        // Get alerts from DarkSky, excluding any "outlooks"
        var url = DARKSKY_URL.replace("{latitude_longitude}", latitude_longitude);
        fetch(url)
          .then(r => r.text())
          .then(data => {
            jsCheckpoint = '4';

            try {
              var weather_data = JSON.parse(data);

              var new_alerts = [];
              if (weather_data.hasOwnProperty("alerts")) {
                new_alerts = weather_data.alerts
                  .map(a => {
                    //if (!onAndroid) console.log("DarkSky: " + a.title+"-"+a.time+"-"+a.expires);
                    return {
                      description: a.title,
                      sortOrder: calculateSortOrder(a.title),
                      times: a.time + "-" + a.expires
                    };
                  })
                  .filter(a => !a.description.match(/outlook/i));
              }

              // Combine alerts from Weather Underground and DarkSky, filter out
              // duplicates, and sort by warning/watch/advisory
              alerts = alerts
                .concat(new_alerts)
                .filter((item, index, all) => {
                  var firstItem = all.findIndex(function (item2) {
                    return (item2.description) === (item.description);
                  });
                  return firstItem === index;
                })
                .sort(function (a, b) {
                  return b.sortOrder < a.sortOrder;
                });

              // Create the notification
              // Set defaults
              notification_vibration_pattern = "0";
              notification_icon_backcolor = "#9d9d9d";
              notification_sound = null;

              // Handle warnings, watches, and advisories
              if (alerts.length > 0)
              {
                notification_text = alerts.map(a => a.description).join(", ");
                notification_for_previous = alerts.map(a => a.description + "-" + a.times).join(", ");

                //if (!onAndroid) console.log("Alerts for Previous: " + notification_for_previous);

                notification_subtext = forecast;

                if (notification_text.match(/warning/i)) {
                  notification_vibration_pattern = "0,500,500,1000,500,1500,500,2000";
                  notification_icon_backcolor = "#8b1000";
                  notification_sound = "Weather Warning.wav";
                } else if (notification_text.match(/watch/i)) {
                  notification_vibration_pattern = "0,1250";
                  notification_icon_backcolor = "#ff7406";
                } else if (notification_text.match(/advisory/i)) {
                  notification_vibration_pattern = "0,500";
                  notification_icon_backcolor = "#eb9d00";
                }
              } else {
                notification_text = forecast;
                notification_subtext = null;
              }

              if (!notifyMeOfThisAlert(alerts, previous_alerts)) {
                //if (!onAndroid) console.log("Do -NOT- notify me of these alerts");
                notification_vibration_pattern = "0";
                notification_sound = null;
              } else {
                //if (!onAndroid) console.log("-DO- notify me of these alerts");
              }

              setTaskerVariablesAndExit(null);
            } catch (ex) {
              setTaskerVariablesAndExit(ex)
            }
          });
      } catch (ex) {
        setTaskerVariablesAndExit(ex)
      }
    })
}


function setTaskerVariablesAndExit(ex) {
  if (!onAndroid) console.log(
    'notification_title: ' + notification_title + '\n' +
    'notification_text:' + notification_text + '\n' +
    'notification_for_previous:' + notification_for_previous + '\n' +
    'notification_subtext: ' + notification_subtext + '\n' +
    'notification_vibration_pattern: ' + notification_vibration_pattern + '\n' +
    'notification_icon: ' + notification_icon + '\n' +
    'notification_icon_backcolor: ' + notification_icon_backcolor + '\n' +
    'notification_sound: ' + notification_sound);

  setLocal('notification_title', notification_title);
  setLocal('notification_text', notification_text);
  setLocal('notification_for_previous', notification_for_previous);
  setLocal('notification_subtext', notification_subtext);
  setLocal('notification_vibration_pattern', notification_vibration_pattern);
  setLocal('notification_icon', notification_icon);
  setLocal('notification_icon_backcolor', notification_icon_backcolor);
  setLocal('notification_sound', notification_sound);

  if (ex != null) {
    setLocal('js_error_title', 'Weather Notification');
    setLocal('js_error_text', jsCheckpoint + ':' + ex.message);
  }
  exit();
}


function calculateSortOrder(alertTitle) {
  var sortOrder =
    alertTitle.match(/warning/i) ? 1 :
    alertTitle.match(/watch/i) ? 2 :
    3;

  return sortOrder;
}


function notifyMeOfThisAlert(currentAlerts, previousAlertsAsString) {
  // Notify me if
  //   - I do not have my phone silenced (when silenced, interrupt_mode = "none")
  //   - I should not skip weather noptifications (e.g. we skip notifications when user just opened weather app and we're refreshing)
  //   - There is not a new alert
  //       Subtract all of the previous alerts from the currrent alerts.
  //       If there's anything left, it's a new and i want notified
  // Inputs
  //   currentAlerts............Is an array of {description:xxx, sortOrder:x} objects
  //   previousAlertsAsString...Is a string like "Winter Storm Warning, High Wind Advistory"

  var previousAlerts =
        (previousAlertsAsString == null)
          ? []
          : previousAlertsAsString.replace(/,\s/g, ",").split(",");

  var newAlerts = currentAlerts.filter( ca => previousAlerts.indexOf( ca.description+"-"+ca.times ) === -1);

  var notifyMe =
        (newAlerts.length > 0) &&      // There is a new warning/watch/advisory since the last time
        (interrupt_mode != "none") &&  // Phone is not on silent
        (!skip_notifications);         // Not told to skip notifications, such as when opening weather app and refreshing notification

  return notifyMe;
}