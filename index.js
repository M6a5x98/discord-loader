const discord = require("discord.js");
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const constants = require("./constants.bot");
const { TOKEN } = process.env;

const intents = [
  discord.GatewayIntentBits.Guilds,
  discord.GatewayIntentBits.GuildMessages,
  discord.GatewayIntentBits.MessageContent,
];
const client = new discord.Client({ intents });

const events = [];
const commands = [];
const scripts = [];

client.on("ready", async (cl) => {
  console.log(`Logged as ${cl.user.tag}`);
  cl.guilds.cache.forEach((guild) => {
    console.log("Logged in\x1b[1m", guild.name, "\x1b[0m");
  });
  if (constants.status !== undefined) cl.user.setActivity(constants.status);
  //Load commands
  await cl.application.commands.set([]);
  if (!fs.existsSync("commands/") || fs.readdirSync("commands/").length === 0) {
    console.log("\x1b[31;1mThe bot cannot start without plugins\x1b[0m");
    process.exit(1);
  }
  const fls = fs
    .readdirSync("commands", { withFileTypes: true })
    .filter((e) => e.isDirectory());
  for (const dir of fls) {
    if (!fs.existsSync(path.join(dir.parentPath, dir.name, "plugin.json")))
      continue;
    const file = JSON.parse(
      fs.readFileSync(path.join(dir.parentPath, dir.name, "plugin.json"))
    );
    if (
      file.main === undefined ||
      file.type === undefined ||
      file.name === undefined
    )
      throw new TypeError(
        "Missing required field at " +
          path.join(dir.parentPath, dir.name, "plugin.json")
      );
    else {
      //Handle Multicommands
      if (typeof file.type !== "number" && typeof file.main === "object") {
        if (
          file.type.length !== Object.keys(file.main).length &&
          file.type.length > 3 &&
          Object.keys(file.main).length > 3
        )
          return;
        else {
          for (const type of file.type) {
            if (type === 0) {
              if (
                !fs.existsSync(
                  path.join("commands", file.name, file.main["command"])
                )
              )
                continue;
              const file2 = require(path.join(
                __dirname,
                "commands",
                file.name,
                file.main["command"]
              ));
              await cl.application.commands.create(file2.data);
              commands.push({ name: file2.data.name, exec: file2.execute });
              console.log(
                "Loading one command :\x1b[31;1m",
                file2.data.name,
                "\x1b[0m"
              );
              continue;
            } else if (type === 1) {
              if (
                !fs.existsSync(
                  path.join("commands", file.name, file.main["event"])
                )
              )
                continue;
              const file2 = require(path.join(
                __dirname,
                "commands",
                file.name,
                file.main["event"]
              ));
              events.push(file2);
              console.log(
                "Loading one event :\x1b[31;1m",
                file.main["event"],
                "\x1b[0m"
              );
              continue;
            } else if (type === 2) {
              if (
                !fs.existsSync(
                  path.join("commands", file.name, file.main["script"])
                )
              )
                continue;
              const file2 = require(path.join(
                __dirname,
                "commands",
                file.name,
                file.main["script"]
              ));
              scripts.push(file2);
              console.log(
                "Loading one script :\x1b[31;1m",
                file.main["script"],
                "\x1b[0m"
              );
              continue;
            } else continue;
          }
        }
      } else if (
        typeof file.type === "number" &&
        typeof file.main === "string"
      ) {
        let file2;
        switch (file.type) {
          case 0:
            if (!fs.existsSync(path.join("commands", file.name, file.main)))
              continue;
            file2 = require(path.join(
              __dirname,
              "commands",
              file.name,
              file.main
            ));
            await cl.application.commands.create(file2.data);
            commands.push({ name: file2.data.name, exec: file2.execute });
            console.log(
              "Loading one command :\x1b[31;1m",
              file2.data.name,
              "\x1b[0m"
            );
            continue;

          case 1:
            if (!fs.existsSync(path.join("commands", file.name, file.main)))
              continue;
            file2 = require(path.join(
              __dirname,
              "commands",
              file.name,
              file.main
            ));
            events.push(file2);
            console.log("Loading one event :\x1b[31;1m", file.main, "\x1b[0m");
            continue;
          case 2:
            if (!fs.existsSync(path.join("commands", file.name, file.main)))
              continue;
            file2 = require(path.join(
              __dirname,
              "commands",
              file.name,
              file.main
            ));
            scripts.push(file2);
            console.log("Loading one script :\x1b[31;1m", file.main, "\x1b[0m");
            continue;
          default:
            continue;
        }
      }
    }
  }
});
for (const runScript of scripts) {
  runScript();
}
client.on("interactionCreate", async (interaction) => {
  if (!interaction.type === interaction.isChatInputCommand()) return;

  commands.forEach(async (cm) => {
    if (interaction.commandName === cm.name) {
      await cm.exec(interaction);
    } else return;
  });
});

for (const event of events) {
  client.on(event.type, event.exec);
}

process.chdir(__dirname);

process.on("SIGINT", () => {
  client.application.commands.set([]);
  console.log("Stopping the bot");
  client.destroy();
  process.exit();
});

client.login(TOKEN);
