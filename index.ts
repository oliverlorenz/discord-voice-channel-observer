import { Client, VoiceState } from "discord.js";
import { EventEmitter } from 'events';

const EVENT_INCREASE = 'increase';
const EVENT_DECREASE = 'decrease';


export class VoiceChannelObserver {
    private currentPresentUsers: string[];
    private emitter: EventEmitter;

    constructor(
        private client: Client, 
        private channelId: string
    ) {
        this.currentPresentUsers = []
        this.emitter = new EventEmitter();
        this.client.on('voiceStateUpdate', (oldMember, newMember) => {
            if (this.hasUserJoined(oldMember, newMember)) {
                const countBefore = this.currentPresentUsers.length;
                this.currentPresentUsers.push(newMember.id);
                const countAfter = this.currentPresentUsers.length;
                this.emitIncrease(countBefore, countAfter);
            }

            if (this.hasUserLeft(oldMember, newMember)) {
                const countBefore = this.currentPresentUsers.length;
                this.currentPresentUsers = this.currentPresentUsers.filter((userIdInList) => {
                    return userIdInList !== newMember.id;
                })
                const countAfter = this.currentPresentUsers.length;
                this.emitDecrease(countBefore, countAfter);
            }
        })
    }

    private isChannelChanged(oldMember: VoiceState, newMember: VoiceState) {
        return oldMember.channelID !== newMember.channelID;
    }

    private hasUserJoined(oldMember: VoiceState, newMember: VoiceState) {
        if (!this.isChannelChanged(oldMember, newMember)) return false;
        return newMember.channelID === this.channelId 
    }

    private hasUserLeft(oldMember: VoiceState, newMember: VoiceState) {
        if (!this.isChannelChanged(oldMember, newMember)) return false;
        return oldMember.channelID === this.channelId 
    }

    private emitIncrease(before: number , after: number) {
        this.emitter.emit(EVENT_INCREASE, { before, after })
    }

    private emitDecrease(before: number , after: number) {
        this.emitter.emit(EVENT_DECREASE, { before, after })
    }

    public onEmpty(callback: (channelId: string) => void) {
        this.emitter.on(EVENT_DECREASE, (counts) => {
            if (counts.after === 0) callback(this.channelId);
        });
    }

    public onChange(callback: (channelId: string) => void) {
        this.emitter.on(EVENT_DECREASE, callback);
        this.emitter.on(EVENT_INCREASE, callback);
    }

    public onNotEmpty(callback: (channelId: string) => void) {
        this.emitter.on(EVENT_INCREASE, (counts) => {
            if (counts.before === 0) callback(this.channelId);
        });
    }
}