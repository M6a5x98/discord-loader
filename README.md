# Installation and starting
> [!WARNING]
> To start the loader, `Node.JS` and `NPM` must be installed.

Go in the directory where the program is and type : 
```bash
npm install
```
 ## Starting
 Create a `.env` file with the following content :
 ```properties
TOKEN=<Your_Bot_Token>
```
 Then type :
 ```bash
node .
```
# Plugins
This loader is based on plugins, modules for your bot. They can : 
- Register commands
- Run scripts when the bot starts
- Add rvent listeners
There are to types of plugins, simple and multi.
Simples plugins does just one thing. Multi plugins do many things

## Create plugin
To create a plugin go in the plugin directory and create a directory named the same as your plugin. 
Then create a file called `plugin.json` in the folder and put the following content in it : 
```typescript
{
   "name":"<name_of_your_plugin>",
   "type":number //0 = command, 1 = event, 2 = startup script,
   "main":"<your_main_file>"
}
```
This a file for a Simple plugin, to create a Multi plugin replace the `type` and `main` keys with arrays (`[0, 1, 1]`, `["command.js", "messageCreate.js", "randomEvent.js"]`)
### Command File
If you want to create a command go in the associated file and write :
```javascript
module.exports = {
data: {},//here your /command (you can use raw object or SlashCommandBuilder)
exec: async (interaction /*the source CommandInteraction*/) => {
//The code to run when the command is called
}
}
```
### Event File
If you want to create a event go in the associated file and write :
```javascript
module.exports = {
type: "",//here the name of the event
exec: (/*params of the event*/) => {
//The code to run when the event is called
}
}
```
### Script File
If you want to create a startip script go in the associated file and write :
```javascript
module.exports = (client /*the Client running it*/, guilds /*the guilds of the bots*/) => {
//The code to run when the script is called
}
```
