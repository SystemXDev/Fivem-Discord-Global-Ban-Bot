const { Client, CommandInteraction, MessageEmbed, Intents } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');

const client = new Client({ 
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS 
    ]
});

const config = {
    token: "TOKEN HERE",
    clientId: "CLIENTID HERE",
    guildId: "MAIN GUILDID HERE",
    ownerId: "OWNER DISCORD USERID HERE",
    permissionRole: null,
    logChannel: null,
    appealLogChannel: "APPEALLOG CHANNEL HERE",
    allowedGuilds: ["MAIN GUILDID HERE", "BSCO GUILD ID HERE ", "SAST GUILD ID HERE", "ADD MORE HERE"] // add the guild ids of the servers that the Gban and Ungan..
};


const commands = [
    {
        name: 'gban',
        description: 'Globally ban a user',
        options: [
            {
                name: 'userid',
                type: 3,
                description: 'User ID to globally ban',
                required: true
            },
            {
                name: 'reason',
                type: 3,
                description: 'Reason for the ban',
                required: false
            }
        ]
    },
    {
        name: 'ungban',
        description: 'Unban a globally banned user',
        options: [
            {
                name: 'userid',
                type: 3,
                description: 'User ID to unban',
                required: true
            },
            {
                name: 'reason',
                type: 3,
                description: 'Reason for the unban',
                required: false
            }
        ]
    },
    {
        name: 'setlogs',
        description: 'Set the log channel for global bans and unbans',
        options: [
            {
                name: 'channel',
                type: 7,
                description: 'Channel to set as log channel',
                required: true
            }
        ]
    },
    {
        name: 'setp',
        description: 'Set the role required to use global ban and unban commands',
        options: [
            {
                name: 'role',
                type: 8,
                description: 'Role to set as permission role',
                required: true
            }
        ]
    },
    {
        name: 'appeal',
        description: 'Appeal a ban',
        options: [
            {
                name: 'reason',
                type: 3, 
                description: 'Reason for the appeal',
                required: true
            },
            {
                name: 'rpname',
                type: 3, 
                description: 'RP Name',
                required: true
            },
            {
                name: 'discordid',
                type: 3, 
                description: 'Discord ID',
                required: true
            }
        ]
    },
    {
        name: 'a',
        description: 'Approve an appeal',
        options: [
            {
                name: 'userid',
                type: 3,
                description: 'User ID of the appeal to approve',
                required: true
            },
            {
                name: 'reason',
                type: 3, 
                description: 'Reason for the approval',
                required: true
            },
            {
                name: 'appealnumber',
                type: 3, 
                description: 'Appeal Number for the approval',
                required: true
            }
        ]
    },
    {
        name: 'd',
        description: 'Deny an appeal',
        options: [
            {
                name: 'userid',
                type: 3, 
                description: 'User ID of the appeal to deny',
                required: true
            },
            {
                name: 'reason',
                type: 3, 
                description: 'Reason for the denial',
                required: true
            },
            {
                name: 'appealnumber',
                type: 3, 
                description: 'Appeal Number for the approval',
                required: true
            }
        ]
    }
];


const rest = new REST({ version: '9' }).setToken(config.token);

(async () => {
    try {
        console.log('Started refreshing application commands.');

        await rest.put(
            Routes.applicationCommands(config.clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application commands.');
    } catch (error) {
        console.error(error);
    }
})();


client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);


    updateStatus(client.guilds.cache.get(config.guildId));


    setInterval(() => {
        updateStatus(client.guilds.cache.get(config.guildId));
    }, 60000);
});




function updateStatus(guild) {

    guild.bans.fetch().then(bannedUsers => {
        const bannedUsersCount = bannedUsers.size;
        console.log(`Number of bans: ${bannedUsersCount}`);


        let appeals = loadAppeals();
        const appealsCount = Object.keys(appeals).length;
        console.log(`Number of appeals: ${appealsCount}`);

        client.user.setActivity(`${bannedUsersCount} bans | ${appealsCount} appeals`, { type: 'WATCHING' });
    }).catch(console.error);
}




