const discord = require("discord.js");
require("dotenv").config();
const { TOKEN } = process.env;
const fs = require("node:fs");
const path = require("node:path");
const constants = require("./constants.bot");
const getEventGuild = require("./getEventGuild");

let intents = [
  discord.GatewayIntentBits.Guilds,
  discord.GatewayIntentBits.GuildMessages,
  discord.GatewayIntentBits.MessageContent,
];
if (
  constants.intents !== undefined &&
  typeof constants.intents.map === "function" &&
  constants.intents.length > 0
) {
  intents = constants.intents;
} else console.warn("No intents given, using default");
const client = new discord.Client({ intents });

const events = [];
const commands = [];
const scripts = [];

client.on("ready", async (cl) => {
  //#region SlashCommandRegisterer
  class SlashCommandRegisterer {
    /**
     *
     * @param {discord.Client<true>} CLIENT The client to use when registering commands
     */
    constructor(CLIENT) {
      this._client = CLIENT;
      this._scope = "*";
      this.commands = [];
      this.i = -1;
    }
    /**
     *
     * @param {discord.SlashCommandBuilder | discord.RESTPostAPIChatInputApplicationCommandsJSONBody} command The command to register
     */
    setSlashCommand(command) {
      this.i += 1;
      command =
        typeof command.toJSON === "function" ? command.toJSON() : command;
      Object.keys(command).forEach((key) =>
        command[key] === undefined ? delete command[key] : {}
      );
      this.commands.push({ data: command, details: { scope: "*" } });
    }
    /**
     *
     * @param {string | Array<string>} value
     */
    setscope(value) {
      this.commands[this.i].details.scope = value;
    }
    async register() {
      const rest = new discord.REST({ version: 10 }).setToken(
        this._client.token
      );
      const guilds = [];
      this._client.guilds.cache.forEach((guild) => {
        guilds.push({
          id: guild.id,
          commands: this.commands
            .filter((e) => e.details.scope.includes(guild.id + ".json"))
            .flatMap((com) => com.data),
        });
      });
      guilds.push({
        id: "*",
        commands: this.commands
          .filter((e) => e.details.scope === "*")
          .flatMap((com) => com.data),
      });

      for (const { id, commands } of guilds) {
        if (id !== "*") {
          await rest.put(
            discord.Routes.applicationGuildCommands(
              this._client.application.id,
              id.split(".")[0]
            ),
            { body: commands }
          );
        } else {
          await rest.put(
            discord.Routes.applicationCommands(this._client.application.id),
            { body: commands }
          );
        }
      }
    }
  }
  //#endregion
  //#region onLogin
  console.log(`Logged as ${cl.user.tag}`);
  cl.guilds.cache.forEach((guild) => {
    console.log("Logged in\x1b[1m", guild.name, "\x1b[0m");
  });
  if (constants.status !== undefined) cl.user.setActivity(constants.status);
  //#endregion
  //#region Commands
  await cl.application.commands.set([]);
  if (
    !fs.existsSync("plugins/") ||
    fs
      .readdirSync("plugins", { withFileTypes: true })
      .filter((e) => e.isDirectory()).length === 0
  ) {
    console.log("\x1b[31;1mThe bot cannot start without plugins\x1b[0m");
    process.exit(1);
  }
  const fls = fs
    .readdirSync("plugins", { withFileTypes: true })
    .filter((e) => e.isDirectory());
  const slhcmdrgt = new SlashCommandRegisterer(cl);
  for (const dir of fls) {
    //#region Load_Command_File
    if (!fs.existsSync(path.join(dir.parentPath, dir.name, "plugin.json")))
      continue;
    const file = JSON.parse(
      fs.readFileSync(
        path.join(dir.parentPath, dir.name, "plugin.json"),
        "utf-8"
      )
    );
    if (file.dev) continue;
    if (
      file.main === undefined ||
      file.type === undefined ||
      file.name === undefined
    )
      throw new TypeError(
        "Missing required field at " +
          path.join(dir.parentPath, dir.name, "plugin.json")
      );
    //#endregion
    else {
      //#region Multicommands
      if (typeof file.type !== "string" && typeof file.main === "object") {
        if (
          file.type.length !== Object.keys(file.main).length &&
          file.type.length > 3 &&
          Object.keys(file.main).length > 3
        )
          return;
        else {
          for (let i = 0; i < file.type.length; i++) {
            //#region load_/_commands
            if (type === "command") {
              if (
                !fs.existsSync(path.join("plugins", file.name, file.main[i]))
              )
                continue;
              const file2 = require(path.join(
                __dirname,
                "plugins",
                file.name,
                file.main[i]
              ));
              const scope = fs
                .readdirSync("config/")
                .filter((e) => e.endsWith(".json"))
                .map((e) =>
                  JSON.parse(fs.readFileSync(path.join("config", e)))[
                    "plugins.disabled"
                  ].includes(file.name)
                    ? null
                    : e
                )
                .filter((e) => e !== null);
              slhcmdrgt.setSlashCommand(file2.data);
              slhcmdrgt.setscope(scope);

              commands.push({ name: file2.data.name, exec: file2.execute });
              console.log(
                "Loading one command :\x1b[31;1m",
                file2.data.name,
                "\x1b[0m in",
                scope.map((e) => e.split(".")[0]).join(", ")
              );
              continue;
              //#endregion
            } else if (type === "event") {
              //#region load_events
              if (
                !fs.existsSync(path.join("plugins", file.name, file.main[i]))
              )
                continue;
              const file2 = require(path.join(
                __dirname,
                "plugins",
                file.name,
                file.main[i]
              ));
              events.push({ ...file2, from: file.name });
              console.log(
                "Loading one event :\x1b[31;1m",
                file.main[i],
                "\x1b[0m"
              );
              continue;
              //#endregion
            } else if (type === "script") {
              //#region load_scripts
              if (
                !fs.existsSync(path.join("plugins", file.name, file.main[i]))
              )
                continue;
              const file2 = require(path.join(
                __dirname,
                "plugins",
                file.name,
                file.main[i]
              ));
              scripts.push({ runScript: file2, plugin: file.name });
              console.log(
                "Loading one script :\x1b[31;1m",
                file.main[i],
                "\x1b[0m"
              );
              continue;
              //#endregion
            } else continue;
          }
        }
        //#endregion
        //#region Singlecommands
      } else if (
        typeof file.type === "string" &&
        typeof file.main === "string"
      ) {
        let file2;
        switch (file.type) {
          //#region load_/_commands
          case "command":
            if (!fs.existsSync(path.join("plugins", file.name, file.main)))
              continue;
            file2 = require(path.join(
              __dirname,
              "plugins",
              file.name,
              file.main
            ));

            const scope = fs
              .readdirSync("config/")
              .filter((e) => e.endsWith(".json"))
              .map((e) =>
                JSON.parse(fs.readFileSync(path.join("config", e)))[
                  "plugins.disabled"
                ].includes(file.name)
                  ? null
                  : e
              )
              .filter((e) => e !== null);

            slhcmdrgt.setSlashCommand(file2.data);
            slhcmdrgt.setscope(scope);

            commands.push({ name: file2.data.name, exec: file2.execute });
            console.log(
              "Loading one command :\x1b[31;1m",
              file2.data.name,
              "\x1b[0m in",
              scope.map((e) => e.split(".")[0]).join(", ").length === 0
                ? "no guild"
                : scope.map((e) => e.split(".")[0]).join(", ")
            );
            continue;
          //#endregion
          case "event":
            //#region load_events
            if (!fs.existsSync(path.join("plugins", file.name, file.main)))
              continue;
            file2 = require(path.join(
              __dirname,
              "plugins",
              file.name,
              file.main
            ));
            events.push({ ...file2, from: file.name });
            console.log("Loading one event :\x1b[31;1m", file.main, "\x1b[0m");
            continue;
          //#endregion
          case "script":
            //#region load_scripts
            if (!fs.existsSync(path.join("plugins", file.name, file.main)))
              continue;
            file2 = require(path.join(
              __dirname,
              "plugins",
              file.name,
              file.main
            ));
            scripts.push({ runScript: file2, plugin: file.name });
            console.log("Loading one script :\x1b[31;1m", file.main, "\x1b[0m");
            continue;
          //#endregion
          default:
            continue;
        }
      }
      //#endregion
    }
  }
  await slhcmdrgt.register();
  //#endregion
  for (const { runScript, plugin } of scripts) {
    const guilds = [];
    (await cl.guilds.fetch()).map((e) => e.fetch().then((f) => guilds.push(f)));
    runScript(
      cl,
      guilds.filter((e) =>
        require(`./config/${e.id}.json`)["plugins.disabled"].includes(plugin)
      )
    );
  }

  for (const event of events) {
    client.on(event.type, (...params) => {
      if (getEventGuild(...params) !== null) {
        if (
          fs
            .readdirSync("./config/")
            .filter(
              (e) =>
                !require(`./config/${e}`)["plugins.disabled"].includes(
                  event.from
                )
            )
            .includes(getEventGuild(...params) + ".json")
        ) {
          event.exec(...params);
        }
      }
    });
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.type === interaction.isChatInputCommand()) return;

  commands.forEach(async (cm) => {
    if (interaction.commandName === cm.name) {
      await cm.exec(interaction);
    } else return;
  });
});

process.chdir(__dirname);

process.on("SIGINT", () => {
  client.application.commands.set([]);
  console.log("Stopping the bot");
  client.destroy();
  process.exit();
});

client.login(TOKEN);
