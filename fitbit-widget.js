// FitBit Widget JavaScript
// by Brian Kummer, 2016
//
// Requires the following JavaScripts:
//   moment.js..........Library for working with JavaScript dates
//                      (http://momentjs.com/downloads/moment.min.js)
//
// Example month: February 2016
//   28 29  1  2  3  4  5
//    6  7  8  9 10 11 12
//   13 14 15 16 17 18 19
//   20 21 22 23 24 25 26
//   27 28 29 30 31  1  2

// Input variables from Tasker
// var color_good;
// var color_bad;
// var color_stale;
// var steps[];
// var datetime[];

// Output variables to Tasker
var month_name;
var week_1_steps, week_1_color;
var week_2_steps, week_2_color;
var week_3_steps, week_3_color;
var week_4_steps, week_4_color;
var week_5_steps, week_5_color;
var run_date;
var js_error_title = null;
var js_error_text = null;

// Other variables
var today = moment().startOf('day');


try {
  month_name = moment().format('MMMM');
  run_date = moment().format('M/D');
  setLocal('month_name', month_name);
  setLocal('run_date', run_date);

  // This is the last date for which we have FitBit data
  var lastDateOfFitBitData = moment(datetime[datetime.length-1], 'YYYY-MM-DD');

  // Get start of the month we're tracking. If a week is split between two
  // months, steps are counted for the PRIOR month. (e.g. If is 3/2/2016,
  // steps are counted to last week of Feb 2016).
  var firstOfCountingMonth = moment().startOf('week').startOf('month');

  // Get the first Sunday of the month (e.g. first week starting that month)
  var firstSunday = firstOfCountingMonth.clone().startOf('week');
  if (firstSunday.month() != firstOfCountingMonth.month()) {
    firstSunday = firstSunday.add(7, 'days');
  }

  var startingIndex = datetime.findIndex(function (value) {
    return value == firstSunday.format('YYYY-MM-DD');
  });

  var weekResults;
  var var_name;
  for (var i = 1; i <= 5; i++) {
    weekResults = getWeeklySteps(i, (i-1)*7, startingIndex, today, lastDateOfFitBitData, firstSunday);

    var_name = 'week_' + i + '_steps';
    setLocal(var_name, weekResults.steps);

    var_name = 'week_' + i + '_color';
    setLocal(var_name, weekResults.color);
  }

  exit();
} catch (ex) {
  js_error_title = 'FitBit Widget';
  js_error_text = ex.message;

  setLocal('js_error_title', js_error_title);
  setLocal('js_error_text', js_error_text);
}


function countNumberOf10KStepDays(dailyStepCount) {
  return (dailyStepCount >= 10000);
};


function getWeeklySteps(weekNumber, offset, startingIndex, today, lastDate, firstSunday) {
  var weekIndex = startingIndex + offset;

  /*
  alert('W' + weekNumber + ' will look at indices ' + weekIndex + '-' + (weekIndex + 6) + 1- %week_1_steps, %week_1_color': ' +
    steps[startingIndex + offset + 0] + ',' +
    steps[startingIndex + offset + 1] + ',' +
    steps[startingIndex + offset + 2] + ',' +
    steps[startingIndex + offset + 3] + ',' +
    steps[startingIndex + offset + 4] + ',' +
    steps[startingIndex + offset + 5] + ',' +
    steps[startingIndex + offset + 6]);
		*/
		
  var weekStart = firstSunday.clone().add(offset, 'days');
  var weekEnd = weekStart.clone().endOf('week');
  var weekStale = lastDate.isBefore(Math.min(today, weekEnd), 'day');
  var weekSteps =
    today.isBefore(weekStart, 'day')
      ? 'X'
      : steps.slice(weekIndex, weekIndex + 7).filter(countNumberOf10KStepDays).length;
  var weekColor = (weekStale) ? color_stale : (weekSteps >= 3) ? color_good : color_bad;

  /*
  alert('W' + weekNumber + ' ' +
    'steps=' + weekSteps + ', ' +
    'sun=' + weekStart.format('MM/DD') + '-' + weekEnd.format('MM/DD') + ', ' +
    'stale=' + weekStale + ', ' +
    'color=' + weekColor);
	 */
	
  return {steps: weekSteps, color: weekColor};
}