let database = {};
if (fs.existsSync('./database.json')) {
    const data = fs.readFileSync('./database.json');
    database = JSON.parse(data);
}

function loadAppeals() {
    try {
        if (fs.existsSync('./appeals.json')) {
            const data = fs.readFileSync('./appeals.json', 'utf8');
            return JSON.parse(data);
        } else {

            return {};
        }
    } catch (error) {

        console.error('Error loading appeals:', error);
        return {};
    }
}

function saveAppeals(appeals) {
    try {
        fs.writeFileSync('./appeals.json', JSON.stringify(appeals, null, 2));
    } catch (error) {
        console.error('Error saving appeals:', error);
    }
}


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options, guild } = interaction;

    if (commandName === 'gban') {
        if (!interaction.member.roles.cache.has(config.permissionRole)) return interaction.reply('You do not have permission to use this command.');

        const userID = options.getString('userid');
        const reason = options.getString('reason') || 'No reason provided';

        for (const allowedGuildID of config.allowedGuilds) {
            const allowedGuild = client.guilds.cache.get(allowedGuildID);
            if (allowedGuild) {
                await allowedGuild.members.ban(userID, { reason: reason });
                const embed = new MessageEmbed()
                    .setTitle('Global Ban')
                    .addField('User ID', userID)
                    .addField('Reason', reason)
                    .setColor('#ff0000')
                    .setTimestamp();
                const allowedLogChannel = allowedGuild.channels.cache.get(config.logChannel);
                allowedLogChannel.send({ embeds: [embed] });
                interaction.reply(`User with ID ${userID} has been globally banned in ${allowedGuild.name}.`);
            }
        }
        database[userID] = { type: 'ban', reason: reason, timestamp: Date.now() };
        fs.writeFileSync('./database.json', JSON.stringify(database));
    }else if (commandName === 'ungban') {
        if (!interaction.member.roles.cache.has(config.permissionRole)) return interaction.reply('You do not have permission to use this command.');

        const userID = options.getString('userid');
        const reason = options.getString('reason') || 'No reason provided';

        for (const allowedGuildID of config.allowedGuilds) {
            const allowedGuild = client.guilds.cache.get(allowedGuildID);
            if (allowedGuild) {
                await allowedGuild.members.unban(userID, reason);
                const embed = new MessageEmbed()
                    .setTitle('Global Unban')
                    .addField('User ID', userID)
                    .addField('Reason', reason)
                    .setColor('#00ff00')
                    .setTimestamp();
                const allowedLogChannel = allowedGuild.channels.cache.get(config.logChannel);
                allowedLogChannel.send({ embeds: [embed] });
                interaction.reply(`User with ID ${userID} has been globally unbanned in ${allowedGuild.name}.`);
            }
        }
        delete database[userID];
        fs.writeFileSync('./database.json', JSON.stringify(database));
    } else if (commandName === 'setlogs') {
        if (interaction.member.id !== config.ownerId) return interaction.reply('Only the owner of the server can use this command.');

        const logChannelID = options.getChannel('channel').id;
        config.logChannel = logChannelID;
        fs.writeFileSync('./config.json', JSON.stringify(config));
        interaction.reply(`Log channel has been set to <#${logChannelID}>.`);
    } else if (commandName === 'setp') {
        if (interaction.member.id !== config.ownerId) return interaction.reply('Only the owner of the server can use this command.');

        const roleID = options.getRole('role').id;
        config.permissionRole = roleID;
        fs.writeFileSync('./config.json', JSON.stringify(config));
        interaction.reply(`Permission role has been set to <@&${roleID}>.`);
    } else if (commandName === 'appeal') {
        const reason = options.getString('reason');
        const rpname = options.getString('rpname');
        const discordid = options.getString('discordid');
        
        const appealLogChannelID = config.appealLogChannel;
        const appealLogChannel = await client.channels.fetch(appealLogChannelID);
    
        if (!appealLogChannel || appealLogChannel.type !== 'GUILD_TEXT') {
            console.error('Error: Invalid appeal log channel ID or channel type.');
            return interaction.reply('An error occurred while processing your appeal request. Please try again later.');
        }
    
        let appeals = loadAppeals();
        const appealNumber = Object.keys(appeals).length + 1;
    
        appeals[appealNumber] = { rpname, discordid, reason };
        saveAppeals(appeals);
    
        const appealEmbed = new MessageEmbed()
            .setTitle('Appeal Request')
            .addField('Appeal Number', appealNumber.toString())
            .addField('RP Name', rpname)
            .addField('Discord ID', discordid)
            .addField('Reason', reason)
            .setColor('#FFFF00')
            .setTimestamp();
    
        try {
            await appealLogChannel.send({ embeds: [appealEmbed] });
    
            interaction.reply('Your appeal request has been submitted. Please wait for an admin to review it.');
        } catch (error) {
            console.error('Error processing appeal request:', error);
            interaction.reply('An error occurred while processing your appeal request. Please try again later.');
        } 
    }
    else if (commandName === 'a') {
        if (interaction.member.id !== config.ownerId) return interaction.reply('Only the owner of the server can use this command.');
    
        const userId = options.getString('userid');
        const reason = options.getString('reason');
        const appealNumber = parseInt(options.getString('appealnumber')); 
    
        console.log('Appeal Number:', appealNumber);
        console.log('Before Load Appeals:', appeals); 
    
        let loadedAppeals = loadAppeals();
        console.log('Loaded Appeals:', loadedAppeals); 
    
        const appealInfo = loadedAppeals[appealNumber];
    
        console.log('Appeal Info:', appealInfo);
    
        if (!appealInfo) {
            return interaction.reply('No appeal found for the specified appeal number. Please provide a valid appeal number.');
        }
        const finalEmbed = new MessageEmbed()
            .setTitle('Appeal Decision')
            .setDescription(`The appeal request for user ${appealInfo.rpname} has been approved.`)
            .addField('Original Reason', appealInfo.reason)
            .addField('Admin Reason', reason)
            .setColor('#FFFF00');
    
        try {
            await interaction.reply({ embeds: [finalEmbed] });
            await interaction.guild.members.cache.get(userId)?.send(`Your appeal has been approved by the admin with the reason: ${reason}`);
            delete loadedAppeals[appealNumber];
            saveAppeals(loadedAppeals);
        } catch (error) {
            console.error('Error sending appeal decision:', error);
            interaction.reply('An error occurred while sending the appeal decision.');
        }
    }     
    else if (commandName === 'd') {
        if (interaction.member.id !== config.ownerId) return interaction.reply('Only the owner of the server can use this command.');
    
        const userId = options.getString('userid');
        const reason = options.getString('reason');
        const appealNumber = parseInt(options.getString('appealnumber')); 
    
        console.log('Appeal Number:', appealNumber);
        console.log('Before Load Appeals:', appeals); 
    
        let loadedAppeals = loadAppeals();
        console.log('Loaded Appeals:', loadedAppeals); 
    
        const appealInfo = loadedAppeals[appealNumber];
    
        console.log('Appeal Info:', appealInfo);
    
        if (!appealInfo) {
            return interaction.reply('No appeal found for the specified appeal number. Please provide a valid appeal number.');
        }
    
        const finalEmbed = new MessageEmbed()
            .setTitle('Appeal Decision')
            .setDescription(`The appeal request for user ${appealInfo.rpname} has been denied.`)
            .addField('Original Reason', appealInfo.reason)
            .addField('Admin Reason', reason)
            .setColor('#FFFF00');
    
        try {
            await interaction.reply({ embeds: [finalEmbed] });
            await interaction.guild.members.cache.get(userId)?.send(`Your appeal has been denied by the admin with the reason: ${reason}`);
    
            delete loadedAppeals[appealNumber];
            saveAppeals(loadedAppeals);
        } catch (error) {
            console.error('Error sending appeal decision:', error);
            interaction.reply('An error occurred while sending the appeal decision.');
        }
    }    
});

client.login(config.token);
