function getLessThanClass(value, yellowLimit, redLimit) {
	return (
    (value < yellowLimit) ? 'yellow' :
	  (value < redLimit )   ? 'red'    :
    'green');
}


function getGreaterThanClass(value, yellowLimit, redLimit) {
	return (
    (value > redLimit)    ? 'red'    :
	  (value > yellowLimit) ? 'yellow' :
    'green');
}


function getUpDownClass(value) {
	return (
	  (value.match(/up/i)) ? 'green' :
    'red');
}


function getYellowIfNotEqualClass(value, greenValue, yellowIfGreenValueEmpty) {
	return (
	  (value == greenValue) ? 'green' :
    (greenValue == '' && !yellowIfGreenValueEmpty) ? 'green' :

		'yellow');
}


function getYellowIfYesterdayClass(value) {
	return (
	  value.match(/today/i) ? 'green' :
    value.match(/yesterday/i) ? 'yellow' :
		'red');
}


function getRedIfNotEqualClass(value, greenValue) {
	return (
	  (value == greenValue) ? 'green' :
    'red');
}


function displayValueAndUnits(value, unit) {
	return value + ' ' + unit + (value == 1 ? '' : 's');
}


function ProcessStatus(today, piStatus) {
  // Pi
//alert("1- " + JSON.stringify(piStatus));
  var statusTime = moment(piStatus.message_datetime, "YYYYMMDDHHmm").format("h:mm a");
	var hoursAgo = Math.floor(moment.duration(moment().diff(moment(piStatus.message_datetime, "YYYYMMDDHHmm"))).asHours());
//alert("2");
	piStatus.hours_ago = statusTime;
//alert("3");
	piStatus.hours_ago_class = getGreaterThanClass(hoursAgo, 2, 3);
	piStatus.pi.disk_internal_class = getGreaterThanClass(piStatus.pi.disk_internal, 75, 85);
	piStatus.pi.disk_internal += "%";
	piStatus.pi.memory_internal_class = getGreaterThanClass(piStatus.pi.memory_internal, 75, 85);
	piStatus.pi.memory_internal += "%";
	piStatus.pi.memory_swap_class = getGreaterThanClass(piStatus.pi.memory_swap, 75, 85);
	piStatus.pi.memory_swap += "%";
	piStatus.pi.load_one_min_class = getGreaterThanClass(piStatus.pi.load_one_min, 2.8, 4.0);
	piStatus.pi.load_five_min_class = getGreaterThanClass(piStatus.pi.load_five_min, 2.8, 4.0);
	piStatus.pi.load_fifteen_min_class = getGreaterThanClass(piStatus.pi.load_fifteen_min, 2.8, 4.0);
//alert("4");

	// Kodi
	piStatus.kodi.status_class = getUpDownClass(piStatus.kodi.status)
  piStatus.kodi.current_version_class = getYellowIfNotEqualClass(piStatus.kodi.current_version, piStatus.kodi.latest_version, false);
//alert("4.1");
	
	// UFW
	piStatus.ufw.status_class = getUpDownClass(piStatus.ufw.status)
//alert("4.2");
	
	// Router
	piStatus.router.hours_ago = piStatus.hours_ago;
	piStatus.router.hours_ago_class = piStatus.hours_ago_class;
//alert("4.21");
  //piStatus.router.current_version_class = getYellowIfNotEqualClass(piStatus.router.current_version, piStatus.router.latest_version, false);
	piStatus.router.current_version = "DD-WRT " + piStatus.router.current_version.match(/\d+\/\d+\/\d+/);
	//piStatus.uptime_class = xxxxx;
	piStatus.router.load_one_min_class = getGreaterThanClass(piStatus.router.load_one_min, 2.8, 4.0);
	piStatus.router.load_five_min_class = getGreaterThanClass(piStatus.router.load_five_min, 2.8, 4.0);
	piStatus.router.load_fifteen_min_class = getGreaterThanClass(piStatus.router.load_fifteen_min, 2.8, 4.0);
	piStatus.router.nas_storage_used_class = getGreaterThanClass(piStatus.router.nas_storage_used, 75, 85)
	piStatus.router.nas_storage_used += "%";
//alert("4.3");
	
  if (piStatus.hasOwnProperty("nextcloud")) {
//alert("5, " + piStatus.nextcloud.last_backup);
		var ncDaysSinceLastBackup = Math.floor(moment.duration(today.diff(moment(piStatus.nextcloud.last_backup, "YYYYMMDD"))).asDays());
//alert("5.1, " + piStatus.nextcloud_notes.last_backup);
		var ncNotesDaysSinceLastBackup = Math.floor(moment.duration(today.diff(moment(piStatus.nextcloud_notes.last_backup, "YYYYMMDD"))).asDays());
//alert("5.2");

	  piStatus.nextcloud.status_class = getUpDownClass(piStatus.nextcloud.status);
	  //piStatus.nextcloud.db_size_class = xxxxxx;
	  piStatus.nextcloud.db_size += " mb";
	  piStatus.nextcloud.current_version_class = getYellowIfNotEqualClass(piStatus.nextcloud.current_version, piStatus.nextcloud.latest_version, false);
	  piStatus.nextcloud.ssl_cert_expiry_class = getLessThanClass(piStatus.nextcloud.ssl_cert_expiry, 11, 6);
		piStatus.nextcloud.ssl_cert_expiry = displayValueAndUnits(piStatus.nextcloud.ssl_cert_expiry, "day");
	  piStatus.nextcloud.last_backup_class = getGreaterThanClass(ncDaysSinceLastBackup, 8, 15);
		piStatus.nextcloud.last_backup = 
		  (ncDaysSinceLastBackup == 0) ? "today" :
		  (ncDaysSinceLastBackup == 1) ? "yesterday" :
		  displayValueAndUnits(ncDaysSinceLastBackup, "day") + " ago";
//alert("6");

	  piStatus.nextcloud_notes.status_class = getUpDownClass(piStatus.nextcloud_notes.status);
//alert("6.1");
		piStatus.nextcloud_notes.last_backup =
		  (ncNotesDaysSinceLastBackup == 0) ? "today" :
		  (ncNotesDaysSinceLastBackup == 1) ? "yesterday" :
		  displayValueAndUnits(ncNotesDaysSinceLastBackup, "day") + " ago";
//alert("6.2");
	  piStatus.nextcloud_notes.last_backup_class = getYellowIfYesterdayClass(piStatus.nextcloud_notes.last_backup);
  }
//alert("7");
}


