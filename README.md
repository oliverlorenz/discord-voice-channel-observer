# Discord VoiceChannel Observer

A small library to watch a discord voice channel is empty or not

### Usage

```
import * as Discord from 'discord.js';
import { VoiceChannelObserver } from 'discord-voice-channel-observer';

const token = '***********************';
const voiceChannelId = '****************';

(async() => {
    const client = new Discord.Client();
    await client.login(token);

    const observer = new VoiceChannelObserver(client, voiceChannelId);
    observer.onEmpty((channelId: string) => {
        console.log(`empty: ${channelId}`)
    })
    observer.onNotEmpty((channelId: string) => {
        console.log(`not empty: ${channelId}`)
    })
})()
```