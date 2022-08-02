import { exec as e } from "child_process";
import { formatISO, parse } from "date-fns";
import util from "util";

const exec = util.promisify(e);

(async () => {
  const response = await fetch(
    "https://futebol.groundsportech.com/v2/be2c9c05297a881cd3f1bac9186fb0b0/calendar"
  );
  const data = await response.json();

  const games = data.games.map((g) => {
    const date = `${g.date} ${g.time?.includes(":") ? g.time : "00:00"} -03`;

    return {
      ...g,
      dateISO: formatISO(parse(date, "dd/MM/yyyy HH:mm X", new Date())),
    };
  });

  const { stdout } = await exec(`gcalcli --cal=Inter delete \\* --iamaexpert`);
  console.log(stdout);

  while (games.length) {
    await Promise.all(
      games.splice(0, 1).map((g) => {
        const cmd = `gcalcli --cal=Inter add --title="${g.homeTeamName} x ${
          g.visitorTeamName
        }" --where="${g.stadium || g.homeTeam}" --when="${
          g.dateISO
        }" --duration="120" --description="${g.gameId}" --reminder 10`;
        console.log(g.id, "started", cmd);
        return exec(cmd).then(() => console.log(g.id, "done"));
      })
    );
  }
})();
