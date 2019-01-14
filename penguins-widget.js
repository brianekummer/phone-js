// Penguins Scores Widget JavaScript
// by Brian Kummer, 2015, rewritten 2016
//
// Requires the following JavaScripts:
//   moment.js..........Library for working with JavaScript dates
//                      (http://momentjs.com/downloads/moment.min.js)

// Debugging on a PC:
//   - In the HTML test file, include Tasker.js, which defines stubs
//     for Tasker's JS functions like setLocal
//   - Variable onAndroid is true if running on Android, false if running
//     on PC
//   - Any input variables from Tasker should be assigned test values here
var onAndroid = (global('SDK') > 0);
if (!onAndroid) {
  alert('NOT running on Android');
  var num_days = 10;
  var max_num_lines = 11;
}

// Dependencies
const TEAM_SCHEDULE_URL = 'https://statsapi.web.nhl.com/api/v1/schedule?site=en_nhl&expand=schedule.teams,schedule.broadcasts.all,schedule.linescore&startDate=%START_DATE%&endDate=%END_DATE%&teamId=5';

// Input variables from Tasker
// var num_days
// var max_num_lines

// Output variables to Tasker
var team_record = '';
var days = '';
var dates = '';
var opponents = '';
var networks_results = '';
var run_date = '';
var js_error_title = null;
var js_error_text = null;

// Other global variables
var jsCheckpoint = '1';
var today = moment().startOf('day');

main();


function main() {
  try {
    let startDate = today.clone().subtract(num_days, 'days');
    let endDate = today.clone().add(num_days, 'days');

    run_date = today.format('M/D');

    let url = TEAM_SCHEDULE_URL
      .replace('%START_DATE%', startDate.format('YYYY-MM-DD'))
      .replace('%END_DATE%', endDate.format('YYYY-MM-DD'));

    fetch(url)
      .then(r => r.json())
      .then((results) => {
        // Process each game on each day of this time period
        results.dates.forEach(function (aDate) {
          aDate.games.forEach(function (game) {
            processGame(game);
          });
        });

        team_record = getTeamRecord(results);

        console.log('days = ' + days);
        console.log('dates = ' + dates);
        console.log('opponents = ' + opponents);
        console.log('networks_results = ' + networks_results);
        console.log('team_record = ' + team_record);
        console.log('run_date = ' + run_date);

        setLocal('days', days);
        setLocal('dates', dates);
        setLocal('opponents', opponents);
        setLocal('networks_results', networks_results);
        setLocal('team_record', team_record);
        setLocal('run_date', run_date);
        exit();
      });
  }
  catch (ex) {
    js_error_title = 'Penguins Widget';
    js_error_text = jsCheckpoint + ':' + ex.message;

    setLocal('js_error_title', js_error_title);
    setLocal('js_error_text', js_error_text);
    exit();
  }
}


function addLine(newDow, newDate, newOpponent, newNetworkResult) {
  let newlineMatches = days.match(/\n/g);
  if (newlineMatches == null || newlineMatches.length < max_num_lines)
  {
    // Add a blank line before first network/results with a time
    if (newNetworkResult.match(/:/) && !networks_results.match(/\n\n/g))
    {
      addLine('', '', '', '');
    }

    days += newDow + '\n';
    dates += newDate + '\n';
    opponents += newOpponent + '\n';
    networks_results += newNetworkResult + '\n';
  }
};


function processGame(game) {
  let includeNetworksWeGet = function (broadcast) {
    return (broadcast.name.match(/nbc|nbcsn|attsn|cw|usa/i) != null);
  };

  let getBroadcastName = function (broadcast) {
    return (broadcast.name);
  };

  let gameDate = moment(game.gameDate, 'YYYY/MM/DDTHH:mm:ssZ').local();

  let pensAreAtHome = (game.teams.home.team.abbreviation === 'PIT');
  let pens = (pensAreAtHome ? game.teams.home : game.teams.away);
  let opponent = (pensAreAtHome ? game.teams.away : game.teams.home);

  let tempDate = gameDate.format('M/D');
  let tempDow = gameDate.format('dd');
  let tempOpponent = (pensAreAtHome ? 'v. ' : '@ ') + opponent.team.abbreviation;
  let tempNetworkResult;

  if (game.status.detailedState.match(/final/i)) {
    // Recent game
    let score =
          Math.max(pens.score, opponent.score) +
          ' - ' +
          Math.min(pens.score, opponent.score);
    let winOrLoss =
          (pens.score > opponent.score) ? ' W' :
            ' L';
    let shootoutOrOverTime =
          game.linescore.hasShootout ? ' SO' :
            game.linescore.currentPeriodOrdinal == 'OT' ? ' OT' :
              '';
    tempNetworkResult =
      score +
      winOrLoss +
      shootoutOrOverTime;
  }
    else {
    // Upcoming game. If the game's on Root, I don't care if it's on
    // another network too.
    tempNetworkResult =
      gameDate.format('h:mma').replace('m', '') +
      ' ';
		if (game.broadcasts != null) {
			var networks = game.broadcasts.filter(includeNetworksWeGet).map(getBroadcastName);
			if (networks.includes('ATTSN-PT'))
				tempNetworkResult += 'ATTSN';
			else
				tempNetworkResult += networks.join(',');
		}
	}

  addLine(tempDow, tempDate, tempOpponent, tempNetworkResult);
}


function getTeamRecord(results) {
  // Get the team record from the leagueRecord of the most recent game

  // Add "last()" method to arrays
  // http://stackoverflow.com/questions/9050345/selecting-last-element-in-javascript-array
  if (!Array.prototype.last){
    Array.prototype.last = function(){
      return this[this.length - 1];
    };
  };

  var mostRecentResults = results.dates.last().games.last();
  var leagueRecord =
        mostRecentResults.teams.away.team.abbreviation === 'PIT'
          ? mostRecentResults.teams.away.leagueRecord
          : mostRecentResults.teams.home.leagueRecord;
  var teamRecord = leagueRecord.wins +
    '-' +
    leagueRecord.losses +
    (leagueRecord.ot > 0 ? '-' + leagueRecord.ot : '');

  return teamRecord;
}