// FitBit Widget JavaScript
// by Brian Kummer, 2019
//
// Requires the following JavaScripts:
//   moment.js..........Library for working with JavaScript dates
//                      (http://momentjs.com/downloads/moment.min.js)
//
// Input variables from Tasker
// var color_good;
// var color_bad;
// var color_stale;
// var steps[];
// var datetime[];

// Output variables to Tasker
var run_date;
var months_days_met_goal;
var months_days_met_goal_color;
var js_error_title = null;
var js_error_text = null;

// Other variables
var today = moment().startOf('day');

try {
  setLocal('run_date', run_date);

  // monthsFilter will look like "2019-01-"
  var monthsFilter = [];
	var monthsDaysMetGoal = [];
	var monthsDaysMetGoalColor = [];
	var numMonths = 3;
	for (var monthNum = 0; monthNum < numMonths; monthNum++) {
		// Add each of these to start of array, so arrays are 
		// [2 months ago, 1 month ago, current month]
		monthsFilter.unshift(moment().subtract(monthNum, "months").format("YYYY-MM-"));
		monthsDaysMetGoal.unshift(0);
		monthsDaysMetGoalColor.unshift("");
	}
	
	var yearAndMonth = null;
  for (var fb = 0; fb < steps.length; fb++) {
		// Step through all the Fitbit data one time
		yearAndMonth = datetime[fb].substring(0,8);
    for (var m = 0; m < monthsFilter.length; m++) {
			if (yearAndMonth == monthsFilter[m]) {
				if (steps[fb] > 10000) {
				  monthsDaysMetGoal[m] += 1;
				}
			}
		}
  }
	
	// Set color for each month
  for (var m = 0; m < monthsFilter.length; m++) {
		monthsDaysMetGoalColor[m] = 
			monthsDaysMetGoal[m] >= 6 ? color_good : color_bad;
	}	
	
	// A kludgy hack to return arrays to Tasker
	monthsDaysMetGoal.forEach((ele, index) => {
    setLocal("months_days_met_goal"+(index+1), monthsDaysMetGoal[index]);
    setLocal("months_days_met_goal_color"+(index+1), monthsDaysMetGoalColor[index]);
  });
	
  exit();
	
} catch (ex) {
  js_error_title = 'FitBit Widget';
  js_error_text = ex.message;

  setLocal('js_error_title', js_error_title);
  setLocal('js_error_text', js_error_text);
};