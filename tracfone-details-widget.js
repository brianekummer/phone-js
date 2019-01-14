function getMinutesClass(minutes) {
	return (
	  (minutes.match(/e/i)) ? "red"    :
	  (minutes <  60)       ? "red"    :
    (minutes < 100)       ? "yellow" :
    "green");
}


function getTextsClass(texts) {
	return (
	  (texts.match(/e/i)) ? "red"    :
	  (texts < 100)       ? "red"    :
    (texts < 125)       ? "yellow" :
    "green");
}


function getDataClass(mb) {
	return (
	  (mb.match(/e/i)) ? "red"    :
		(mb <  75)       ? "red"    :
    (mb < 100)       ? "yellow" :
    "green");
}



function getClasses(balances) {
	var classes = [balances.statusTimeClass];
	
	for (var i = 0; i < balances.people.length; i++) {
classes.push(balances.people[i].minutesClass);
		classes.push(balances.people[i].textsClass);
		classes.push(balances.people[i].dataClass);
  };
	
	return classes;
}


function ParseBalances(balances) {
	var today = moment().startOf("day");
	
	var parts = balances.split("|");
	var run_date = parts[1];
	
        var runDate = moment(run_date, "YYYYMMDDHHmm").format("M/D");
	var statusTime = moment(run_date, "YYYYMMDDHHmm").format("h:mm a");
	var daysSinceStatus = Math.floor(moment.duration(today.diff(moment(run_date, "YYYYMMDD"))).asDays());
	var statusTimeClass = daysSinceStatus == 0 ? "green" : "red";
	
	var startPos = null;
	var people = [];
	for (var i = 1; i < 6; i++) {
		startPos = 4*(i-1) + 3;
		if (startPos < parts.length && parts[startPos+1] != "NA") {
			people.push({
				name: parts[startPos],
				
				minutes: parts[startPos+1],
				minutesClass: getMinutesClass(parts[startPos+1]),
				
				texts: parts[startPos+2],
				textsClass: getTextsClass(parts[startPos+2]),
				
				data: parts[startPos+3],
				dataClass: getDataClass(parts[startPos+3])
			});
		};
  };
	
	var balances = {
		statusTime: statusTime,
                runDate: runDate,
    statusTimeClass: statusTimeClass,
		daysTillRefills: parts[2],
    avgMonthlyBill: "$" + parts[27],
		people: people
	};
	
	var classes = getClasses(balances);
	balances.tracfoneSummaryColor = 
		classes.includes("red") ? "red" :
		classes.includes("yellow") ? "yellow" :
		"green";
	
	return JSON.stringify(balances);
}