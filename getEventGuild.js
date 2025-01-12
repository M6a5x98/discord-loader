module.exports = (...params) => {
  for (const param of params) {
    if ("roles" in param && "id" in param) return param.id;
    if (!("guildId" in param)) return param.guildId;
    else if ("guild" in param)
      if ("id" in param.guild) return param.guild.id;
      else return null;
  }
};
