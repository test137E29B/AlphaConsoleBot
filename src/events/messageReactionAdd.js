/**
 * ! Message Reaction add event
 *
 * ? This is triggered whenever a reaction has been added to a fetched message.
 * ? This is used for example to remove suggestions & showcases easily by ❌
 * ? But also purposes for other reasons
 */
const Discord = require("discord.js");
const request = require("request");
var cooldown = {};

module.exports.run = (
  client,
  serverInfo,
  config,
  reaction,
  user,
  sendEmbed
) => {
  if (reaction.message.guild.id !== serverInfo.guildId) return;
  if (user.bot) return;

  getRoles(user, serverInfo, client, member => {
    if (reaction.emoji.name === "❌" && member.isAdmin) {
      //* Showcase deletion
      if (reaction.message.channel.id === serverInfo.channels.showcase) {
        user
          .send(
            `Please respond with the reason why you deleted the showcase. \n**This reason will be logged & sent to the user** \nYou have 30 seconds to respond.`
          )
          .then(msg => {
            msg.channel
              .awaitMessages(response => response.content, {
                max: 1,
                time: 30000,
                errors: ["time"]
              })
              .then(collected => {
                let reason = collected.first().content;
                handleMessage(
                  client,
                  serverInfo,
                  user,
                  reaction,
                  reason,
                  "Showcase",
                  sendEmbed
                );
              })
              .catch(e => {
                let reason = "Unrelated to the channel's purpose.";
                handleMessage(
                  client,
                  serverInfo,
                  user,
                  reaction,
                  reason,
                  "Showcase",
                  sendEmbed
                );
              });
          });
      }

      //* Suggestion deletion
      if (reaction.message.channel.id === serverInfo.channels.suggestion) {
        user
          .send(
            `Please respond with the reason why you deleted the suggestion. \n**This reason will be logged & sent to the user** \nYou have 30 seconds to respond.`
          )
          .then(msg => {
            msg.channel
              .awaitMessages(response => response.content, {
                max: 1,
                time: 30000,
                errors: ["time"]
              })
              .then(collected => {
                let reason = collected.first().content;
                handleMessage(
                  client,
                  serverInfo,
                  user,
                  reaction,
                  reason,
                  "Suggestion",
                  sendEmbed
                );
              })
              .catch(e => {
                let reason =
                  "Not a valid suggestion, already been suggested, or in violation of the information listed at the top of our suggestions channel.";
                handleMessage(
                  client,
                  serverInfo,
                  user,
                  reaction,
                  reason,
                  "Suggestion",
                  sendEmbed
                );
              });
          });
      }
    }

    //* Title reports
    if (
      (member.isAdmin || member.isModerator) &&
      reaction.message.channel.id === serverInfo.channels.ingameReports
    ) {
      if (!reaction.message.content.startsWith("**===")) {
        if (reaction._emoji.name == "🔨") {
          config.sql.query(
            `select * from TitleReports where MessageID = ?`,
            [reaction.message.id],
            (err, res) => {
              if (res && res[0]) {
                let url =
                  config.keys.SetTitleURL +
                  "?DiscordID=" +
                  res[0].DiscordID +
                  "&key=" +
                  config.keys.Password +
                  "&title=" +
                  escape("Title reset by admin!");

                request(url, (err, result, body) => {
                  if (err) {
                    let errorCode =
                      Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                    console.error(
                      `Error code ${errorCode} by ${user.tag}`,
                      err
                    );
                    return sendEmbed(
                      user,
                      "🚫 An error occurred. Please contact Pollie#0001. Error code: `" +
                        errorCode +
                        "`"
                    );
                  }

                  if (body.toLowerCase().includes("done")) {
                    config.sql.query(
                      `update TitleReports set Fixed = 1 where MessageID = ?`,
                      [reaction.message.id]
                    );
                    reaction.message.delete();

                    let urlRating =
                      config.keys.RatingURL +
                      "?DiscordID=" +
                      res[0].Reporter +
                      "&key=" +
                      config.keys.Password +
                      "&Type=1";
                    request(urlRating, err => {
                      if (err) {
                        let errorCode =
                          Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                        console.error(
                          `Error code ${errorCode} by ${user.tag}`,
                          err
                        );
                        return sendEmbed(
                          user,
                          "🚫 An error occurred. Please contact Pollie#0001. Error code: `" +
                            errorCode +
                            "`"
                        );
                      }
                    });
                  } else {
                    user.send(
                      "I did not receive a confirmation from the server. This is what the server sent back:\n`" +
                        body +
                        "`"
                    );
                  }
                });
              }
            }
          );
        }

        if (reaction._emoji.name == "✅") {
          config.sql.query(
            `update TitleReports set Permitted = 1, Fixed = 1 where MessageID = ?`,
            [reaction.message.id]
          );
          reaction.message.delete().catch(e => {});
        }

        if (reaction._emoji.name == "❎") {
          config.sql.query(`delete from TitleReports where MessageID = ?`, [
            reaction.message.id
          ]);
          reaction.message.delete().catch(e => {});
        }
      }

      //* Title user reporter
      if (reaction.message.content.startsWith("**===")) {
        if (reaction.emoji.name === "❌") {
          reaction.message.delete();

          if (reaction.message.mentions.users.first()) {
            let urlRating =
              config.keys.RatingURL +
              "?DiscordID=" +
              reaction.message.mentions.users.first().id +
              "&key=" +
              config.keys.Password +
              "&Type=-1";
            request(urlRating, err => {
              if (err) {
                let errorCode =
                  Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                console.error(`Error code ${errorCode} by ${user.tag}`, err);
                return sendEmbed(
                  user,
                  "🚫 An error occurred. Please contact Pollie#0001. Error code: `" +
                    errorCode +
                    "`"
                );
              }
            });
          }
        }

        if (reaction.emoji.name === "✅") {
          reaction.message.delete();
        }
      }
    }

    //* Banner Requests
    if (reaction.message.channel.id == serverInfo.channels.banners) {
      if (member.isAdmin || member.isModerator) {
        if (reaction.emoji.name === "✅") {
          config.sql.query(
            `Select * from Players where DiscordID = ?`,
            [reaction.message.mentions.users.first().id],
            (err, res) => {
              let url =
                config.keys.SetBannerURL +
                "?id=" +
                res[0].SteamID +
                "&key=" +
                config.keys.Password +
                "&url=" +
                reaction.message.attachments
                  .first()
                  .url.split(" ")
                  .join("%20");

              request(url, function(err, res, body) {
                if (err) return console.error(err);

                if (
                  body.toLowerCase().startsWith("fail") ||
                  body.startsWith("<!DOCTYPE")
                )
                  return user.send("Something went wrong: " + body);

                config.sql.query(
                  "Update Titles set Banner = ? where DiscordID = ?",
                  [body.trim(), reaction.message.mentions.users.first().id],
                  err => {
                    if (err) return console.error(err);

                    sendEmbed(
                      reaction.message.mentions.users.first(),
                      "Your banner has been approved",
                      undefined,
                      undefined,
                      reaction.message.attachments.first().url
                    );
                    reaction.message.delete();
                  }
                );
              });
            }
          );
        } else if (reaction.emoji.name === "❌") {
          sendEmbed(
            reaction.message.mentions.users.first(),
            "Your banner has been denied."
          );
          reaction.message.delete();
        }
      }
    }

    if (
      `:${reaction.emoji.name}:${reaction.emoji.id}` ==
        serverInfo.partnerEmoji &&
      reaction.message.channel.id === serverInfo.channels.partners
    ) {
      // Reacted to message, remove reaction, send messages
      reaction.users.remove(user);
      if (cooldown[user.id] && cooldown[user.id] + 5000 > new Date().getTime())
        return;
      cooldown[user.id] = new Date().getTime();

      var errChannel = reaction.message.guild.channels.get(
        serverInfo.channels.modlog
      );

      config.sql.query(
        "Select * from partners where id = ?",
        [reaction.message.id],
        (err, res) => {
          if (!res[0])
            return sendEmbed(
              errChannel,
              "Partner Database Error",
              "Something has gone wrong getting the 'message_data' from the 'partners' table. That's all I know."
            );

          var data = JSON.parse(res[0].message_data);
          sendMessages(user, data, serverInfo, config.sql, errChannel);
        }
      );
    }
  });
};