function calculateAllPiStatuses(pi1StatusMessage, pi2StatusMessage) {
		//Goals of this code
		//1. add class properties, such as:
    //     pi.disk_internal_class,
    //     pi.memory_internal_class,
    //     kodi.current_version_class
		//2. add a "summary_color" property that is the worst color
//alert("A");
  var today = moment().startOf('day');
//alert("B");

	var pi1Status = JSON.parse(pi1StatusMessage || "{}");
	var pi2Status = JSON.parse(pi2StatusMessage || "{}");
//alert("C");

	if (pi1Status.hasOwnProperty("message_datetime"))
  	ProcessStatus(today, pi1Status);
//alert("D");
	if (pi2Status.hasOwnProperty("message_datetime"))
	  ProcessStatus(today, pi2Status);
	
	// Use the router info from the most recent pi status message
	if (pi1Status.hasOwnProperty("message_datetime") &&
	  (!pi2Status.hasOwnProperty("message_datetime") || pi1Status.message_datetime >= pi2Status.message_datetime))
	  router = pi1Status.router;
	else
	  router = pi2Status.router;
//alert("Dd");
  if (pi1Status.hasOwnProperty("router"))
	  delete pi1Status.router;
  if (pi2Status.hasOwnProperty("router"))
  	delete pi2Status.router;
//alert("De");
	
	// This is kludgy and cheap, but looping through nested JSON objects is ugly and
	// can be improved later
	var colors = [
	  router.hours_ago_class,
		//router.current_version_class,
		//router.uptime_class,
	  router.load_five_min_class,
	  router.load_fifteen_min_class,
		router.nas_storage_used_class,
	
		pi1Status.hours_ago_class, 
		pi1Status.pi.disk_internal_class, 
	  pi1Status.pi.memory_internal_class,
	  pi1Status.pi.memory_swap_class,
	  pi1Status.pi.load_five_min_class,
	  pi1Status.pi.load_fifteen_min_class,
		pi1Status.kodi.status_class,
		pi1Status.kodi.current_version_status,
		pi1Status.ufw.status_class,
	  pi1Status.nextcloud.status_class,
	  pi1Status.nextcloud.current_version_class,
	  pi1Status.nextcloud.ssl_cert_expiry_class,
	  pi1Status.nextcloud.last_backup_class,
	  pi1Status.nextcloud_notes.status_class,
	  pi1Status.nextcloud_notes.last_backup_class
		
		//pi2Status.hours_ago_class, 
		//pi2Status.pi.disk_internal_class, 
	  //pi2Status.pi.memory_internal_class,
	  //pi2Status.pi.memory_swap_class,
	  //pi2Status.pi.load_five_min_class,
	  //pi2Status.pi.load_five_fifteen_class,
		//pi2Status.kodi.status_class,
		//pi2Status.kodi.current_version_status,
		//pi2Status.ufw.status_class,
	];
//alert("E");
	var summary_color = 
		colors.includes("red") ? "red" :
	  colors.includes("yellow") ? "yellow" :
		"green";
//alert("F- " + summary_color);

	var allStatuses = {
    summary_color: summary_color,
		router: router,
		pi1: pi1Status,
		pi2: pi2Status
	};

	var jsonText = JSON.stringify(allStatuses);
//alert("RETURNING " + jsonText);
	
	return jsonText;
}
