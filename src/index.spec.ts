import { VoiceChannelObserver, Counts } from '.';
import { EventEmitter } from 'events';
import { Client, VoiceState, Collection } from 'discord.js';

describe('VoiceChannelObserver', () => {
	const fakeChannelId = 'myChannelId';
	function buildObserver(alreadyPresentUserIds: string[] = []) {
		const emitter = (Object.assign(new EventEmitter(), {
			channels: {
				fetch: async () => {
					const members = new Collection<string, {}>();
					alreadyPresentUserIds.forEach((userId) => {
						members.set(userId, {});
					});
					return {
						members,
					};
				},
			},
		}) as unknown) as EventEmitter;
		const observer = new VoiceChannelObserver(emitter as Client, fakeChannelId);
		return {
			observer,
			emitter,
		};
	}

	describe('to be defined', () => {
		it('with no users', () => {
			const { observer } = buildObserver();
			expect(observer).toBeDefined();
		});

		it('with predefined users', () => {
			const { observer } = buildObserver(['fakeUser']);
			expect(observer).toBeDefined();
		});
		describe('users should be unique', () => {
			it('add', async () => {
				const { observer, emitter } = buildObserver(['fakeUser']);
				await observer.start();
				emitter.emit(
					'voiceStateUpdate',
					{
						id: 'fakeUser',
						channelID: 'FROM_CHANNEL_ID',
					} as VoiceState,
					{
						id: 'fakeUser',
						channelID: fakeChannelId,
					} as VoiceState
				);
				setTimeout(() => {
					expect(observer.getCurrentPresentUsersCount()).toEqual(1);
				}, 10);
			});
			it('remove', async () => {
				const { observer, emitter } = buildObserver([]);
				await observer.start();
				emitter.emit(
					'voiceStateUpdate',
					{
						id: 'fakeUser',
						channelID: fakeChannelId,
					} as VoiceState,
					{
						id: 'fakeUser',
						channelID: 'IRELEVANT_CHANNEL_ID',
					} as VoiceState
				);
				setTimeout(() => {
					expect(observer.getCurrentPresentUsersCount()).toEqual(1);
				}, 10);
			});
		});
	});

	describe('onIncreased', () => {
		it('changes parameters after join to channel', async (done) => {
			const { observer, emitter } = buildObserver();
			observer.onIncreased((counts: Counts) => {
				expect(counts).toEqual({ now: 1, before: 0 });
				done();
			});
			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				} as VoiceState,
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				} as VoiceState
			);
		});
	});

	describe('onDecreased', () => {
		it('changes parameters after leave to channel', async (done) => {
			const { observer, emitter } = buildObserver(['fakeUser']);

			observer.onDecreased((changeObject) => {
				expect(changeObject).toEqual({ now: 0, before: 1 });
				done();
			});
			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: 'TO_CHANNEL_ID',
				}
			);
		});
	});

	describe('onEmpty', () => {
		it('called if count drops to empty', async (done) => {
			const { observer, emitter } = buildObserver(['fakeUser']);

			observer.onEmpty((changeObject) => {
				done();
			});
			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: 'TO_CHANNEL_ID',
				}
			);
		});

		it("not called count doesn't match", async (done) => {
			const { observer, emitter } = buildObserver(['fakeUser', 'fakeUser2']);
			const callback = jest.fn();
			observer.onEmpty(callback);
			observer.onDecreased(() => {
				expect(callback).toBeCalledTimes(0);
				done();
			});
			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: 'TO_CHANNEL_ID',
				}
			);
		});
	});

	describe('onNotEmpty', () => {
		it('called if count drops to empty', async (done) => {
			const { observer, emitter } = buildObserver();

			observer.onNotEmpty((changeObject) => {
				done();
			});

			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
		});

		it("not called count doesn't match", async (done) => {
			const { observer, emitter } = buildObserver(['otherFakeUser']);
			const callback = jest.fn();
			observer.onNotEmpty(callback);

			await observer.start();
			observer.onIncreased(() => {
				expect(callback).not.toBeCalled();
				done();
			});
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'asdasd',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
		});
	});

	describe('onChange', () => {
		it('called if count increase', async (done) => {
			const { observer, emitter } = buildObserver();

			observer.onChange((changeObject) => {
				done();
			});

			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
		});
		it('called if count decrease', async (done) => {
			const { observer, emitter } = buildObserver(['fakeUser']);

			await observer.start();
			observer.onChange((changeObject) => {
				done();
			});
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				}
			);
		});
	});

	describe('onThresholdReached', () => {
		it('callback if threshold is reached', async (done) => {
			const { observer, emitter } = buildObserver(['anotherFakeUser']);
			observer.onThresholdReached(2, (changeObject) => {
				done();
			});

			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
		});

		it("not called count doesn't match", async (done) => {
			const { observer, emitter } = buildObserver();
			const callback = jest.fn();
			observer.onThresholdReached(2, callback);
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'asdasd',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);

			await observer.start();
			setTimeout(() => {
				expect(callback).not.toBeCalled();
				done();
			}, 1);
		});
	});

	describe('onceThresholdReached', () => {
		it('callback if threshold is reached', async (done) => {
			const { observer, emitter } = buildObserver(['anotherFakeUser']);
			observer.onceThresholdReached(2, (changeObject) => {
				done();
			});

			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
		});

		it('should only callback once', async () => {
			const { observer, emitter } = buildObserver();
			const callback = jest.fn();
			observer.onceThresholdReached(2, callback);

			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser2',
					channelID: 'FROM_CHANNEL_ID',
				},
				{
					id: 'fakeUser2',
					channelID: fakeChannelId,
				}
			);
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser3',
					channelID: 'FROM_CHANNEL_ID',
				},
				{
					id: 'fakeUser3',
					channelID: fakeChannelId,
				}
			);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it("not called count doesn't match", async (done) => {
			const { observer, emitter } = buildObserver();
			const callback = jest.fn();
			observer.onThresholdReached(2, callback);
			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: 'asdasd',
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
			setTimeout(() => {
				expect(callback).not.toBeCalled();
				done();
			}, 1);
		});
	});

	describe('onThresholdLeft', () => {
		it('callback if threshold is left', async (done) => {
			const { observer, emitter } = buildObserver([
				'fakeUser',
				'anotherFakeUser',
			]);
			observer.onThresholdLeft(2, (changeObject) => {
				done();
			});
			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				}
			);
		});

		it("not called count doesn't match", async (done) => {
			const { observer, emitter } = buildObserver(['fakeUser', 'fakeUser2']);
			const callback = jest.fn();
			observer.onThresholdLeft(0, callback);
			await observer.start();
			setTimeout(() => {
				expect(callback).not.toBeCalled();
				done();
			}, 1);
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: 'OTHER_CHANNEL',
				}
			);
		});

		it('should only callback once', async () => {
			const { observer, emitter } = buildObserver([
				'fakeUser',
				'fakeUser2',
				'fakeUser3',
			]);
			const callback = jest.fn();
			observer.onceThresholdLeft(2, callback);
			await observer.start();
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: 'FROM_CHANNEL_ID',
				}
			);
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser2',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser2',
					channelID: 'FROM_CHANNEL_ID',
				}
			);
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser3',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser3',
					channelID: 'FROM_CHANNEL_ID',
				}
			);
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe('onNothingChanged', () => {
		it('callback if nothing changed', async (done) => {
			const { observer, emitter } = buildObserver(['fakeUser']);
			await observer.start();
			observer.onNothingChanged(() => {
				done();
			});
			emitter.emit(
				'voiceStateUpdate',
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				},
				{
					id: 'fakeUser',
					channelID: fakeChannelId,
				}
			);
		});
	});
});
