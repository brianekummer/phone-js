// Today PTO
//
//
// - MomentJS........For date logic
//                   npm install moment
// - Ical............To simplify handling of ical files
//                   npm install ical
const FAMILY_CALENDAR_URL = 'http://rest.cozi.com/api/ext/1103/f8295c8d-30be-4f6b-894c-ebe0e1bb263b/icalendar/feed/feed.ics';
const ICAL_FORMAT = 'YYYYMMDDTHHmmss';

// Input variables from Tasker

// Output variables to Tasker
// var TodayPtoStart = "";
// var TodayPtoEnd = "";

// Debugging on a PC:
//   - In the HTML test file, include Tasker.js, which defines stubs
//     for Tasker's JS functions like setLocal
//   - Variable onAndroid is true if running on Android, false if running
//     on PC
//   - Any input variables from Tasker should be assigned test values here
var onAndroid = (global('SDK') > 0);
if (!onAndroid) {
  alert('NOT running on Android');
}

var today = moment().startOf('day');

var searchStartDate = today.clone();
var searchEndDate = today.endOf("day");

// Debugging
// searchStartDate = today.clone().add(-450, "days");
// searchEndDate = today.clone().add(10, "days");

fetch(FAMILY_CALENDAR_URL)
	.then(r => r.text())
	.then(familyCalendarIcs => {
		var todayPtoStart = "";
		var todayPtoEnd = "";
		var todaysPtoEvents = [];
				
    if (familyCalendarIcs.match(/vcalendar/i) == null) {
      console.log("Error reading calendar");
			todayPtoStart = "ERR";
			todayPtoEnd = "ERR";
    } else {
      icalParser.parseIcal(familyCalendarIcs);
			
			todaysPtoEvents = getUpcomingPTOEvents(icalParser.icals[0].events, searchStartDate, searchEndDate);
			
			//todaysPtoEvents
      //  .forEach(function (e) {
			//		console.log(e.dtstart[0].value + "-" + e.dtend[0].value + ": " + e.summary[0].value);
      //});
			
			if (todaysPtoEvents.length > 0) {
				var startDateTime = moment(
					todaysPtoEvents[0].dtstart[0].value + 
					(todaysPtoEvents[0].dtstart[0].value.match(/t/i) ? "" : "T000000"), ICAL_FORMAT);
				var endDateTime = moment(
					todaysPtoEvents[0].dtend[0].value + 
					(todaysPtoEvents[0].dtend[0].value.match(/t/i) ? "" : "T235959"), ICAL_FORMAT);
				
				todayPtoStart = startDateTime.format("HHmm");
				todayPtoEnd = (startDateTime.isSame(endDateTime, "day") ? endDateTime.format("HHmm") : "2359");
			}

			setGlobal("TodayPtoStart", todayPtoStart);
			setGlobal("TodayPtoEnd", todayPtoEnd);

      if (!onAndroid) console.log("PTO today is " + todayPtoStart + " - " + todayPtoEnd);
    }
		
    exit();
	});
	
	
	
function getUpcomingPTOEvents(thisCalendarAllEvents, searchStartDate, searchEndDate) {
  // Get all the upcoming PTO events from this calendar that are between
  // searchStartDate and searchEndDate.
  //
  // We are looking for events that fit this criteria:
	//   - has text "brian" and then either "pto" or "vacation"
  //   - starts between searchStartDate and searchEndDate
  var currentEvent = null;
  var currentEventStart = null;
  var currentEventSummary = '';
  var kummerRecurringId = 0;
  var thisCalendarUpcomingPTOEvents = [];

  for (var i = 0; i < thisCalendarAllEvents.length; i++) {
    currentEvent = thisCalendarAllEvents[i];
    currentEventStart = moment(currentEvent.dtstart[0].value, ICAL_FORMAT);
    currentEventSummary = currentEvent.summary[0].value;

    if (
      (currentEventStart < searchEndDate) &&
      (currentEventSummary.match(/brian.*(pto|vacation)/i))
    ) {
			if (currentEvent.rrule != null) { // Do NOT use !== here
        addOccurrencesForRecurringEvent(currentEvent, currentEventStart, kummerRecurringId, thisCalendarAllEvents);
      } else if (currentEventStart >= searchStartDate) {
        thisCalendarUpcomingPTOEvents.push(currentEvent);
      }
    }
  }

  return thisCalendarUpcomingPTOEvents;
}


