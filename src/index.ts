import { Client, VoiceState } from 'discord.js';
import { EventEmitter } from 'events';

export enum Event {
	INCREASE = 'increase',
	DECREASE = 'decrease',
	NO_CHANGE = 'no_change',
}

export interface Counts {
	before: number;
	now: number;
}

export class VoiceChannelObserver {
	private emitter: EventEmitter;
	private currentPresentUsers: string[];

	constructor(private client: Client, private channelId: string) {
		this.emitter = new EventEmitter();
		this.currentPresentUsers = [];
	}

	private addUser(userId: string) {
		if (!this.currentPresentUsers.includes(userId)) {
			this.currentPresentUsers.push(userId);
		}
	}

	public getCurrentPresentUsersCount(): number {
		return this.currentPresentUsers.length;
	}

	async start() {
		const channel = await this.client.channels.fetch(this.channelId);
		// @ts-ignore
		for (const [id] of channel.members) {
			this.addUser(id);
		}

		this.client.on(
			'voiceStateUpdate',
			(oldMember: VoiceState, newMember: VoiceState) => {
				if (this.hasUserJoined(oldMember, newMember)) {
					const countBefore = this.currentPresentUsers.length;
					this.addUser(newMember.id);
					const countAfter = this.currentPresentUsers.length;
					if (countBefore !== countAfter) {
						return this.emitIncrease(countBefore, countAfter);
					}
				}

				if (this.hasUserLeft(oldMember, newMember)) {
					const countBefore = this.currentPresentUsers.length;
					console.log(this.currentPresentUsers);
					this.currentPresentUsers = this.currentPresentUsers.filter(
						(userIdInList) => {
							return userIdInList !== newMember.id;
						}
					);
					const countAfter = this.currentPresentUsers.length;
					if (countBefore !== countAfter) {
						return this.emitDecrease(countBefore, countAfter);
					}
				}

				this.emitNothingChanged(this.currentPresentUsers.length);
			}
		);
	}

	private isChannelChanged(oldMember: VoiceState, newMember: VoiceState) {
		return oldMember.channelID !== newMember.channelID;
	}

	private hasUserJoined(oldMember: VoiceState, newMember: VoiceState) {
		if (!this.isChannelChanged(oldMember, newMember)) return false;
		return newMember.channelID === this.channelId;
	}

	private hasUserLeft(oldMember: VoiceState, newMember: VoiceState) {
		if (!this.isChannelChanged(oldMember, newMember)) return false;
		return oldMember.channelID === this.channelId;
	}

	private emitIncrease(before: number, now: number) {
		this.emitter.emit(Event.INCREASE, { before, now });
	}

	private emitNothingChanged(count: number) {
		this.emitter.emit(Event.NO_CHANGE, { before: count, now: count });
	}

	private emitDecrease(before: number, now: number) {
		this.emitter.emit(Event.DECREASE, { before, now });
	}

	public onEmpty(callback: (counts: Counts) => void) {
		this.onDecreased((counts: Counts) => {
			console.log(counts);
			if (counts.now === 0 && counts.before > 0) callback(counts);
		});
	}

	public onChange(callback: (counts: Counts) => void) {
		this.onIncreased(callback);
		this.onDecreased(callback);
	}

	public onNothingChanged(callback: (counts: Counts) => void) {
		this.emitter.on(Event.NO_CHANGE, callback);
	}

	public onIncreased(callback: (counts: Counts) => void) {
		this.emitter.on(Event.INCREASE, callback);
	}

	public onDecreased(callback: (counts: Counts) => void) {
		this.emitter.on(Event.DECREASE, callback);
	}

	public onNotEmpty(callback: (counts: Counts) => void) {
		this.emitter.on(Event.INCREASE, (counts: Counts) => {
			if (counts.before === 0 && counts.now > 0) callback(counts);
		});
	}

	public onThresholdReached(
		threshold: number,
		callback: (channelId: string, counts: Counts) => void
	) {
		this.emitter.on(Event.INCREASE, (counts: Counts) => {
			if (counts.now >= threshold) return callback(this.channelId, counts);
		});
	}

	public onceThresholdReached(
		threshold: number,
		callback: (channelId: string, counts: Counts) => void
	) {
		const handler = (counts: Counts) => {
			if (counts.now >= threshold) {
				callback(this.channelId, counts);
				this.emitter.removeListener(Event.INCREASE, handler);
			}
		};
		this.emitter.on(Event.INCREASE, handler);
	}

	public onThresholdLeft(
		threshold: number,
		callback: (channelId: string, counts: Counts) => void
	) {
		this.emitter.on(Event.DECREASE, (counts: Counts) => {
			if (counts.now < threshold) callback(this.channelId, counts);
		});
	}

	public onceThresholdLeft(
		threshold: number,
		callback: (channelId: string, counts: Counts) => void
	) {
		const handler = (counts: Counts) => {
			if (counts.now < threshold) {
				callback(this.channelId, counts);
				this.emitter.removeListener(Event.DECREASE, handler);
			}
		};
		this.emitter.on(Event.DECREASE, handler);
	}
}
