import { exec as e } from "child_process";
import { formatISO, isAfter, parse, parseISO, startOfToday } from "date-fns";
import util from "util";

const exec = util.promisify(e);

const fetchAll = async () => {
  const data = [];
  let i = 0;
  while (true) {
    const url = `https://www.sofascore.com/api/v1/team/1966/events/next/${i++}`;

    console.log("Fetching...", url);

    const response = await fetch(url);
    const json = await response.json();

    data.push(json);

    if (!json.hasNextPage) {
      break;
    }
  }

  return data.flatMap((item) => item.events);
};

const fetchOne = async (id) => {
  const url = `https://www.sofascore.com/api/v1/event/${id}`;

  console.log("Fetching...", url);

  const response = await fetch(url);
  const json = await response.json();

  return json;
};

(async () => {
  const data = await fetchAll();

  for (const item of data) {
    const result = await fetchOne(item.id);
    item.event = result?.event;
  }

  const games = data.map((g) => {
    const id = g.id;
    const date = new Date(g.startTimestamp * 1000);
    const homeTeamName = g.homeTeam.name;
    const awayTeamName = g.awayTeam.name;
    const tournamentName = g.tournament.name;
    const venueName = g.event?.venue?.name || homeTeamName;

    return {
      id,
      date,
      homeTeamName,
      awayTeamName,
      tournamentName,
      venueName,
    };
  });

  const { stdout } = await exec(
    `gcalcli --cal=Inter delete \\* today --iamaexpert`,
  );
  console.log(stdout);

  while (games.length) {
    await Promise.all(
      games.splice(0, 1).map((g) => {
        const cmd = `gcalcli --cal=Inter add --title="${g.homeTeamName} x ${g.awayTeamName}" --where="${g.venueName}" --when="${formatISO(g.date)}" --duration="120" --description="${g.tournamentName}" --reminder 10`;
        console.log(g.id, "started", cmd);
        return exec(cmd).then(() => console.log(g.id, "done"));
      }),
    );
  }
})();