function addOccurrencesForRecurringEvent(currentEvent, currentEventStart, kummerRecurringId, thisCalendarAllEvents) {
  // Add an occurrence of each recurring event, even if it's
  // before our start date, since some of its occurrences could be
  // between our start and end dates.
  //   - I am intentionally not evaluating any event with a RRULE
  //     to see if I should display it or not. Instead, I am adding
  //     every occurrence of the event to thisCalendarAllEvents, and
  //     will evaluate each occurrence below.
  //   - Using rrule.between() SHOULD work, but I found bugs, so I am
  //     using .all() and letting later code filter out occurrences
  //     that are not between our start and end dates.
  var currentEventRrules = new RRule.fromString(currentEvent.rrule[0].value).all();
  var newEvent = null;
  var isEventExcluded = false;

  // Cloning function (http://stackoverflow.com/questions/7965822/javascript-how-to-clone-an-object)
  // for cloning an event object to add events via RRule
  var cloneOf = (function () {
    function F() {}
    return function (o) {
      F.prototype = o;
      return new F();
    };
  }());

  kummerRecurringId ++;

  currentEventRrules.forEach(function (newDate) {
    newEvent = cloneOf(currentEvent);
    newEvent.rrule = null; // Prevent from being re-added
    newEvent.kummerRecurringId = kummerRecurringId;
    newEvent.fromRecurring = true;

    // Copy time from the original event
    newEvent.dtstart = [{
      value: moment(newDate).format('YYYYMMDD') + 'T' + currentEventStart.format('HHmmss')
    }];

    // Exclude this occurrence if it's in the list of excluded dates
    isEventExcluded =
      (currentEvent.exdate != null) &&
      (currentEvent.exdate.map(function (e) {
        return e.value;
      }).indexOf(newEvent.dtstart[0].value) >= 0);

    if (!isEventExcluded) {
      thisCalendarAllEvents.push(newEvent);
    }
  });
}

/*
function cleanupRecurringEvents(upcomingHockeyEvents) {
  // Now that we have all of the events, clean up any recurring events. For
  // example, say we have a recurring event for "Goalie Lesson". One week we
  // cancel and override that week's instance of the event with one whose title
  // is "NO Goalie Lesson". The normal recurring event (whose title is "Goalie
  // Lesson") should be ignored because we have an event that overrides it
  // (same time and uid), AND we'll ignore the overriding event because it
  // starts with the text "NO ".
  var currentEvent = null;
  var currentEventSummary = '';
  var useThisEvent = false;

  jsCheckpoint += 'b';
  i = upcomingHockeyEvents.length;
  while (i--) {
    currentEvent = upcomingHockeyEvents[i];
    currentEventSummary = currentEvent.summary[0].value;

    useThisEvent =
      !hasOverridingEvent(currentEvent, upcomingHockeyEvents) &&
      !currentEventSummary.match(/hockey:\sno\s/i);

    if (!useThisEvent) {
      upcomingHockeyEvents.splice(i, 1);
    }
  }
}


function hasOverridingEvent(currentEvent, upcomingHockeyEvents) {
  // Decide if the currentEvent has an overriding event in upcomingHockeyEvents.
  // For example, say we have a recurring event for "Goalie Lesson". One week
  // we add a note or change the time. The normal recurring event should be
  // ignored because we have an event that overrides it (same time and uid).
  //
  // kummerRecurringId is just some unique and arbitrary number used to make
  // sure that when we search for a duplicate event, we're not comparing the
  // the current_event to itself.
  var returnValue;

  if (currentEvent.rrule == null && currentEvent.fromRecurring == null) {
      // Event doesn't define a recurring event, so nothing can override it
    returnValue = false;
  }
  else {
    var matchingEvents = upcomingHockeyEvents.filter(function (entry) {
        return (
          //entry.fromRecurring === true &&
          entry.dtstart[0].value === currentEvent.dtstart[0].value &&
          entry.uid[0].value === currentEvent.uid[0].value &&
          entry.kummerRecurringId !== currentEvent.kummerRecurringId
        );
    });
    returnValue = (matchingEvents != null && matchingEvents.length > 0);
  }

  return returnValue;
}
*/