// Build a Traffic Notification
// by Brian Kummer, 2015
//
// Requires the following JavaScripts:
//   moment.js..........Library for working with JavaScript dates
//                      (http://momentjs.com/downloads/moment.min.js)
//
// Google's Directions API does factor in traffic, but does not provide
// any text describing congestion or accidents, etc. So I will continue
// to use Bing's API.
//
// This script queries Bing maps for traffic information about a
// route (typically either work-to-home, or home-to-kosports-canonsburg),
// analyzes it, and returns information for Tasker to build a traffic
// notification.
//
// Sample url:
// http://dev.virtualearth.net/REST/v1/Routes?waypoint.1=336+4th+ave+pittsburgh+pa&waypoint.2=240+wren+dr+greensburg+pa&optimize=timeWithTraffic&distanceUnit=mile&key=Ao0hCVI-pX5Eijv_lwCvGAr65QcuSS59eH5Jv_C6uhvZwiEji2Ko_MxYPRxAHMYP&timeType=departure&dateTime=15:30:00
//
// Notes:
//   - I once saw an accident reported in warnings:
//     {
//       "origin":"40.432008,-79.745905",
//       "severity":"Minor",
//       "text":"Minor Accident: At US-30\/Exit 7 - Accident.",
//       "to":"40.407408,-79.719812",
//       "warningType":"Accident"
//     }
//   - Useful website to parse JSON data: http://json.parser.online.fr/

// Dependencies
const DIRECTIONS_BASE_URL = 'http://dev.virtualearth.net/REST/v1/Routes?optimize=timeWithTraffic&distanceUnit=mile&key=Ao0hCVI-pX5Eijv_lwCvGAr65QcuSS59eH5Jv_C6uhvZwiEji2Ko_MxYPRxAHMYP&timeType=departure';

// Input variables from Tasker
// var directions_query
// var notification_action_map;
// var notification_action_traffic;

// Output variables to Tasker
var notification_text = null;
var notification_text_expanded = null;
var notification_subtext = null;
var notification_action = null;
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
  var directions_query = '&waypoint.1=336+fourth+ave,pittsburgh,pa&waypoint.2=240+wren+dr,greensburg,pa&dateTime=15:45:00';
  var notification_action_map = '';
  var notification_action_traffic = '';
}

// Other global variables
var jsCheckpoint = '1';



try {
  getDirections(0, 5, DIRECTIONS_BASE_URL + directions_query);
}
catch (ex) {
  returnErrorToTasker(ex.message);
}



function getDirections(tryCount, maxTryCount, directionsUrl) {
  try {
    tryCount++;
    if (tryCount > 1)
    {
      sleep(500 + (tryCount*250)); // Try 2=1000, 3=1250, 4=1500, 5=1750
      if (!onAndroid) console.log('Retrying #' + tryCount);
    }

    fetch(directionsUrl)
      .then(response => {
        if (!response.ok) {
          // Handle some kind of HTTP error
          if (tryCount < maxTryCount) {
            getDirections(tryCount, maxTryCount, directionsUrl);
          }
          else {
            returnErrorToTasker('HTTP: ' + response.statusText);
          }
        }
        else
        {
          // We have trip info, so go process it
          response.text().then(responseText => {
            processTrafficData(JSON.parse(responseText, 'text/html'));
          });
        }
      })
      .catch(error => {
        // Handle a network error
        if (tryCount < maxTryCount) {
          getDirections(tryCount, maxTryCount, directionsUrl);
        }
        else {
          returnErrorToTasker('NETWORK: ' + error);
        }
      });
  }
  catch (ex) {
    returnErrorToTasker(ex.message);
  }
}


function returnErrorToTasker(errorText) {
  js_error_title = 'Traffic';
  js_error_text = '#' + jsCheckpoint + ':' + errorText

  setLocal('js_error_title', js_error_title);
  setLocal('js_error_text', errorText);

  if (!onAndroid) console.log('ERROR: ' + errorText);

  exit();
}



function processTrafficData(tripInfo) {
  var tripTimeDuration = null;
  var tripTimeText = '';
  var tripCongestion = '';
  var warnings = [];

  try {
    if (tripInfo === null) {
      notification_text = 'Error retrieving traffic info';
      notification_text_expanded = notification_text;
      notification_subtext = 'Click to try again';
      notification_action = notification_action_traffic;
    }
    else {
      tripTimeText = '';
      tripTimeDuration = moment.duration(
        tripInfo.resourceSets[0].resources[0].travelDurationTraffic, 'seconds');
      if (tripTimeDuration.hours() > 0) {
        tripTimeText += simplePluralize(tripTimeDuration.hours(), ' hour') + ' ';
      }
      if (tripTimeDuration.minutes() > 0 || tripTimeDuration.hours() === 0) {
        tripTimeText += simplePluralize(tripTimeDuration.minutes(), ' minute');
      }
      tripTimeText = tripTimeText.trim();
      tripCongestion = tripInfo.resourceSets[0].resources[0].trafficCongestion.replace('None', 'No');
      warnings = parseWarnings(tripCongestion, tripInfo);

      notification_text = tripTimeText + ', ' + tripCongestion + ' congestion';
      notification_text_expanded = notification_text + '\n' + '   >> ' + warnings.join(', ');
      notification_subtext = warnings.join(', ');
      notification_action = notification_action_map;

      if (!onAndroid) console.log(
        'notification_text=' + notification_text + '\n' +
        'notification_text_expanded=' + notification_text_expanded + '\n' +
        'notification_subtext=' + notification_subtext);

      setLocal('notification_text', notification_text);
      setLocal('notification_text_expanded', notification_text_expanded);
      setLocal('notification_subtext', notification_subtext);
      exit();
    }
  }
  catch (ex) {
    returnErrorToTasker(ex.message);
  }
}


function simplePluralize(numItems, itemText) {
  return numItems + ' ' + itemText + (numItems !== 1 ? 's' : '');
}


function parseWarnings(tripCongestion, tripInfo) {
  var warnings = [];
  var itineraryItems = tripInfo.resourceSets[0].resources[0].routeLegs[0].itineraryItems;
  var itemWarnings = [];

  for (var i = 0, curItineraryItem; curItineraryItem = itineraryItems[i]; i++) {
    itemWarnings = itineraryItems[i].warnings;
    if (itemWarnings !== undefined) {

      for (var j = 0, curWarning; curWarning = itemWarnings[j]; j++) {
        if (curWarning.warningType.match(/toll/i)) {
          // I don't care about toll warnings
        }
        else if (curWarning.warningType.match(/accident/i)) {
          // For accidents, we don't want the long text ("Minor Accident: At US-30/Exit 7 - Accident.")
          // in the notification- the word "Accident" is sufficient
           warnings.push('Accident');

          vibratePattern('0,500,500,1000,500,1500,500,2000');
          // TODO- Can I email me at work? Worst case, we can perform a Tasker task that sends the email
        }
        else if (curWarning.text.match(/congestion/i)) {
          // Don't know this is possible, but if the warning is for congestion,
          // I only want to see it if there is no overall trip congestion
          if (tripCongestion === 'No') {
            warnings.push(curWarning.text);
          }
        }
        else {
          warnings.push(curWarning.text);
        }
      }
    }
  }

  // Sort the list and then remove duplicates
  warnings = warnings
    .sort()
    .filter(function(item, pos, self) {
      return self.indexOf(item) == pos;
    });

  return warnings;
}


function sleep(ms) {
  ms += new Date().getTime();
  while (new Date() < ms){}
}