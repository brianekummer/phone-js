function getFormattedDate(dateInSeconds, dateFormat) {
  var monthNames = new Array(
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
  );
  var dayNames = new Array(
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
  );
	
  var d = new Date(dateInSeconds * 1000);
  var formattedDate = dateFormat.replace(/(yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|ee|hh|h|nn|ss|a\/p|am\/pm)/gi,
    function($1) {
      switch ($1) {
        case 'yyyy': return d.getFullYear();
        case 'yy':   return ('0' + d.getFullYear()).slice(-2);
        case 'mmmm': return monthNames[d.getMonth()];
        case 'mmm':  return monthNames[d.getMonth()].slice(0,3);
        case 'mm':   return ('0' + (d.getMonth() + 1)).slice(-2);
        case 'm':    return d.getMonth() + 1;
        case 'dddd': return dayNames[d.getDay()];
        case 'ddd':  return dayNames[d.getDay()].slice(0,3);
        case 'dd':   return ('0' + d.getDate()).slice(-2);
        case 'd':    return d.getDate();
				case 'ee':   return dayNames[d.getDay()].slice(0,2);
        case 'hh':   return ('0' + ((h = d.getHours() % 12) ? h : 12)).slice(-2);
        case 'h':    return (h = d.getHours() % 12) ? h : 12;
        case 'HH':   return ('0' + d.getHours()).slice(-2);
        case 'H':    return d.getHours();
        case 'nn':   return ('0' + d.getMinutes()).slice(-2);
        case 'ss':   return ('0' + d.getSeconds()).slice(-2);
        case 'a/p':  return d.getHours() < 12 ? 'a' : 'p';
        case 'am/pm':return d.getHours() < 12 ? 'am' : 'pm';
      }
	  }
  );
		
  return formattedDate;
}