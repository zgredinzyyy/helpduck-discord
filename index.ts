import DiscordJS, { Intents, MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed } from 'discord.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

const client = new DiscordJS.Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.on('ready', (client) => {
    console.log(`Logged in as ${client.user.tag}!`);

    const guildId = "932004136914911273";
    const guild = client.guilds.cache.get(guildId);
    let commands

    if (guild) {
        commands = guild.commands
    } else {
        commands = client.application?.commands
    }

    commands?.create({
        name: 'ping',
        description: 'Ping the bot',
    })

    commands?.create({
        name: 'new_help',
        description: 'Dodaj nowy artykuł do pomocy na helpduck.pl',
        options: [
            {
                name: 'title',
                description: 'Tytuł artykułu',
                required: true,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
            },
            {
                name: 'desc',
                description: 'Opis artykułu',
                required: true,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
            },
            {
                name: 'thumbnail',
                description: 'Miniaturka artykułu',
                required: true,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
            },
            {
                name: 'url',
                description: 'Link do artykułu',
                required: true,
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
            }
        ]
    });
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) {
        return
    }

    const { commandName, options } = interaction;

    if (commandName === "ping") {
        interaction.reply({
            content: "Pong!",
            ephemeral: true,
        });
    }

    if (commandName === "new_help") {
        const author = interaction.user.username;
        const title = options.getString("title")!;
        const desc = options.getString("desc")!;
        const thumbnail = options.getString("thumbnail")!;
        const url = options.getString("url")!;

        const row = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId("accept_help")
                .setLabel("Akceptuj")
                .setStyle("SUCCESS")
                .setEmoji("✅"),
            new MessageButton()
                .setCustomId("decline_help")
                .setLabel("Anuluj")
                .setStyle("DANGER")
                .setEmoji("😖"),
        );

        const messageEmbed = new MessageEmbed()
            .setThumbnail(thumbnail)
            .setURL(url)
            .setColor("#0099ff")
            .setAuthor({
                name: `${interaction.user.username}`,
                iconURL: interaction.user.avatarURL()!,
            })
            .addFields(
                { name: "Tytuł", value: title },
                { name: "Opis", value: desc },
                { name: "Miniaturka", value: thumbnail },
                { name: "Link", value: url },
            )
            .setTimestamp()
            .setFooter({
                text: "Helpduck.pl",
                iconURL: "https://i.imgur.com/cXvkfuG.png",
            })

        const filter = (i: MessageComponentInteraction) => i.customId === "accept_help" || i.customId === "decline_help";

        const collector = interaction.channel!.createMessageComponentCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async (i: MessageComponentInteraction) => {
            if (i.customId === 'accept_help') {
                await i.deferReply()
                const response = await fetch("https://helpduck.herokuapp.com/append", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        author,
                        title,
                        desc,
                        thumbnail,
                        url,
                    })
                })

                if (response.status === 200) {
                    await interaction.editReply({
                        content: "`Zaakceptowano artykuł!`",
                        components: [],
                        embeds: []
                    });
                    await i.deleteReply();
                    await i.channel?.send({
                        content: "`Utworzono nowy artykuł!`",
                        embeds: [messageEmbed]
                    })
                } else {
                    await i.editReply({
                        content: "Wystąpił błąd z serwerem. Spróbuj ponownie później albo pingnij bartka pweeez",
                    });
                }
            }
        });

        collector.on('end', async collection => {
            await interaction.editReply({
                content: "Cancelled",
                components: [],
                embeds: []
            });
        });


        interaction.reply({
            ephemeral: true,
            components: [row],
            embeds: [messageEmbed]
        })
    }
});

client.login(process.env.TOKEN);