/**
 *
 * @param {Collection} user
 * @param {Object} serverInfo
 * @param {Collection} client
 * @param {Function} callback
 */
function getRoles(user, serverInfo, client, callback) {
  client.guilds
    .get(serverInfo.guildId)
    .members.fetch(user.id)
    .then(m => {

      if (m.roles.has(serverInfo.roles.admin))
        m.isAdmin = true;
      else m.isAdmin = false;

      if (m.roles.has(serverInfo.roles.moderator) || m.isAdmin)
        m.isModerator = true;
      else m.isModerator = false;

      if (m.roles.has(serverInfo.roles.support) || m.isModerator)
        m.isSupport = true;
      else m.isSupport = false;

      if (m.roles.has(serverInfo.roles.staff) || m.isSupport) m.isStaff = true;
      else m.isStaff = false;

      if (m.roles.has(serverInfo.roles.ch) || m.isStaff) m.isCH = true;
      else m.isCH = false;

      callback(m);
    });
}

/**
 * @param {Collection} client
 * @param {Object} serverInfo
 * @param {Collection} user
 * @param {Collection} reaction
 * @param {String} reason
 * @param {String} event
 * @param {Function} sendEmbed
 */
function handleMessage(
  client,
  serverInfo,
  user,
  reaction,
  reason,
  event,
  sendEmbed
) {
  reaction.message.delete();
  sendEmbed(
    reaction.message.author,
    `Your ${event.toLowerCase()} was deleted by ${user.tag}`,
    `Reason: ${reason}`
  );

  const embedLog = new Discord.MessageEmbed()
    .setColor([255, 255, 0])
    .setAuthor(
      `${event.toUpperCase()} DELETED`,
      client.user.displayAvatarURL({ format: "png" })
    )
    .addField(
      `${event} by `,
      `${reaction.message.member} (${reaction.message.author.id})`
    );

  if (reaction.message.content.length != 0)
    embedLog.addField(`Content`, `${reaction.message.content}`);
  embedLog.addField(`Channel`, `${reaction.message.channel}`);
  embedLog.addField(`Deleted by`, `${user.tag}`);
  embedLog.addField("Reason:", reason);
  client.guilds
    .get(serverInfo.guildId)
    .channels.get(serverInfo.channels.aclog)
    .send(embedLog);
}

function sendMessages(user, data, serverInfo, sql, errChannel) {
  // format fo messages {type: "", content: "", url: "", react: bool, id: ""}
  // if react then is partner message, and update db to new message id where message.id

  return new Promise((resolve, reject) => {
    var chain = Promise.resolve();
    for (let message of data.messages) {
      chain = chain.then(() => {
        switch (message.type) {
          case "hybrid":
            return user.send(message.content, { files: [message.url] });
          case "file":
            return user.send("", { files: [message.url] });
          case "text":
            return user.send(message.content);
          default:
            reject(
              "A Message Type error has occurred. Please contact an AlphaConsole Admin!"
            );
        }
      });
    }
    chain = chain.then(resolve()).catch(err => reject(err));
  });
}
